package com.shopify.checkoutkit

import android.webkit.JavascriptInterface
import com.shopify.checkoutkit.ShopifyCheckoutKit.log
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject

/**
 * Handles the Embedded Checkout Protocol (ECP) JS bridge.
 *
 * Registered on the WebView as [INTERFACE_NAME] so checkout can call
 * `window.EmbeddedCheckoutProtocolConsumer.postMessage(jsonRpcString)`.
 * Responses are sent back via `window.EmbeddedCheckoutProtocol.postMessage(responseString)`.
 */
internal class EmbeddedCheckoutProtocol(
    private val view: CheckoutWebView,
    @Volatile private var client: CheckoutCommunicationClient? = null,
) {
    private val decoder = Json { ignoreUnknownKeys = true }
    private val defaultClient: CheckoutProtocol.Client = defaultDelegationClient()
    private val defaultClientBindings: Map<String, DefaultClientBinding> = mapOf(
        CheckoutProtocol.windowOpen.method to DefaultClientBinding(
            client = defaultClient,
            policy = DefaultClientPolicy.RunIfUnhandled,
        ),
        CheckoutProtocol.error.method to DefaultClientBinding(
            client = defaultClient,
            policy = DefaultClientPolicy.AlwaysRunAfterMerchant,
        ),
        CheckoutProtocol.complete.method to DefaultClientBinding(
            client = defaultClient,
            policy = DefaultClientPolicy.AlwaysRunAfterMerchant,
        ),
    )
    private val composedClient: CheckoutCommunicationClient
        get() = ComposedCheckoutCommunicationClient(
            merchant = client,
            defaults = defaultClientBindings,
        )

    internal fun setClient(client: CheckoutCommunicationClient?) {
        this.client = client
    }

    @JavascriptInterface
    fun postMessage(message: String) {
        try {
            val request = decoder.decodeFromString<EcpRequest>(message)
            log.d(LOG_TAG, "Received bridge message: method=${request.method} id=${request.id}")
            when {
                request.method == METHOD_READY -> handleReady(request)
                // Respond with explicit "not supported" so web-side promises don't hang
                request.method in UNSUPPORTED_METHODS ->
                    sendError(request.id, CODE_METHOD_NOT_SUPPORTED, "Method not supported by this SDK")
                // ep.cart.* is out of scope for the checkout bridge
                request.method.startsWith("ep.") ->
                    log.d(LOG_TAG, "Ignoring out-of-scope ep method: ${request.method}.")
                request.method == CheckoutProtocol.windowOpen.method -> handleWindowOpenRequest(message)
                request.method == CheckoutProtocol.start.method -> handleStart(message)
                request.method == CheckoutProtocol.complete.method -> handleComplete(message)
                else -> handleClientMessage(request.method, message)
            }
        } catch (e: SerializationException) {
            log.d(LOG_TAG, "Failed to decode ECP message: $e  raw=$message")
            sendError(null, CODE_PARSE_ERROR, "Parse error")
        }
    }

    private fun handleReady(request: EcpRequest) {
        val checkoutAcceptedDelegations = checkoutAcceptedDelegations(request.params)
        val negotiatedDelegations = checkoutAcceptedDelegations.filter { it in KIT_SUPPORTED_DELEGATIONS }
        log.d(
            LOG_TAG,
            "Handling $METHOD_READY, " +
                "isPreload=${view.isPreloadRequest} " +
                "checkoutAcceptedDelegations=$checkoutAcceptedDelegations " +
                "checkoutKitSupportedDelegations=$KIT_SUPPORTED_DELEGATIONS " +
                "negotiatedDelegations=$negotiatedDelegations"
        )
        sendResult(request.id, ucpReadyResult(negotiatedDelegations))
    }

    private fun checkoutAcceptedDelegations(params: JsonElement?): List<String> = when (params) {
        null -> emptyList()
        !is JsonObject -> throw SerializationException("$METHOD_READY params must be an object")
        else -> params["delegate"]?.let(::delegationStrings) ?: emptyList()
    }

    private fun delegationStrings(delegate: JsonElement): List<String> {
        val delegateArray = delegate as? JsonArray ?: throw SerializationException("$METHOD_READY delegate must be an array")
        return delegateArray.mapNotNull(::delegationStringOrNull)
    }

    private fun delegationStringOrNull(delegate: JsonElement): String? =
        (delegate as? JsonPrimitive)?.contentOrNull

    private fun ucpReadyResult(negotiatedDelegations: List<String>): String =
        decoder.encodeToString(
            JsonObject.serializer(),
            buildJsonObject {
                putJsonObject("ucp") {
                    put("version", CheckoutProtocol.SPEC_VERSION)
                    put("status", "success")
                }
                if (negotiatedDelegations.isNotEmpty()) {
                    putJsonArray("delegate") { negotiatedDelegations.forEach { add(it) } }
                }
            }
        )

    private fun handleStart(message: String) {
        log.d(LOG_TAG, "Handling ${CheckoutProtocol.start.method}: hiding progress bar and bubbling up.")
        onMainThread {
            view.getListener().onCheckoutViewLoadComplete()
            composedClient.process(message)
        }
    }

    private fun handleComplete(message: String) {
        log.d(LOG_TAG, "Handling ${CheckoutProtocol.complete.method}: bubbling up.")
        onMainThread {
            composedClient.process(message)
        }
    }

    /**
     * Handle `ec.window.open_request`.
     *
     * Tries the merchant's [client] first — if they registered a handler via
     * `.on(CheckoutProtocol.windowOpen) { ... }`, their response wins. Otherwise
     * falls back to the kit-owned [defaultClient], which launches the URL via
     * `Intent.ACTION_VIEW` (see [defaultDelegationClient]).
     */
    private fun handleWindowOpenRequest(message: String) {
        log.d(LOG_TAG, "Handling ${CheckoutProtocol.windowOpen.method}")
        onMainThread {
            composedClient.process(message)?.let { sendRaw(it) }
        }
    }

    /**
     * Dispatch a message through the consumer client. `ec.error` also runs through the
     * kit-owned [defaultClient] regardless of the consumer response so unrecoverable
     * session errors always close checkout while still reaching `CheckoutProtocol.error`.
     */
    private fun handleClientMessage(method: String, message: String) {
        log.d(LOG_TAG, "Delegating $method to client.")
        onMainThread {
            val response = composedClient.process(message)
            log.d(LOG_TAG, "  client response: $response")
            response?.let { sendRaw(it) }
        }
    }

    private fun sendResult(id: JsonElement?, result: String) {
        sendRaw("""{"jsonrpc":"2.0","id":${id ?: "null"},"result":$result}""")
    }

    private fun sendError(id: JsonElement?, code: Int, message: String) {
        sendRaw("""{"jsonrpc":"2.0","id":${id ?: "null"},"error":{"code":$code,"message":"$message"}}""")
    }

    private fun sendRaw(responseJson: String) {
        log.d(LOG_TAG, "Sending bridge response: $responseJson")
        val escaped = responseJson
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
        val script = """
            |if (window.$ECP_RESPONSE_GLOBAL && window.$ECP_RESPONSE_GLOBAL.postMessage) {
            |    window.$ECP_RESPONSE_GLOBAL.postMessage(JSON.parse('$escaped'));
            |}
        """.trimMargin()
        onMainThread {
            view.evaluateJavascript(script, null)
        }
    }

    /**
     * Kit-owned client that handles delegations and kit-mandated notifications,
     * mirroring Swift's `defaultsClient`. Currently:
     *   - [CheckoutProtocol.windowOpen] - launches the URI via `Intent.ACTION_VIEW`, or
     *     returns [WindowOpenResult.Rejected] with `window_open_rejected_error` semantics.
     *   - [CheckoutProtocol.error] - when any message carries `severity: "unrecoverable"`,
     *     dismiss the kit via the listener. Per UCP spec, `unrecoverable` means no valid
     *     resource exists to act on, so consumers don't have to wire dismissal in every
     *     error handler.
     *   - [CheckoutProtocol.complete] - evicts any cached preload state.
     */
    private fun defaultDelegationClient(): CheckoutProtocol.Client =
        CheckoutProtocol.Client()
            .on(CheckoutProtocol.complete) {
                CheckoutWebView.invalidate()
            }
            .on(CheckoutProtocol.windowOpen) { request ->
                when (val result = ExternalUriLauncher.launch(view.context, request.url)) {
                    is ExternalUriLauncher.Result.Launched -> WindowOpenResult.Success
                    is ExternalUriLauncher.Result.Rejected -> {
                        log.d(LOG_TAG, "window.open rejected for ${request.url.redactedForLogging()}: ${result.reason}")
                        WindowOpenResult.Rejected(reason = result.reason)
                    }
                }
            }
            .on(CheckoutProtocol.error) { payload ->
                if (payload.messages.none { it.severity == Severity.Unrecoverable }) return@on
                log.d(LOG_TAG, "ec.error unrecoverable; dismissing checkout via event processor")
                CheckoutWebView.invalidate()
                view.getListener().onCheckoutViewFailedWithError(
                    ClientException(
                        errorDescription = "Embedded checkout reported unrecoverable error.",
                    ),
                )
            }

    companion object {
        private const val LOG_TAG = BaseWebView.ECP_LOG_TAG

        /** Name under which this handler is registered as a JS interface on the WebView. */
        internal const val INTERFACE_NAME = "EmbeddedCheckoutProtocolConsumer"

        /** Global JS object the checkout uses to receive responses. */
        private const val ECP_RESPONSE_GLOBAL = "EmbeddedCheckoutProtocol"

        internal const val METHOD_READY = "ec.ready"

        // Delegations this SDK supports. Echoed back in the ec.ready response as the
        // intersection of checkout-accepted ∩ kit-supported. Must align with the
        // `ec_delegate` URL param emitted from [UriExtensions.appendEcpParams].
        private val KIT_SUPPORTED_DELEGATIONS = setOf("window.open")

        // Requests the SDK explicitly does not support — send a protocol-level error so the
        // web-side promise resolves rather than hanging indefinitely.
        private val UNSUPPORTED_METHODS = setOf(
            "ec.auth",
            "ec.payment.instruments_change_request",
            "ec.payment.credential_request",
            "ec.fulfillment.address_change_request",
        )

        private const val CODE_PARSE_ERROR = -32700
        private const val CODE_METHOD_NOT_SUPPORTED = -32601
    }
}

@Serializable
internal data class EcpRequest(
    val jsonrpc: String = "2.0",
    val method: String,
    val id: JsonElement? = null,
    val params: JsonElement? = null,
)

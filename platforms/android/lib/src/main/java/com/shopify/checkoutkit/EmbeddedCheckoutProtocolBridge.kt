package com.shopify.checkoutkit

import androidx.core.net.toUri
import com.shopify.checkoutkit.ShopifyCheckoutKit.log
import com.shopify.ucp.embedded.checkout.InstrumentsChangeResultUcp
import com.shopify.ucp.embedded.checkout.ReadyResult
import com.shopify.ucp.embedded.checkout.Severity
import com.shopify.ucp.embedded.checkout.UCPCheckoutResponseSchemaStatus
import com.shopify.ucp.embedded.checkout.decodeProtocolRequest
import com.shopify.ucp.embedded.checkout.jsonRpcRequestId
import com.shopify.ucp.embedded.checkout.windowOpenRejected
import com.shopify.ucp.embedded.checkout.windowOpenSuccess
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.JsonElement
import java.net.URI
import java.util.concurrent.Executor
import java.util.concurrent.Executors

private object ProtocolMessageExecutor {
    // WebMessageListener invokes callbacks on the UI thread; keep protocol parsing off it
    // to prevent potentially freezing the application UI with an "app not responding" (ANR) error.
    val executor: Executor = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "ShopifyCheckoutKit-ECP").apply {
            isDaemon = true
        }
    }
}

internal const val ECP_LOG_TAG = "ECP"

/**
 * Connects the checkout WebView to an Embedded Checkout Protocol (ECP) client.
 *
 * Messages arrive through [webMessageTransport] and responses are sent back via
 * `window.EmbeddedCheckoutProtocol.postMessage(responseString)`.
 */
internal class EmbeddedCheckoutProtocolBridge(
    private val view: CheckoutWebView,
    private val webMessageTransport: WebMessageTransport,
    @Volatile private var client: CheckoutProtocol.Client? = null,
    private val protocolMessageExecutor: Executor = ProtocolMessageExecutor.executor,
) {
    private var isTransportAttached = false
    private val defaultClient: CheckoutProtocol.Client = defaultDelegationClient()
    private val defaultClientBindings: Map<String, DefaultClientBinding> = mapOf(
        CheckoutProtocol.ready.method to DefaultClientBinding(
            client = defaultClient,
            policy = DefaultClientPolicy.KitOwned,
        ),
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
    private val composedClient: ComposedCheckoutProtocolClient
        get() = ComposedCheckoutProtocolClient(
            merchant = client,
            defaults = defaultClientBindings,
        )

    internal fun attach() {
        if (isTransportAttached) return

        log.d(LOG_TAG, "Attaching ECP message transport.")
        val attached = webMessageTransport.attach(
            webView = view,
            jsObjectName = INTERFACE_NAME,
            allowedOriginRules = ALLOWED_MESSAGE_ORIGIN_RULES,
        ) { message, isMainFrame ->
            receiveWebMessage(message, isMainFrame)
        }
        if (!attached) throw UnsupportedWebViewException()
        isTransportAttached = true
    }

    internal fun detach() {
        if (!isTransportAttached) return

        webMessageTransport.detach(view, INTERFACE_NAME)
        isTransportAttached = false
    }

    internal fun setClient(client: CheckoutProtocol.Client?) {
        this.client = client
    }

    private fun receiveWebMessage(message: String, isMainFrame: Boolean) {
        if (!isMainFrame) {
            log.d(LOG_TAG, "Ignoring ECP WebMessage from a child frame.")
            return
        }

        receiveMessage(message)
    }

    internal fun receiveMessage(message: String) {
        protocolMessageExecutor.execute {
            processMessage(message)
        }
    }

    private fun processMessage(message: String) {
        try {
            val request = decodeProtocolRequest(message)
            val method = CheckoutProtocol.supportedProtocolMethod(request)
            val requestId = jsonRpcRequestId(request.id)
            log.d(LOG_TAG, "Received bridge message: method=${request.method} id=${request.id}")
            when (method) {
                CheckoutProtocol.ready.method -> requestId?.let { handleClientMessage(method, message) }
                CheckoutProtocol.windowOpen.method -> requestId?.let { handleWindowOpenRequest(message) }
                CheckoutProtocol.start.method -> handleStart(message)
                CheckoutProtocol.complete.method -> handleComplete(message)
                null -> {
                    log.d(LOG_TAG, "Ignoring unsupported ECP method: ${request.method}.")
                    if (requestId != null) {
                        sendError(requestId, CODE_METHOD_NOT_FOUND, "Method not found")
                    }
                }
                else -> handleClientMessage(method, message)
            }
        } catch (e: SerializationException) {
            log.d(LOG_TAG, "Failed to decode ECP message: $e  raw=$message")
            sendError(null, CODE_PARSE_ERROR, "Parse error")
        }
    }

    private fun handleStart(message: String) {
        log.d(LOG_TAG, "Handling ${CheckoutProtocol.start.method}: hiding progress bar and bubbling up.")
        onMainThread {
            view.getListener().onCheckoutViewLoadComplete()
        }
        composedClient.process(message)
    }

    private fun handleComplete(message: String) {
        log.d(LOG_TAG, "Handling ${CheckoutProtocol.complete.method}: bubbling up.")
        composedClient.process(message)
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
        composedClient.process(message)?.let { sendRaw(it) }
    }

    /**
     * Dispatch a supported protocol message through the consumer client. `ec.error` also
     * runs through the kit-owned [defaultClient] regardless of the consumer response so
     * unrecoverable session errors always close checkout while still reaching
     * `CheckoutProtocol.error`.
     */
    private fun handleClientMessage(method: String, message: String) {
        log.d(LOG_TAG, "Delegating $method to client.")
        val response = composedClient.process(message)
        log.d(LOG_TAG, "  client response: $response")
        response?.let { sendRaw(it) }
    }

    private fun sendError(id: JsonElement?, code: Int, message: String) {
        sendRaw("""{"jsonrpc":"2.0","id":${id ?: "null"},"error":{"code":$code,"message":"$message"}}""")
    }

    private fun sendRaw(responseJson: String) {
        log.d(LOG_TAG, "Sending bridge response: $responseJson")
        webMessageTransport.send(view, ECP_RESPONSE_GLOBAL, responseJson)
    }

    /**
     * Kit-owned client that handles delegations and kit-mandated notifications,
     * mirroring Swift's `defaultsClient`. Currently:
     *   - [CheckoutProtocol.windowOpen] - launches the URI via `Intent.ACTION_VIEW`, or
     *     returns [windowOpenRejected] with `window_open_rejected_error` semantics.
     *   - [CheckoutProtocol.error] - when any message carries `severity: "unrecoverable"`,
     *     dismiss the kit via the listener. Per UCP spec, `unrecoverable` means no valid
     *     resource exists to act on, so consumers don't have to wire dismissal in every
     *     error handler.
     *   - [CheckoutProtocol.complete] - evicts any cached preload state.
     */
    private fun defaultDelegationClient(): CheckoutProtocol.Client =
        CheckoutProtocol.Client()
            .on(CheckoutProtocol.ready) { request ->
                log.d(
                    LOG_TAG,
                    "${CheckoutProtocol.ready.method} event received: accepted delegations=${request.delegate}",
                )
                ReadyResult(
                    ucp = InstrumentsChangeResultUcp(
                        status = UCPCheckoutResponseSchemaStatus.Success,
                        version = CheckoutProtocol.SPEC_VERSION,
                    ),
                )
            }
            .on(CheckoutProtocol.complete) {
                CheckoutWebView.invalidate()
            }
            .on(CheckoutProtocol.windowOpen) { request ->
                val url = request.url
                if (url.isBlank() || runCatching { URI(url) }.isFailure) {
                    log.d(LOG_TAG, "window.open rejected: malformed URL ${url.redactedUrlForLogging()}")
                    return@on windowOpenRejected(reason = "malformed URL")
                }
                when (val result = ExternalUriLauncher.launch(view.context, url.toUri())) {
                    is ExternalUriLauncher.Result.Launched -> windowOpenSuccess()
                    is ExternalUriLauncher.Result.Rejected -> {
                        log.d(
                            LOG_TAG,
                            "window.open rejected for ${url.redactedUrlForLogging()}: ${result.reason}"
                        )
                        windowOpenRejected(reason = result.reason)
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
        private const val LOG_TAG = ECP_LOG_TAG

        /** Name of the JavaScript object registered to receive messages from checkout. */
        internal const val INTERFACE_NAME = "EmbeddedCheckoutProtocolConsumer"

        /** Global JS object the checkout uses to receive responses. */
        private const val ECP_RESPONSE_GLOBAL = "EmbeddedCheckoutProtocol"

        private val ALLOWED_MESSAGE_ORIGIN_RULES = setOf("*")

        private const val CODE_PARSE_ERROR = -32700
        private const val CODE_METHOD_NOT_FOUND = -32601
    }
}

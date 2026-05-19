/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
package com.shopify.checkoutkit

import android.content.Context
import android.webkit.JavascriptInterface
import com.shopify.checkoutkit.ShopifyCheckoutKit.log
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
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
    private val defaultClient: CheckoutProtocol.Client = defaultDelegationClient(view.context)

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
                request.method == METHOD_WINDOW_OPEN_REQUEST -> handleWindowOpenRequest(message)
                request.method == METHOD_START -> handleStart(message)
                request.method == METHOD_COMPLETE -> handleComplete(message)
                else -> handleClientMessage(request.method, message)
            }
        } catch (e: Exception) {
            log.d(LOG_TAG, "Failed to decode ECP message: $e  raw=$message")
            sendError(null, CODE_PARSE_ERROR, "Parse error")
        }
    }

    private fun handleReady(request: EcpRequest) {
        val checkoutAcceptedDelegations = request.params?.jsonObject?.get("delegate")?.jsonArray
            ?.mapNotNull { it.jsonPrimitive.contentOrNull }
            ?: emptyList()
        val negotiatedDelegations = checkoutAcceptedDelegations.filter { it in KIT_SUPPORTED_DELEGATIONS }
        log.d(
            LOG_TAG,
            "Handling $METHOD_READY, " +
                "checkoutAcceptedDelegations=$checkoutAcceptedDelegations " +
                "checkoutKitSupportedDelegations=$KIT_SUPPORTED_DELEGATIONS " +
                "negotiatedDelegations=$negotiatedDelegations"
        )
        sendResult(request.id, ucpReadyResult(negotiatedDelegations))
    }

    private fun ucpReadyResult(negotiatedDelegations: List<String>): String =
        decoder.encodeToString(
            JsonObject.serializer(),
            buildJsonObject {
                putJsonObject("ucp") {
                    put("version", CheckoutProtocol.specVersion)
                    put("status", "success")
                }
                if (negotiatedDelegations.isNotEmpty()) {
                    putJsonArray("delegate") { negotiatedDelegations.forEach { add(it) } }
                }
            }
        )

    private fun handleStart(message: String) {
        log.d(LOG_TAG, "Handling $METHOD_START: hiding progress bar and bubbling up.")
        onMainThread {
            view.getListener().onCheckoutViewLoadComplete()
            client?.process(message)
        }
    }

    private fun handleComplete(message: String) {
        log.d(LOG_TAG, "Handling $METHOD_COMPLETE: bubbling up.")
        onMainThread {
            client?.process(message)
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
        log.d(LOG_TAG, "Handling $METHOD_WINDOW_OPEN_REQUEST")
        onMainThread {
            val merchantResponse = client?.process(message)
            if (merchantResponse != null) {
                sendRaw(merchantResponse)
            } else {
                defaultClient.process(message)?.let { sendRaw(it) }
            }
        }
    }

    private fun handleClientMessage(method: String, message: String) {
        log.d(LOG_TAG, "Delegating $method to client.")
        onMainThread {
            val response = client?.process(message)
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

    companion object {
        private val LOG_TAG = BaseWebView.ECP_LOG_TAG

        /** Name under which this handler is registered as a JS interface on the WebView. */
        internal const val INTERFACE_NAME = "EmbeddedCheckoutProtocolConsumer"

        /** Global JS object the checkout uses to receive responses. */
        private const val ECP_RESPONSE_GLOBAL = "EmbeddedCheckoutProtocol"

        internal const val METHOD_READY = "ec.ready"
        internal const val METHOD_START = "ec.start"
        internal const val METHOD_COMPLETE = "ec.complete"

        private const val METHOD_WINDOW_OPEN_REQUEST = "ec.window.open_request"

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

        /**
         * The kit's default [CheckoutProtocol.windowOpen] handler.
         *
         * Mirrors Swift's `defaultsClient`: launches the URI via `Intent.ACTION_VIEW`
         * if any activity resolves it, otherwise returns [WindowOpenResult.Rejected]
         * with `window_open_rejected_error` semantics.
         */
        internal fun defaultDelegationClient(context: Context): CheckoutProtocol.Client =
            CheckoutProtocol.Client().on(CheckoutProtocol.windowOpen) { request ->
                when (val result = ExternalUriLauncher.launch(context, request.url)) {
                    is ExternalUriLauncher.Result.Launched -> WindowOpenResult.Success
                    is ExternalUriLauncher.Result.Rejected -> {
                        log.d(LOG_TAG, "window.open rejected for ${request.url}: ${result.reason}")
                        WindowOpenResult.Rejected(reason = result.reason)
                    }
                }
            }
    }
}

@Serializable
internal data class EcpRequest(
    val jsonrpc: String = "2.0",
    val method: String,
    val id: JsonElement? = null,
    val params: JsonElement? = null,
)

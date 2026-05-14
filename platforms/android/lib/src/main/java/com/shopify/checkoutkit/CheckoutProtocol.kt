/*
 * MIT License
 *
 * Copyright 2023-present, Shopify Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
package com.shopify.checkoutkit

import android.net.Uri
import com.shopify.checkoutkit.ShopifyCheckoutKit.log
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject

/**
 * Entry point for the typed Embedded Checkout Protocol (ECP) client.
 *
 * Provides static [NotificationDescriptor] instances for every EC notification method,
 * plus a fluent [Client] builder that implements [CheckoutCommunicationClient].
 *
 * Example usage:
 * ```kotlin
 * val client = CheckoutProtocol.Client()
 *     .on(CheckoutProtocol.start)  { checkout -> showProgressUI(checkout) }
 *     .on(CheckoutProtocol.complete) { checkout -> navigateToConfirmation(checkout) }
 *     .onOpenExternalUrl { uri -> startActivity(Intent(Intent.ACTION_VIEW, uri)); true }
 *
 * ShopifyCheckoutKit.present(url, activity, eventProcessor, client)
 * ```
 */
public object CheckoutProtocol {

    public const val specVersion: String = "2026-04-08"

    // Notifications — checkout carries the full current state
    public val start: NotificationDescriptor<Checkout> = checkoutDescriptor("ec.start")
    public val complete: NotificationDescriptor<Checkout> = checkoutDescriptor("ec.complete")
    public val messagesChange: NotificationDescriptor<Checkout> = checkoutDescriptor("ec.messages.change")
    public val lineItemsChange: NotificationDescriptor<Checkout> = checkoutDescriptor("ec.line_items.change")
    internal val buyerChange: NotificationDescriptor<Checkout> = checkoutDescriptor("ec.buyer.change")
    public val totalsChange: NotificationDescriptor<Checkout> = checkoutDescriptor("ec.totals.change")
    public val error: NotificationDescriptor<CheckoutError> = NotificationDescriptor(
        method = "ec.error",
        decode = { params ->
            params?.jsonObject?.get("messages")?.let {
                try {
                    json.decodeFromJsonElement<List<CheckoutError>>(it).firstOrNull()
                } catch (e: Exception) {
                    log.d(BaseWebView.ECP_LOG_TAG, "Failed to decode ec.error messages: $e  raw=$it")
                    null
                }
            }
        }
    )

    private fun checkoutDescriptor(method: String): NotificationDescriptor<Checkout> =
        NotificationDescriptor(
            method = method,
            decode = { params ->
                params?.jsonObject?.get("checkout")?.let {
                    try {
                        json.decodeFromJsonElement<Checkout>(it)
                    } catch (e: Exception) {
                        log.d(BaseWebView.ECP_LOG_TAG, "Failed to decode $method checkout payload: $e  raw=$it")
                        null
                    }
                }
            }
        )

    internal val json: Json = Json { ignoreUnknownKeys = true }

    /**
     * A typed, fluent implementation of [CheckoutCommunicationClient].
     *
     * Each [on] call returns a new [Client] instance (value semantics),
     * making it safe to share a base configuration across multiple presents.
     */
    public class Client private constructor(
        private val handlers: Map<String, Handler>,
        private val urlHandler: ((Uri) -> Boolean)?,
    ) : CheckoutCommunicationClient {

        public constructor() : this(emptyMap(), null)

        /**
         * Register a handler for an EC notification descriptor.
         *
         * The handler is invoked on the **main thread** whenever the checkout page
         * sends the corresponding notification. Returning from the handler sends
         * no response to the page (notifications are fire-and-forget).
         */
        public fun <P : Any> on(
            descriptor: NotificationDescriptor<P>,
            handler: (P) -> Unit,
        ): Client {
            @Suppress("UNCHECKED_CAST")
            val entry = Handler(
                decode = descriptor.decode,
                invoke = { payload -> (payload as? P)?.let { handler(it) } },
            )
            return Client(handlers + (descriptor.method to entry), urlHandler)
        }

        /**
         * Register a handler for [ec.window.open_request].
         *
         * Called on the **main thread** (the SDK uses a latch to dispatch from the
         * JavascriptInterface thread). Return `true` if the URL was opened externally,
         * `false` to let the SDK report an error back to the page.
         */
        public fun onOpenExternalUrl(handler: (Uri) -> Boolean): Client =
            Client(handlers, handler)

        /** Called by [EmbeddedCheckoutProtocol] for every delegated EC message. */
        override fun process(message: String): String? {
            try {
                val request = json.decodeFromString<EcpRequest>(message)
                val handler = handlers[request.method]
                if (handler == null) {
                    log.d(LOG_TAG, "No handler registered for method=${request.method}")
                } else {
                    val payload = handler.decode(request.params)
                    log.d(LOG_TAG, "Decoded payload for method=${request.method}: ${payload ?: "null, skipping"}")
                    payload?.let { onMainThread { handler.invoke(it) } }
                }
            } catch (e: Exception) {
                log.d(LOG_TAG, "Error processing ECP message in typed client: $e")
            }
            return null
        }

        /** Called by [EmbeddedCheckoutProtocol] on the main thread for [ec.window.open_request]. */
        override fun openExternalUrl(url: Uri): Boolean = urlHandler?.invoke(url) ?: false

        private companion object {
            private const val LOG_TAG = BaseWebView.ECP_LOG_TAG
        }
    }

    private class Handler(
        val decode: (JsonElement?) -> Any?,
        val invoke: (Any) -> Unit,
    )
}

/**
 * Describes a typed EC notification handler binding.
 *
 * Create instances via [CheckoutProtocol] static properties; do not instantiate directly.
 */
public class NotificationDescriptor<P : Any> internal constructor(
    public val method: String,
    internal val decode: (JsonElement?) -> P?,
)

/** Payload delivered with the [CheckoutProtocol.error] notification. */
@Serializable
public data class CheckoutError internal constructor(
    public val code: String? = null,
    public val content: String? = null,
    public val severity: String? = null,
)

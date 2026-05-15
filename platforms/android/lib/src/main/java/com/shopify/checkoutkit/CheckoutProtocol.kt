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
import android.os.Looper
import androidx.core.net.toUri
import com.shopify.checkoutkit.ShopifyCheckoutKit.log
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import java.util.concurrent.CountDownLatch

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

    // Delegations — kit-internal. Consumers cannot override; [EmbeddedCheckoutProtocol]
    // wires the kit's default handler via [defaultDelegationClient].
    internal val windowOpen: DelegationDescriptor<WindowOpenRequest, WindowOpenResult> = DelegationDescriptor(
        method = "ec.window.open_request",
        decode = { params ->
            params?.jsonObject?.get("url")?.jsonPrimitive?.contentOrNull
                ?.takeIf { it.isNotBlank() }
                ?.let { runCatching { it.toUri() }.getOrNull() }
                ?.let(::WindowOpenRequest)
        },
        encode = { result -> encodeWindowOpenResult(result) },
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

    private fun encodeWindowOpenResult(result: WindowOpenResult): JsonObject = when (result) {
        is WindowOpenResult.Success ->
            json.encodeToJsonElement(
                WindowOpenSuccessDto(UcpEnvelope(specVersion, "success"))
            ).jsonObject
        is WindowOpenResult.Rejected ->
            json.encodeToJsonElement(
                WindowOpenErrorDto(
                    ucp = UcpEnvelope(specVersion, "error"),
                    messages = listOf(
                        UcpMessage(
                            type = "error",
                            code = "window_open_rejected_error",
                            content = result.reason ?: "Window open rejected",
                            severity = "unrecoverable",
                        )
                    ),
                )
            ).jsonObject
    }

    internal val json: Json = Json { ignoreUnknownKeys = true }

    /**
     * A typed, fluent implementation of [CheckoutCommunicationClient].
     *
     * Each [on] call returns a new [Client] instance (value semantics),
     * making it safe to share a base configuration across multiple presents.
     */
    public class Client private constructor(
        private val handlers: Map<String, Handler>,
        private val delegations: Map<String, Delegation>,
    ) : CheckoutCommunicationClient {

        public constructor() : this(emptyMap(), emptyMap())

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
            return Client(handlers + (descriptor.method to entry), delegations)
        }

        /**
         * Register a handler for an EC delegation descriptor.
         *
         * Internal: used by the kit to wire its own default delegation handlers
         * (see [EmbeddedCheckoutProtocol.defaultDelegationClient]). Not exposed to
         * consumers — delegations like `ec.window.open_request` are handled internally.
         */
        internal fun <P : Any, R : Any> on(
            descriptor: DelegationDescriptor<P, R>,
            handler: (P) -> R,
        ): Client = Client(handlers, delegations + (descriptor.method to Delegation.Typed(descriptor, handler)))

        /** Called by [EmbeddedCheckoutProtocol] for every delegated EC message. */
        override fun process(message: String): String? {
            return try {
                val request = json.decodeFromString<EcpRequest>(message)
                delegations[request.method]?.let { return it.dispatch(request) }
                dispatchNotification(request)
                null
            } catch (e: Exception) {
                log.d(LOG_TAG, "Error processing ECP message in typed client: $e")
                null
            }
        }

        /**
         * Direct, typed invocation of a registered delegation handler.
         *
         * Used by the kit to dispatch synthesized delegations (e.g. direct anchor-tag
         * clicks intercepted by the WebView) without round-tripping through JSON-RPC.
         * Returns `null` if no handler is registered for [descriptor].
         */
        @Suppress("UNCHECKED_CAST")
        internal fun <P : Any, R : Any> invoke(descriptor: DelegationDescriptor<P, R>, payload: P): R? =
            delegations[descriptor.method]?.let { invokeOnMainThread { it.invokeRaw(payload) } } as? R

        private fun dispatchNotification(request: EcpRequest) {
            val handler = handlers[request.method]
            if (handler == null) {
                log.d(LOG_TAG, "No handler registered for method=${request.method}")
                return
            }
            val payload = handler.decode(request.params)
            log.d(LOG_TAG, "Decoded payload for method=${request.method}: ${payload ?: "null, skipping"}")
            payload?.let { onMainThread { handler.invoke(it) } }
        }
    }

    private class Handler(
        val decode: (JsonElement?) -> Any?,
        val invoke: (Any) -> Unit,
    )

    private sealed class Delegation {
        abstract fun dispatch(request: EcpRequest): String
        abstract fun invokeRaw(payload: Any): Any?

        class Typed<P : Any, R : Any>(
            private val descriptor: DelegationDescriptor<P, R>,
            private val handler: (P) -> R,
        ) : Delegation() {
            override fun dispatch(request: EcpRequest): String {
                val payload = runCatching { descriptor.decode(request.params) }.getOrElse { e ->
                    log.d(LOG_TAG, "Decode failed for ${request.method}: $e")
                    null
                } ?: return jsonRpcError(
                    request.id,
                    CODE_INVALID_PARAMS,
                    "Invalid params for ${request.method}",
                )
                val result = invokeOnMainThread { handler(payload) }
                return jsonRpcResult(request.id, descriptor.encode(result))
            }

            @Suppress("UNCHECKED_CAST")
            override fun invokeRaw(payload: Any): Any? = handler(payload as P)
        }
    }

    private const val LOG_TAG = BaseWebView.ECP_LOG_TAG
    private const val CODE_INVALID_PARAMS = -32602

    private fun jsonRpcResult(id: JsonElement?, result: JsonElement): String =
        json.encodeToString(
            JsonObject.serializer(),
            buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", id ?: JsonNull)
                put("result", result)
            }
        )

    private fun jsonRpcError(id: JsonElement?, code: Int, message: String): String =
        json.encodeToString(
            JsonObject.serializer(),
            buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", id ?: JsonNull)
                putJsonObject("error") {
                    put("code", code)
                    put("message", message)
                }
            }
        )

    private fun <R> invokeOnMainThread(block: () -> R): R {
        if (Looper.myLooper() == Looper.getMainLooper()) return block()
        var result: Result<R>? = null
        val latch = CountDownLatch(1)
        onMainThread {
            result = runCatching { block() }
            latch.countDown()
        }
        latch.await()
        return result!!.getOrThrow()
    }
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

/**
 * Describes a typed EC delegation handler binding.
 *
 * Delegations are request-response: the kit's default handler returns a typed result
 * that gets encoded into a JSON-RPC response back to the checkout page.
 * Internal — delegations are not consumer-overridable.
 */
internal class DelegationDescriptor<P : Any, R : Any>(
    val method: String,
    val decode: (JsonElement?) -> P?,
    val encode: (R) -> JsonElement,
)

/** Payload delivered with the [CheckoutProtocol.windowOpen] delegation. */
internal data class WindowOpenRequest(val url: Uri)

/**
 * Outcome the kit's default [CheckoutProtocol.windowOpen] handler returns to the checkout page.
 *
 * [Success] indicates the URL was opened externally.
 * [Rejected] indicates no activity resolved the URL — the page receives a UCP
 * `window_open_rejected_error` envelope and may surface a fallback message to the buyer.
 */
internal sealed class WindowOpenResult {
    object Success : WindowOpenResult()
    data class Rejected(val reason: String? = null) : WindowOpenResult()
}

/** Payload delivered with the [CheckoutProtocol.error] notification. */
@Serializable
public data class CheckoutError internal constructor(
    public val code: String? = null,
    public val content: String? = null,
    public val severity: String? = null,
)

// UCP wire envelopes for delegation responses. Mirror Swift's UCPSuccess / UCPError /
// WindowOpenRejectedBody (origin/swift/window.open_request: ShopifyCheckoutProtocol/Codec.swift +
// WindowOpen.swift). UcpEnvelope / UcpMessage are intentionally generic so the next delegation
// (ec.auth, ec.payment.*) can reuse them; promote out of this file once a second call site lands.

@Serializable
private data class UcpEnvelope(val version: String, val status: String)

@Serializable
private data class UcpMessage(
    val type: String,
    val code: String,
    val content: String,
    val severity: String,
)

@Serializable
private data class WindowOpenSuccessDto(val ucp: UcpEnvelope)

@Serializable
private data class WindowOpenErrorDto(
    val ucp: UcpEnvelope,
    val messages: List<UcpMessage>,
)

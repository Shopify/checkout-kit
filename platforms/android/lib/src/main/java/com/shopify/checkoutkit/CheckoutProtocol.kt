package com.shopify.checkoutkit

import android.os.Looper
import com.shopify.checkoutkit.ShopifyCheckoutKit.log
import com.shopify.ucp.embedded.checkout.Checkout
import com.shopify.ucp.embedded.checkout.EcpRequest
import com.shopify.ucp.embedded.checkout.EmbeddedCheckoutProtocol
import com.shopify.ucp.embedded.checkout.ErrorResponse
import com.shopify.ucp.embedded.checkout.NotificationDescriptor
import com.shopify.ucp.embedded.checkout.ReadyRequest
import com.shopify.ucp.embedded.checkout.ReadyResult
import com.shopify.ucp.embedded.checkout.RequestDescriptor
import com.shopify.ucp.embedded.checkout.decodeProtocolRequest
import com.shopify.ucp.embedded.checkout.encodeJsonRpcError
import com.shopify.ucp.embedded.checkout.encodeJsonRpcResult
import com.shopify.ucp.embedded.checkout.jsonRpcRequestId
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.JsonElement
import java.util.concurrent.CountDownLatch

/**
 * Consumer-facing typed Embedded Checkout Protocol API curated by Checkout Kit.
 *
 * The lower-level `embedded-checkout-protocol` artifact owns generated models and raw wire
 * method names. Checkout Kit decides which of those methods are supported for app
 * developers and exposes them through this typed namespace.
 */
public object CheckoutProtocol {
    public const val SPEC_VERSION: String = EmbeddedCheckoutProtocol.SPEC_VERSION

    public val start: NotificationDescriptor<Checkout> = EmbeddedCheckoutProtocol.start
    public val complete: NotificationDescriptor<Checkout> = EmbeddedCheckoutProtocol.complete
    public val messagesChange: NotificationDescriptor<Checkout> = EmbeddedCheckoutProtocol.messagesChange
    public val lineItemsChange: NotificationDescriptor<Checkout> = EmbeddedCheckoutProtocol.lineItemsChange
    public val totalsChange: NotificationDescriptor<Checkout> = EmbeddedCheckoutProtocol.totalsChange
    public val fulfillmentChange: NotificationDescriptor<Checkout> = EmbeddedCheckoutProtocol.fulfillmentChange
    public val error: NotificationDescriptor<ErrorResponse> = EmbeddedCheckoutProtocol.error

    public val ready: RequestDescriptor<ReadyRequest, ReadyResult> = EmbeddedCheckoutProtocol.ready

    public val windowOpen: RequestDescriptor<WindowOpenRequest, WindowOpenResult> = checkoutKitWindowOpenDescriptor

    internal val defaultDelegations: List<EmbeddedCheckoutProtocol.Delegation> = listOf(
        EmbeddedCheckoutProtocol.Delegation.windowOpen,
    )

    internal val supportedProtocolMethods: Set<String> = setOf(
        ready.method,
        start.method,
        complete.method,
        error.method,
        lineItemsChange.method,
        messagesChange.method,
        totalsChange.method,
        fulfillmentChange.method,
        windowOpen.method,
    )

    internal fun supportedProtocolMethod(message: String): String? = try {
        supportedProtocolMethod(decodeProtocolRequest(message))
    } catch (_: SerializationException) {
        null
    }

    internal fun supportedProtocolMethod(request: EcpRequest): String? =
        request.method.takeIf {
            request.jsonrpc == "2.0" &&
                request.method in supportedProtocolMethods &&
                request.hasValidJsonRpcRequestId()
        }

    private val supportedNotificationDescriptors: Set<NotificationDescriptor<*>> = setOf(
        start,
        complete,
        messagesChange,
        lineItemsChange,
        totalsChange,
        fulfillmentChange,
        error,
    )

    private val supportedRequestDescriptors: Set<RequestDescriptor<*, *>> = setOf(
        windowOpen,
        ready,
    )

    /**
     * A typed, fluent client for supported Checkout Kit protocol callbacks.
     *
     * Each [on] call returns a new [Client] instance, making it safe to share a
     * base configuration across multiple checkout presentations.
     */
    public class Client private constructor(
        private val handlers: Map<String, NotificationHandler>,
        private val delegations: Map<String, Delegation>,
    ) {
        public constructor() : this(emptyMap(), emptyMap())

        public fun <P : Any> on(
            descriptor: NotificationDescriptor<P>,
            handler: (P) -> Unit,
        ): Client {
            if (descriptor !in supportedNotificationDescriptors) return this
            val entry = NotificationHandler(
                decode = { params -> descriptor.decode(params) },
                invoke = { payload ->
                    @Suppress("UNCHECKED_CAST")
                    (payload as? P)?.let { handler(it) }
                },
            )
            return Client(handlers + (descriptor.method to entry), delegations)
        }

        public fun <P : Any, R : Any> on(
            descriptor: RequestDescriptor<P, R>,
            handler: (P) -> R,
        ): Client {
            if (descriptor !in supportedRequestDescriptors) return this
            return Client(handlers, delegations + (descriptor.method to Delegation.Typed(descriptor, handler)))
        }

        internal fun process(message: String): String? =
            decodeRequest(message)?.let { request ->
                val delegation = delegations[request.method]
                if (delegation != null) {
                    jsonRpcRequestId(request.id)?.let { delegation.dispatch(request) }
                } else {
                    dispatchNotification(request)
                    null
                }
            }

        private fun decodeRequest(message: String): EcpRequest? = try {
            decodeProtocolRequest(message)
                .takeIf { it.hasValidJsonRpcRequestId() }
        } catch (e: SerializationException) {
            log.d(LOG_TAG, "Error processing ECP message in typed client: $e")
            null
        }

        private fun dispatchNotification(request: EcpRequest) {
            val handler = handlers[request.method]
            if (handler == null) {
                log.d(LOG_TAG, "No handler registered for method=${request.method}")
                return
            }
            val payload = try {
                handler.decode(request.params)
            } catch (e: SerializationException) {
                log.d(
                    LOG_TAG,
                    "Failed to decode ${request.method} notification params: $e raw=${request.params}",
                )
                null
            }
            log.d(
                LOG_TAG,
                "Decoded payload for method=${request.method}: ${payload ?: "null, skipping"}",
            )
            payload?.let { onMainThread { handler.invoke(it) } }
        }
    }

    private class NotificationHandler(
        val decode: (JsonElement?) -> Any?,
        val invoke: (Any) -> Unit,
    )

    private sealed class Delegation {
        abstract fun dispatch(request: EcpRequest): String

        class Typed<P : Any, R : Any>(
            private val descriptor: RequestDescriptor<P, R>,
            private val handler: (P) -> R,
        ) : Delegation() {
            override fun dispatch(request: EcpRequest): String {
                val payload = try {
                    descriptor.decode(request.params)
                } catch (e: SerializationException) {
                    log.d(
                        LOG_TAG,
                        "Failed to decode ${request.method} delegation params: $e raw=${request.params}",
                    )
                    null
                } ?: return encodeJsonRpcError(
                    request.id,
                    CODE_INVALID_PARAMS,
                    "Invalid params for ${request.method}",
                )
                val result = invokeOnMainThread { handler(payload) }
                return encodeJsonRpcResult(request.id, descriptor.encode(result))
            }
        }
    }

    private const val CODE_INVALID_PARAMS: Int = -32602
    private const val LOG_TAG: String = BaseWebView.ECP_LOG_TAG

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

internal fun EcpRequest.hasValidJsonRpcRequestId(): Boolean =
    id == null || jsonRpcRequestId(id) != null

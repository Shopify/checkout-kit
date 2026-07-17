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
import com.shopify.ucp.embedded.checkout.WindowOpenRequest
import com.shopify.ucp.embedded.checkout.WindowOpenResult
import com.shopify.ucp.embedded.checkout.decodeProtocolRequest
import com.shopify.ucp.embedded.checkout.hasValidJsonRpcRequestId
import kotlinx.serialization.SerializationException
import java.util.concurrent.CountDownLatch
import com.shopify.ucp.embedded.checkout.Client as ProtocolClient

/**
 * Consumer-facing typed Embedded Checkout Protocol API curated by Checkout Kit.
 *
 * The lower-level `embedded-checkout-protocol` artifact owns generated models, raw wire
 * method names, and the generic dispatch [ProtocolClient]. Checkout Kit decides which of
 * those methods are supported for app developers and exposes them through this typed
 * namespace.
 */
public object CheckoutProtocol {
    public const val SPEC_VERSION: String = EmbeddedCheckoutProtocol.SPEC_VERSION

    public val start: NotificationDescriptor<Checkout> = EmbeddedCheckoutProtocol.start.map { it.checkout }
    public val complete: NotificationDescriptor<Checkout> = EmbeddedCheckoutProtocol.complete.map { it.checkout }
    public val messagesChange: NotificationDescriptor<Checkout> = EmbeddedCheckoutProtocol.messagesChange.map {
        it.checkout
    }
    public val lineItemsChange: NotificationDescriptor<Checkout> = EmbeddedCheckoutProtocol.lineItemsChange.map {
        it.checkout
    }
    public val totalsChange: NotificationDescriptor<Checkout> = EmbeddedCheckoutProtocol.totalsChange.map { it.checkout }
    public val fulfillmentChange: NotificationDescriptor<Checkout> = EmbeddedCheckoutProtocol.fulfillmentChange.map {
        it.checkout
    }
    public val error: NotificationDescriptor<ErrorResponse> = EmbeddedCheckoutProtocol.error.map { it.error }

    internal val ready: RequestDescriptor<ReadyRequest, ReadyResult> = EmbeddedCheckoutProtocol.ready

    public val windowOpen: RequestDescriptor<WindowOpenRequest, WindowOpenResult> = EmbeddedCheckoutProtocol.windowOpen

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
     * Wraps the generic protocol [ProtocolClient], adding Checkout Kit curation (only
     * supported descriptors are registered), main-thread delivery of consumer handlers,
     * and unconditional logging of decode failures via the kit logger.
     *
     * Each [on] call returns a new [Client] instance, making it safe to share a base
     * configuration across multiple checkout presentations.
     */
    public class Client private constructor(
        private val delegate: ProtocolClient,
    ) {
        public constructor() : this(
            ProtocolClient().onDecodeError { method, error, params ->
                log.e(LOG_TAG, "Failed to decode $method params", error)
                log.d(LOG_TAG, "Raw $method params: $params")
            },
        )

        public fun <P : Any> on(
            descriptor: NotificationDescriptor<P>,
            handler: (P) -> Unit,
        ): Client {
            if (descriptor !in supportedNotificationDescriptors) return this
            return Client(delegate.on(descriptor) { payload -> onMainThread { handler(payload) } })
        }

        public fun <P : Any, R : Any> on(
            descriptor: RequestDescriptor<P, R>,
            handler: (P) -> R,
        ): Client {
            if (descriptor !in supportedRequestDescriptors) return this
            return Client(delegate.on(descriptor) { payload -> invokeOnMainThread { handler(payload) } })
        }

        internal fun process(message: String): String? = delegate.process(message)
    }

    private const val LOG_TAG: String = ECP_LOG_TAG

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

package com.shopify.checkoutkit

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import com.shopify.ucp.embedded.checkout.Checkout as ProtocolCheckout

/** Translates supported protocol notifications for one checkout presentation. */
internal class CheckoutEventAdapter(
    private val listener: CheckoutWebViewListener,
    onDecodeError: (String) -> Unit = {},
) {
    private var active = true
    private var latestSnapshot: JsonElement? = null
    private val client = CheckoutProtocol.Client()
        .on(CheckoutProtocol.start, ::start)
        .on(CheckoutProtocol.lineItemsChange, ::update)
        .on(CheckoutProtocol.messagesChange, ::update)
        .on(CheckoutProtocol.totalsChange, ::update)
        .on(CheckoutProtocol.fulfillmentChange, ::update)
        .on(CheckoutProtocol.complete, ::complete)
        .withDecodeErrorObserver(onDecodeError)

    fun process(message: String) {
        client.process(message)
    }

    /** Called on the main thread before replacing or releasing the presentation listener. */
    fun invalidate() {
        active = false
        latestSnapshot = null
    }

    fun actionForLink(link: CheckoutLink): CheckoutLinkAction =
        if (active) listener.onCheckoutLinkClicked(link) else CheckoutLinkAction.Cancel

    private fun start(checkout: ProtocolCheckout) {
        if (!active) return
        val snapshot = Checkout.fromProtocol(checkout)
        remember(snapshot)
        listener.onCheckoutStarted(CheckoutStartEvent(snapshot))
    }

    private fun update(checkout: ProtocolCheckout) {
        if (!active) return
        val snapshot = Checkout.fromProtocol(checkout)
        val comparison = Json.encodeToJsonElement(Checkout.serializer(), snapshot)
        if (comparison == latestSnapshot) return
        latestSnapshot = comparison
        listener.onCheckoutUpdated(CheckoutUpdateEvent(snapshot))
    }

    private fun complete(checkout: ProtocolCheckout) {
        if (!active) return
        val snapshot = Checkout.fromProtocol(checkout)
        remember(snapshot)
        listener.onCheckoutCompleted(CheckoutCompleteEvent(snapshot))
    }

    private fun remember(checkout: Checkout) {
        // Keep comparison state separate from collections exposed to Kotlin and Java consumers.
        latestSnapshot = Json.encodeToJsonElement(Checkout.serializer(), checkout)
    }
}

# Android

```kotlin
import com.shopify.checkoutkit.CheckoutProtocol
import com.shopify.checkoutkit.DefaultCheckoutEventProcessor
import com.shopify.checkoutkit.ShopifyCheckoutKit
import com.shopify.checkoutkit.lifecycleevents.CheckoutCompletedEvent

val protocolClient = CheckoutProtocol.Client()
    .on(CheckoutProtocol.ready) { payload ->
        recordDelegations(payload.delegations)
    }
    .on(CheckoutProtocol.start) { checkout ->
        hideLoadingShell(checkout)
    }
    .on(CheckoutProtocol.complete) { checkout ->
        navigateToConfirmation(checkout)
    }
    .on(CheckoutProtocol.messagesChange) { checkout ->
        renderCheckoutMessages(checkout.messages)
    }
    .on(CheckoutProtocol.lineItemsChange) { checkout ->
        syncCartSummary(checkout.lineItems)
    }
    .on(CheckoutProtocol.buyerChange) { checkout ->
        syncBuyerState(checkout.buyer)
    }
    .on(CheckoutProtocol.paymentChange) { checkout ->
        syncPaymentState(checkout.payment)
    }
    .onOpenExternalUrl { uri ->
        openExternalUrl(uri)
        true
    }

val processor = object : DefaultCheckoutEventProcessor(activity) {
    override fun onCheckoutCompleted(event: CheckoutCompletedEvent) {
        // Keep only if the app still needs legacy completion handling.
    }
}

ShopifyCheckoutKit.present(
    checkoutUrl = checkoutUrl,
    context = activity,
    checkoutEventProcessor = processor,
    communicationClient = protocolClient,
)
```

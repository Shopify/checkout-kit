# Android

Use presentation builder callbacks for native/ambient presentation outcomes. Use `CheckoutProtocol.Client` for bidirectional communication with the checkout web instance.

Register only protocol handlers the app needs.

```kotlin
import android.content.Intent
import com.shopify.checkoutkit.CheckoutProtocol
import com.shopify.checkoutkit.ShopifyCheckoutKit
import com.shopify.checkoutkit.WindowOpenResult

val protocolClient = CheckoutProtocol.Client()
    .on(CheckoutProtocol.complete) { checkout ->
        // Checkout completed in the web instance.
        // Clear or refresh app cart state if needed.
    }
    .on(CheckoutProtocol.error) { error ->
        // Checkout-originated protocol error.
        // Log/report or show app-owned fallback UI if needed.
    }
    .on(CheckoutProtocol.windowOpen) { request ->
        // Registering this handler overrides Checkout Kit's smart default URL opening.
        // The app is now responsible for opening the URL or rejecting the request.
        val intent = Intent(Intent.ACTION_VIEW, request.url)
        if (intent.resolveActivity(activity.packageManager) != null) {
            activity.startActivity(intent)
            WindowOpenResult.Success
        } else {
            WindowOpenResult.Rejected("No app available to open URL")
        }
    }

ShopifyCheckoutKit.present(checkoutUrl, activity) {
    connect(protocolClient)
    onCancel {
        // Native presentation outcome: buyer dismissed the dialog.
    }
    onFail { error ->
        // Native/ambient failure: SDK, network, or presentation failure.
    }
}
```

If you do not need custom external URL behavior, do not register `CheckoutProtocol.windowOpen`; the SDK smart default will handle supported URLs.

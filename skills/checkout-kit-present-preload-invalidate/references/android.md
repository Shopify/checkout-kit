# Android

Preload/invalidate APIs may vary while the alpha line settles, so confirm the installed Android SDK exposes the exact methods before copying this sample.

```kotlin
import androidx.lifecycle.lifecycleScope
import com.shopify.checkoutkit.ShopifyCheckoutKit
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private var preloadJob: Job? = null
private var preloadedCheckoutUrl: String? = null

fun onCartStateSettled(checkoutUrl: String) {
    preloadJob?.cancel()
    preloadJob = lifecycleScope.launch {
        delay(300)
        ShopifyCheckoutKit.preload(checkoutUrl, activity)
        preloadedCheckoutUrl = checkoutUrl
    }
}

fun onCheckoutTapped(checkoutUrl: String) {
    ShopifyCheckoutKit.present(checkoutUrl, activity) {
        onFail { error ->
            renderCheckoutError(error)
        }
        onCancel {
            handleCheckoutCancel()
        }
    }
}

fun onCheckoutAffectingStateChanged(freshCheckoutUrl: String, cartOrBuyerChanged: Boolean) {
    val preloadedCheckoutIsStale = preloadedCheckoutUrl != null && preloadedCheckoutUrl != freshCheckoutUrl

    if (cartOrBuyerChanged && preloadedCheckoutIsStale) {
        ShopifyCheckoutKit.invalidate()
        preloadedCheckoutUrl = null
    }

    onCartStateSettled(freshCheckoutUrl)
}

fun onSessionBoundaryChanged() {
    ShopifyCheckoutKit.invalidate()
    preloadedCheckoutUrl = null
}
```

Treat preload as a hint. When the buyer taps checkout, call `present(checkoutUrl, activity)` with the latest checkout URL; do not wait for or require preload.

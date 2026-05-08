# Android

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
    ShopifyCheckoutKit.present(
        checkoutUrl = checkoutUrl,
        context = activity,
        checkoutEventProcessor = checkoutEventProcessor,
    )
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

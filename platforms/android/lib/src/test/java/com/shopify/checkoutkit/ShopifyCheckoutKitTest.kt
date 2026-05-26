package com.shopify.checkoutkit

import androidx.activity.ComponentActivity
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ShopifyCheckoutKitTest {

    @Test
    fun `present returns null when activity is finishing`() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val activity = activityController.get()
            activity.finish()

            val dialog = ShopifyCheckoutKit.present(
                "https://shopify.dev",
                activity,
                noopDefaultCheckoutListener()
            )

            assertThat(dialog).isNull()
        }
    }
}

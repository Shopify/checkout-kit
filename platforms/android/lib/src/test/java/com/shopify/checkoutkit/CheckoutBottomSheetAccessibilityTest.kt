package com.shopify.checkoutkit

import android.view.View
import android.widget.ProgressBar
import androidx.activity.ComponentActivity
import androidx.core.view.ViewCompat
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.shadows.ShadowLooper

@RunWith(RobolectricTestRunner::class)
class CheckoutBottomSheetAccessibilityTest {

    private lateinit var activity: ComponentActivity
    private lateinit var configuration: Configuration

    @Before
    fun setUp() {
        configuration = ShopifyCheckoutKit.configuration
        activity = Robolectric.buildActivity(ComponentActivity::class.java).get()
    }

    @After
    fun tearDown() {
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        ShopifyCheckoutKit.configure {
            it.colorScheme = configuration.colorScheme
            it.preloading = configuration.preloading
            it.platform = configuration.platform
            it.logLevel = configuration.logLevel
        }
    }

    @Test
    fun `bottom sheet keeps container and loading chrome out of accessibility focus`() {
        val sheet = CheckoutBottomSheet(
            checkoutUrl = "https://shopify.com",
            checkoutListener = noopDefaultCheckoutListener(),
            activity = activity,
        ).also { it.start() }

        val bottomSheet = sheet.findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)!!
        val loadingBackground = sheet.findViewById<View>(R.id.checkoutKitLoadingBackground)!!
        val progressBar = sheet.findViewById<ProgressBar>(R.id.progressBar)!!
        val closeButton = sheet.window?.decorView?.findViewById<View>(R.id.checkoutKitCloseBtn)

        assertThat(ViewCompat.getAccessibilityPaneTitle(bottomSheet)).isNull()
        assertThat(bottomSheet.isFocusable).isFalse()
        assertThat(bottomSheet.importantForAccessibility)
            .isEqualTo(View.IMPORTANT_FOR_ACCESSIBILITY_NO)
        assertThat(loadingBackground.importantForAccessibility)
            .isEqualTo(View.IMPORTANT_FOR_ACCESSIBILITY_NO)
        assertThat(progressBar.importantForAccessibility)
            .isEqualTo(View.IMPORTANT_FOR_ACCESSIBILITY_NO)
        assertThat(closeButton).isNotNull
    }
}

package com.shopify.checkoutkit

import android.content.Context
import android.os.Bundle
import android.view.View
import android.view.accessibility.AccessibilityNodeInfo
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
import java.util.concurrent.TimeUnit

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
            it.appearance = configuration.appearance
            it.preloading = configuration.preloading
            it.platform = configuration.platform
            it.logLevel = configuration.logLevel
        }
    }

    @Test
    fun `bottom sheet keeps container and loading chrome out of accessibility focus`() {
        val sheet = presentBottomSheet()

        val bottomSheet = sheet.findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)!!
        val loadingBackground = sheet.findViewById<View>(R.id.checkoutKitLoadingBackground)!!
        val progressBar = sheet.findViewById<ProgressBar>(R.id.progressBar)!!
        val closeButton = sheet.window?.decorView?.findViewById<View>(R.id.shopify_checkout_kit_close_button)

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

    @Test
    fun `bottom sheet focuses close button after accessibility delay`() {
        val sheet = presentBottomSheet()
        val closeButton = sheet.closeButton()

        assertThat(closeButton.isFocused).isFalse()

        runAccessibilityFocusDelay()

        assertThat(closeButton.isFocusable).isTrue()
        assertThat(closeButton.isFocused).isTrue()
    }

    @Test
    fun `close button focus helper requests accessibility focus for touch exploration`() {
        val closeButton = RecordingAccessibilityFocusView(activity)
        var fallbackAnnounced = false

        closeButton.focusForCheckoutSheetAccessibility(
            touchExplorationEnabled = true,
            onAccessibilityFocusUnavailable = { fallbackAnnounced = true },
        )

        assertThat(closeButton.accessibilityFocusRequested).isTrue()
        assertThat(fallbackAnnounced).isFalse()
    }

    private fun presentBottomSheet(): CheckoutBottomSheet =
        CheckoutBottomSheet(
            checkoutUrl = "https://shopify.com",
            checkoutListener = noopDefaultCheckoutListener(),
            activity = activity,
        ).also { it.start() }

    private fun CheckoutBottomSheet.closeButton(): View =
        window?.decorView?.findViewById(R.id.shopify_checkout_kit_close_button)!!

    private fun runAccessibilityFocusDelay() {
        ShadowLooper.idleMainLooper(INITIAL_ACCESSIBILITY_FOCUS_DELAY_MS, TimeUnit.MILLISECONDS)
    }

    private class RecordingAccessibilityFocusView(context: Context) : View(context) {
        var accessibilityFocusRequested = false

        override fun performAccessibilityAction(action: Int, arguments: Bundle?): Boolean {
            accessibilityFocusRequested = action == AccessibilityNodeInfo.ACTION_ACCESSIBILITY_FOCUS
            return accessibilityFocusRequested || super.performAccessibilityAction(action, arguments)
        }
    }

    private companion object {
        private const val INITIAL_ACCESSIBILITY_FOCUS_DELAY_MS = 320L
    }
}

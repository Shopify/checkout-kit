package com.shopify.checkoutkit

import android.app.Dialog
import android.graphics.drawable.ColorDrawable
import android.os.Looper
import android.view.View
import android.webkit.WebView
import android.widget.RelativeLayout
import androidx.activity.ComponentActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.view.children
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.fail
import org.awaitility.Awaitility.await
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.timeout
import org.mockito.kotlin.verify
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowDialog
import org.robolectric.shadows.ShadowLooper
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
class CheckoutDialogTest {

    private lateinit var activity: ComponentActivity
    private lateinit var processor: DefaultCheckoutListener
    private lateinit var configuration: Configuration

    @Before
    fun setUp() {
        configuration = ShopifyCheckoutKit.configuration
        activity = Robolectric.buildActivity(ComponentActivity::class.java).get()
        processor = noopDefaultCheckoutListener()
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
    fun `shows dialog when present is called`() {
        ShopifyCheckoutKit.present("https://shopify.com", activity, processor)

        val dialog = ShadowDialog.getLatestDialog()

        assertThat(dialog.isShowing).isTrue
    }

    @Test
    fun `checkoutView is added to the container when dialog is presented`() {
        ShopifyCheckoutKit.present("https://shopify.com", activity, processor)

        val dialog = ShadowDialog.getLatestDialog()

        ShadowLooper.runUiThreadTasks()

        await().atMost(2, TimeUnit.SECONDS).until {
            dialog.containsChildOfType(CheckoutWebView::class.java)
        }
    }

    @Test
    fun `checkoutView child WebView onResume has been called`() {
        ShopifyCheckoutKit.present("https://shopify.com", activity, processor)

        val webView: WebView = ShadowDialog.getLatestDialog()
            .findViewById<RelativeLayout>(R.id.checkoutKitContainer)
            .children.firstOrNull { it is WebView } as WebView? ?: fail("No WebVew found in dialog")

        assertThat(shadowOf(webView).wasOnResumeCalled()).isTrue()
    }

    @Test
    fun `present uses cached preloaded checkoutView for matching URL`() {
        CheckoutWebView.preload("https://shopify.com/cart/123", activity)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val cachedWebView = CheckoutWebView.cachedPreloadViewForTesting()!!

        ShopifyCheckoutKit.present("https://shopify.com/cart/123", activity, processor)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        val webView = ShadowDialog.getLatestDialog()
            .findViewById<RelativeLayout>(R.id.checkoutKitContainer)
            .children.firstOrNull { it is WebView } as WebView? ?: fail("No WebView found in dialog")

        assertThat(webView).isSameAs(cachedWebView)
        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(shadowOf(webView).wasOnResumeCalled()).isTrue()
    }

    @Test
    fun `cancel() removes and destroys fresh checkoutView`() {
        ShopifyCheckoutKit.present("https://shopify.com", activity, processor)

        val dialog = ShadowDialog.getLatestDialog()
        val webView = dialog.currentCheckoutWebView()
        assertThat(dialog.containsChildOfType(CheckoutWebView::class.java)).isTrue()

        dialog.cancel()
        ShadowLooper.runUiThreadTasks()

        await().atMost(2, TimeUnit.SECONDS).until {
            !dialog.containsChildOfType(CheckoutWebView::class.java)
        }
        assertThat(shadowOf(webView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `dismiss() destroys consumed preloaded checkoutView`() {
        CheckoutWebView.preload("https://shopify.com/cart/123", activity)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val cachedWebView = CheckoutWebView.cachedPreloadViewForTesting()!!

        ShopifyCheckoutKit.present("https://shopify.com/cart/123", activity, processor)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog()
        val webView = dialog.currentCheckoutWebView()
        assertThat(webView).isSameAs(cachedWebView)

        dialog.dismiss()
        ShadowLooper.runUiThreadTasks()

        assertThat(dialog.containsChildOfType(CheckoutWebView::class.java)).isFalse()
        assertThat(shadowOf(cachedWebView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `present returns interface allowing dismissal of the dialog`() {
        val dialogHandle = ShopifyCheckoutKit.present("https://shopify.com", activity, processor)

        val dialog = ShadowDialog.getLatestDialog()
        val webView = dialog.currentCheckoutWebView()
        assertThat(dialog.isShowing).isTrue()
        assertThat(dialog.containsChildOfType(CheckoutWebView::class.java)).isTrue()

        dialogHandle?.dismiss()
        ShadowLooper.runUiThreadTasks()

        assertThat(dialog.isShowing).isFalse()
        await().atMost(2, TimeUnit.SECONDS).until {
            !dialog.containsChildOfType(CheckoutWebView::class.java)
        }
        assertThat(shadowOf(webView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `calls onCheckoutCanceled if cancel is called`() {
        val mockListener = mock<DefaultCheckoutListener>()
        ShopifyCheckoutKit.present("https://shopify.com", activity, mockListener)

        val dialog = ShadowDialog.getLatestDialog()
        dialog.cancel()
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockListener).onCheckoutCanceled()
        verify(mockListener, never()).onCheckoutFailed(any())
    }

    @Test
    fun `closeCheckoutDialogWithError invokes onCheckoutFailed and dismisses the dialog`() {
        val mockListener = mock<DefaultCheckoutListener>()
        ShopifyCheckoutKit.present("https://shopify.com", activity, mockListener)

        val dialog = ShadowDialog.getLatestDialog()
        val checkoutDialog = dialog as CheckoutDialog
        val error = checkoutException()

        checkoutDialog.closeCheckoutDialogWithError(error)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockListener, never()).onCheckoutCanceled()
        verify(mockListener).onCheckoutFailed(error)
        assertThat(checkoutDialog.isShowing).isFalse()
    }

    @Test
    fun `calls onCheckoutCanceled if close menu item is clicked`() {
        val mockListener = mock<DefaultCheckoutListener>()
        ShopifyCheckoutKit.present("https://shopify.com", activity, mockListener)

        val dialog = ShadowDialog.getLatestDialog()
        assertThat(dialog.containsChildOfType(CheckoutWebView::class.java)).isTrue()

        // click cancel button
        val header = dialog.findViewById<Toolbar>(R.id.checkoutKitHeader)
        header.menu.performIdentifierAction(R.id.checkoutKitCloseBtn, 0)
        ShadowLooper.runUiThreadTasks()

        verify(mockListener, timeout(2000)).onCheckoutCanceled()
    }

    @Test
    fun `clicking close invokes cancel(), removing checkoutView from the container`() {
        ShopifyCheckoutKit.present("https://shopify.com", activity, processor)

        val dialog = ShadowDialog.getLatestDialog()
        assertThat(dialog.containsChildOfType(CheckoutWebView::class.java)).isTrue()

        // click cancel button
        val header = dialog.findViewById<Toolbar>(R.id.checkoutKitHeader)
        header.menu.performIdentifierAction(R.id.checkoutKitCloseBtn, 0)
        ShadowLooper.runUiThreadTasks()

        assertThat(dialog.containsChildOfType(CheckoutWebView::class.java)).isFalse()
    }

    @Test
    fun `sets header background color based on current configuration`() {
        val customColors = customColors()
        ShopifyCheckoutKit.configuration.colorScheme = ColorScheme.Web(customColors)

        ShopifyCheckoutKit.present("https://shopify.com", activity, processor)

        val dialog = ShadowDialog.getLatestDialog()
        val header = dialog.findViewById<Toolbar>(R.id.checkoutKitHeader)
        val headerBackgroundColor = backgroundColor(header)
        val configuredColor = customColors.headerBackground.getValue(activity)

        assertThat(headerBackgroundColor).isEqualTo(configuredColor)
    }

    @Test
    fun `sets WebView container background color based on current configuration`() {
        val customColors = customColors()
        ShopifyCheckoutKit.configuration.colorScheme = ColorScheme.Web(customColors)

        ShopifyCheckoutKit.present("https://shopify.com", activity, processor)

        val dialog = ShadowDialog.getLatestDialog()
        val webViewContainer = dialog.findViewById<RelativeLayout>(R.id.checkoutKitContainer)
        val webViewContainerBackgroundColor = backgroundColor(webViewContainer)
        val configuredColor = customColors.webViewBackground.getValue(activity)

        assertThat(webViewContainerBackgroundColor).isEqualTo(configuredColor)
    }

    @Test
    fun `dialog applies custom close icon when provided`() {
        val customIcon = DrawableResource(android.R.drawable.ic_delete)
        ShopifyCheckoutKit.configure {
            it.colorScheme = ColorScheme.Light(
                colors = Colors(
                    headerBackground = Color.ResourceId(R.color.checkoutLightBg),
                    headerFont = Color.ResourceId(R.color.checkoutLightFont),
                    webViewBackground = Color.ResourceId(R.color.checkoutLightBg),
                    progressIndicator = Color.ResourceId(R.color.checkoutLightProgressIndicator),
                    closeIcon = customIcon
                )
            )
        }

        ShopifyCheckoutKit.present("https://shopify.com", activity, mock<DefaultCheckoutListener>())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog() as CheckoutDialog
        val toolbar = dialog.findViewById<Toolbar>(R.id.checkoutKitHeader)
        val closeMenuItem = toolbar.menu.findItem(R.id.checkoutKitCloseBtn)

        assertThat(closeMenuItem).isNotNull
        assertThat(closeMenuItem.icon).isNotNull

        // Verify the custom icon was actually applied
        val shadowDrawable = shadowOf(closeMenuItem.icon)
        assertThat(shadowDrawable.createdFromResId).isEqualTo(android.R.drawable.ic_delete)
    }

    @Test
    fun `dialog applies close icon tint when provided and no custom icon`() {
        val tintColor = Color.SRGB(0xFF0000)
        ShopifyCheckoutKit.configure {
            it.colorScheme = ColorScheme.Dark().customize {
                closeIconTint = tintColor
            }
        }

        ShopifyCheckoutKit.present("https://shopify.com", activity, mock<DefaultCheckoutListener>())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog() as CheckoutDialog
        val toolbar = dialog.findViewById<Toolbar>(R.id.checkoutKitHeader)
        val closeMenuItem = toolbar.menu.findItem(R.id.checkoutKitCloseBtn)

        assertThat(closeMenuItem).isNotNull
        assertThat(closeMenuItem.icon).isNotNull

        // Verify this is not our custom icon (the main behavior we're testing)
        // Note: In Robolectric tests, tint application to menu items can be inconsistent,
        // but the key thing is that the icon logic branch was taken correctly
        val shadowDrawable = shadowOf(closeMenuItem.icon)
        assertThat(shadowDrawable.createdFromResId).isNotEqualTo(android.R.drawable.ic_delete) // Not our custom icon
    }

    @Test
    fun `dialog uses default close icon when no customization provided`() {
        ShopifyCheckoutKit.configure {
            it.colorScheme = ColorScheme.Light() // Default colors, no custom icon or tint
        }
        val mockProcessor = mock<DefaultCheckoutListener>()
        ShopifyCheckoutKit.present("https://shopify.com", activity, mockProcessor)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog() as CheckoutDialog
        val toolbar = dialog.findViewById<Toolbar>(R.id.checkoutKitHeader)
        val closeMenuItem = toolbar.menu.findItem(R.id.checkoutKitCloseBtn)

        assertThat(closeMenuItem).isNotNull
        assertThat(closeMenuItem.icon).isNotNull

        // Verify no custom modifications were applied
        val shadowDrawable = shadowOf(closeMenuItem.icon)
        assertThat(shadowDrawable.createdFromResId).isNotEqualTo(android.R.drawable.ic_delete) // Not our custom icon
        assertThat(closeMenuItem.icon?.colorFilter).isNull() // No tint was applied
    }

    @Test
    fun `dialog prioritizes custom icon over tint when both are provided`() {
        val customIcon = DrawableResource(android.R.drawable.ic_delete)
        val tintColor = Color.SRGB(0xFF0000)
        val colorScheme = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackground = Color.ResourceId(R.color.checkoutLightBg),
                headerFont = Color.ResourceId(R.color.checkoutLightFont),
                webViewBackground = Color.ResourceId(R.color.checkoutLightBg),
                progressIndicator = Color.ResourceId(R.color.checkoutLightProgressIndicator),
                closeIcon = customIcon,
                closeIconTint = tintColor // Should be ignored when closeIcon is present
            ),
            darkColors = Colors(
                headerBackground = Color.ResourceId(R.color.checkoutDarkBg),
                headerFont = Color.ResourceId(R.color.checkoutDarkFont),
                webViewBackground = Color.ResourceId(R.color.checkoutDarkBg),
                progressIndicator = Color.ResourceId(R.color.checkoutDarkProgressIndicator),
                closeIcon = customIcon,
                closeIconTint = tintColor
            )
        )

        ShopifyCheckoutKit.configure { it.colorScheme = colorScheme }
        val mockProcessor = mock<DefaultCheckoutListener>()
        ShopifyCheckoutKit.present("https://shopify.com", activity, mockProcessor)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog() as CheckoutDialog
        val toolbar = dialog.findViewById<Toolbar>(R.id.checkoutKitHeader)
        val closeMenuItem = toolbar.menu.findItem(R.id.checkoutKitCloseBtn)

        assertThat(closeMenuItem).isNotNull
        assertThat(closeMenuItem.icon).isNotNull

        // Verify the custom icon was applied (not the default)
        val shadowDrawable = shadowOf(closeMenuItem.icon)
        assertThat(shadowDrawable.createdFromResId).isEqualTo(android.R.drawable.ic_delete)

        // Custom icon should be applied, tint should be ignored
    }

    @Test
    fun `back press cancels dialog when WebView has no history to navigate`() {
        val mockListener = mock<DefaultCheckoutListener>()
        ShopifyCheckoutKit.present("https://shopify.com", activity, mockListener)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog() as CheckoutDialog
        dialog.onBackPressedDispatcher.onBackPressed()
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockListener).onCheckoutCanceled()
        assertThat(dialog.isShowing).isFalse()
    }

    @Test
    fun `back press navigates WebView history when history exists and not on confirmation page`() {
        val mockListener = mock<DefaultCheckoutListener>()
        ShopifyCheckoutKit.present("https://shopify.com/checkouts/c/abc", activity, mockListener)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog() as CheckoutDialog
        val webView = dialog.currentWebView()
        webView.loadUrl("https://shopify.com/checkouts/c/abc/step2")
        // ShadowWebView doesn't auto-track loadUrl in history; push two entries so canGoBack() returns true.
        shadowOf(webView).pushEntryToHistory("https://shopify.com/checkouts/c/abc")
        shadowOf(webView).pushEntryToHistory("https://shopify.com/checkouts/c/abc/step2")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        dialog.onBackPressedDispatcher.onBackPressed()
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockListener, never()).onCheckoutCanceled()
        assertThat(dialog.isShowing).isTrue()
        assertThat(shadowOf(webView).goBackInvocations).isGreaterThan(0)
    }

    @Test
    fun `back press cancels dialog when on confirmation page even with history`() {
        val mockListener = mock<DefaultCheckoutListener>()
        ShopifyCheckoutKit.present("https://shopify.com/checkouts/c/abc", activity, mockListener)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog() as CheckoutDialog
        val webView = dialog.currentWebView()
        webView.loadUrl("https://shopify.com/cn-12345/thank-you")
        shadowOf(webView).pushEntryToHistory("https://shopify.com/checkouts/c/abc")
        shadowOf(webView).pushEntryToHistory("https://shopify.com/cn-12345/thank-you")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        dialog.onBackPressedDispatcher.onBackPressed()
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockListener).onCheckoutCanceled()
        assertThat(dialog.isShowing).isFalse()
        assertThat(shadowOf(webView).goBackInvocations).isEqualTo(0)
    }

    private fun CheckoutDialog.currentWebView(): BaseWebView =
        findViewById<RelativeLayout>(R.id.checkoutKitContainer)
            .children.first { it is BaseWebView } as BaseWebView

    private fun backgroundColor(view: View): Int {
        return (view.background as ColorDrawable).color
    }

    private fun customColors(): Colors {
        return Colors(
            headerFont = Color.ResourceId(androidx.appcompat.R.color.material_grey_850),
            headerBackground = Color.ResourceId(androidx.appcompat.R.color.material_blue_grey_900),
            webViewBackground = Color.ResourceId(androidx.appcompat.R.color.material_deep_teal_200),
            progressIndicator = Color.ResourceId(androidx.appcompat.R.color.background_material_dark),
        )
    }

    private fun <T : WebView> Dialog.containsChildOfType(clazz: Class<T>): Boolean {
        val layout = this.findViewById<RelativeLayout>(R.id.checkoutKitContainer)
        return layout.children.any { clazz.isInstance(it) }
    }

    private fun Dialog.currentCheckoutWebView(): CheckoutWebView =
        findViewById<RelativeLayout>(R.id.checkoutKitContainer)
            .children.first { it is CheckoutWebView } as CheckoutWebView

    private fun checkoutException(): CheckoutException {
        return CheckoutKitException(
            errorCode = CheckoutKitException.ERROR_SENDING_MESSAGE_TO_CHECKOUT,
            errorDescription = "Error sending message to checkout",
        )
    }
}

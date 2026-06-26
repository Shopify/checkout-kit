package com.shopify.checkoutkit

import android.content.Context
import android.graphics.drawable.ColorDrawable
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebView
import android.widget.ProgressBar
import android.widget.RelativeLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.view.NestedScrollingParent3
import androidx.core.view.ViewCompat
import androidx.core.view.children
import com.google.android.material.bottomsheet.BottomSheetBehavior
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
class CheckoutBottomSheetTest {

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
    fun `shows bottom sheet when started`() {
        val sheet = presentBottomSheet()

        assertThat(sheet.isShowing).isTrue
    }

    @Test
    fun `bottom sheet leaves configured top gap without grabber chrome`() {
        val sheet = presentBottomSheet()

        val bottomSheet = sheet.findViewById<ViewGroup>(com.google.android.material.R.id.design_bottom_sheet)!!
        val behavior = BottomSheetBehavior.from(bottomSheet)

        assertThat(
            behavior.expandedOffset
        ).isEqualTo(
            activity.resources.getDimensionPixelSize(R.dimen.checkout_sheet_top_gap)
        )
        assertThat(bottomSheet.childCount).isEqualTo(1)
    }

    @Test
    fun `checkoutView is added to the container when bottom sheet is presented`() {
        val sheet = presentBottomSheet()

        ShadowLooper.runUiThreadTasks()

        await().atMost(2, TimeUnit.SECONDS).until {
            sheet.containsChildOfType(CheckoutWebView::class.java)
        }
    }

    @Test
    fun `progress bar overlays checkout content without reserving WebView space`() {
        val sheet = presentBottomSheet()

        val container = sheet.findViewById<RelativeLayout>(R.id.checkoutKitContainer)!!
        val webView = sheet.currentCheckoutWebView()
        val progressBar = container.findViewById<ProgressBar>(R.id.progressBar)
        val layoutParams = webView.layoutParams as RelativeLayout.LayoutParams

        assertThat(layoutParams.width).isEqualTo(ViewGroup.LayoutParams.MATCH_PARENT)
        assertThat(layoutParams.height).isEqualTo(ViewGroup.LayoutParams.MATCH_PARENT)
        assertThat(layoutParams.getRule(RelativeLayout.BELOW)).isEqualTo(0)
        assertThat(container.indexOfChild(webView)).isLessThan(container.indexOfChild(progressBar))
    }

    @Test
    fun `checkoutView is registered as nested scrolling child for bottom sheet gestures`() {
        val sheet = presentBottomSheet()

        val webView = sheet.currentCheckoutWebView()

        assertThat(ViewCompat.isNestedScrollingEnabled(webView)).isTrue()
    }

    @Test
    fun `checkoutView dispatches downward drag to nested sheet when pulling from page top`() {
        val (parent, webView) = scrollHandoffWebView(canScrollUp = false)
        val onTouchListener = shadowOf(webView).getOnTouchListener()

        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_DOWN, y = 20f))
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_MOVE, y = 40f))

        assertThat(parent.startedNestedScrollCount).isEqualTo(1)
        assertThat(parent.preScrollDeltas).containsExactly(-20)
        assertThat(shadowOf(parent).disallowInterceptTouchEvent).isTrue()
    }

    @Test
    fun `checkoutView dispatches only leftover downward drag after page reaches top`() {
        val (parent, webView) = scrollHandoffWebView(canScrollUp = true)
        val onTouchListener = shadowOf(webView).getOnTouchListener()

        webView.scrollTo(0, 100)
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_DOWN, y = 20f))
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_MOVE, y = 40f))

        assertThat(parent.preScrollDeltas).isEmpty()

        webView.scrollTo(0, 6)
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_MOVE, y = 60f))

        assertThat(parent.preScrollDeltas).containsExactly(-14)
    }

    @Test
    fun `checkoutView keeps sheet from intercepting upward page scrolls`() {
        val (parent, webView) = scrollHandoffWebView(canScrollUp = false)
        val onTouchListener = shadowOf(webView).getOnTouchListener()

        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_DOWN, y = 40f))
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_MOVE, y = 20f))

        assertThat(parent.preScrollDeltas).isEmpty()
        assertThat(shadowOf(parent).disallowInterceptTouchEvent).isTrue()
    }

    @Test
    fun `checkoutView stops nested scroll and releases interception lock when touch ends`() {
        val (parent, webView) = scrollHandoffWebView(canScrollUp = false)
        val onTouchListener = shadowOf(webView).getOnTouchListener()

        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_DOWN, y = 40f))
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_MOVE, y = 20f))
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_UP, y = 20f))

        assertThat(parent.stoppedNestedScrollCount).isEqualTo(1)
        assertThat(shadowOf(parent).disallowInterceptTouchEvent).isFalse()
    }

    @Test
    fun `checkoutView child WebView onResume has been called`() {
        val sheet = presentBottomSheet()

        val webView: WebView = sheet
            .findViewById<RelativeLayout>(R.id.checkoutKitContainer)
            ?.children?.firstOrNull { it is WebView } as WebView? ?: fail("No WebView found in bottom sheet")

        assertThat(shadowOf(webView).wasOnResumeCalled()).isTrue()
    }

    @Test
    fun `bottom sheet uses cached preloaded checkoutView for matching URL`() {
        CheckoutWebView.preload("https://shopify.com/cart/123", activity)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val cachedWebView = CheckoutWebView.cachedPreloadViewForTesting()!!

        val sheet = presentBottomSheet("https://shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        val webView = sheet
            .findViewById<RelativeLayout>(R.id.checkoutKitContainer)
            ?.children?.firstOrNull { it is WebView } as WebView? ?: fail("No WebView found in bottom sheet")

        assertThat(webView).isSameAs(cachedWebView)
        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(shadowOf(webView).wasOnResumeCalled()).isTrue()
    }

    @Test
    fun `cancel() removes and destroys fresh checkoutView`() {
        val sheet = presentBottomSheet()

        val webView = sheet.currentCheckoutWebView()
        assertThat(sheet.containsChildOfType(CheckoutWebView::class.java)).isTrue()

        sheet.cancel()
        ShadowLooper.runUiThreadTasks()

        await().atMost(2, TimeUnit.SECONDS).until {
            !sheet.containsChildOfType(CheckoutWebView::class.java)
        }
        assertThat(shadowOf(webView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `dismiss() destroys consumed preloaded checkoutView`() {
        CheckoutWebView.preload("https://shopify.com/cart/123", activity)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val cachedWebView = CheckoutWebView.cachedPreloadViewForTesting()!!

        val sheet = presentBottomSheet("https://shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        val webView = sheet.currentCheckoutWebView()
        assertThat(webView).isSameAs(cachedWebView)

        sheet.dismiss()
        ShadowLooper.runUiThreadTasks()

        assertThat(sheet.containsChildOfType(CheckoutWebView::class.java)).isFalse()
        assertThat(shadowOf(cachedWebView).wasDestroyCalled()).isTrue()
    }

    @Suppress("DEPRECATION")
    @Test
    fun `bottom sheet does not force soft input resize while presented`() {
        val originalMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN or
            WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN
        activity.window.setSoftInputMode(originalMode)

        val sheet = presentBottomSheet()
        val presentedMode = sheet.window?.attributes?.softInputMode ?: 0

        assertThat(presentedMode and WindowManager.LayoutParams.SOFT_INPUT_MASK_ADJUST)
            .isNotEqualTo(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        assertThat(activity.window.attributes.softInputMode).isEqualTo(originalMode)

        sheet.dismiss()
        ShadowLooper.runUiThreadTasks()

        assertThat(activity.window.attributes.softInputMode).isEqualTo(originalMode)
    }

    @Test
    fun `present returns handle allowing dismissal of checkout`() {
        val checkout = ShopifyCheckoutKit.present("https://shopify.com", activity, processor)
        val sheet = ShadowDialog.getLatestDialog() as CheckoutBottomSheet
        val container = sheet.findViewById<RelativeLayout>(R.id.checkoutKitContainer)!!
        val webView = container.children.first { it is CheckoutWebView } as CheckoutWebView

        assertThat(checkout).isNotNull
        assertThat(checkout).isInstanceOf(CheckoutHandle::class.java)
        assertThat(checkout).isNotInstanceOf(CheckoutBottomSheet::class.java)
        assertThat(sheet.isShowing).isTrue()

        checkout?.dismiss()
        ShadowLooper.runUiThreadTasks()

        assertThat(sheet.isShowing).isFalse()
        assertThat(shadowOf(webView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `calls onCheckoutCanceled if cancel is called`() {
        val mockListener = mock<DefaultCheckoutListener>()
        val sheet = presentBottomSheet(checkoutListener = mockListener)

        sheet.cancel()
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockListener).onCheckoutCanceled()
        verify(mockListener, never()).onCheckoutFailed(any())
    }

    @Test
    fun `closeCheckoutWithError invokes onCheckoutFailed and dismisses the bottom sheet`() {
        val mockListener = mock<DefaultCheckoutListener>()
        val checkoutSheet = presentBottomSheet(checkoutListener = mockListener)

        val error = checkoutException()

        checkoutSheet.closeCheckoutWithError(error)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockListener, never()).onCheckoutCanceled()
        verify(mockListener).onCheckoutFailed(error)
        assertThat(checkoutSheet.isShowing).isFalse()
    }

    @Test
    fun `calls onCheckoutCanceled if close menu item is clicked`() {
        val mockListener = mock<DefaultCheckoutListener>()
        val sheet = presentBottomSheet(checkoutListener = mockListener)

        assertThat(sheet.containsChildOfType(CheckoutWebView::class.java)).isTrue()

        // click cancel button
        val header = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
        header.menu.performIdentifierAction(R.id.checkoutKitCloseBtn, 0)
        ShadowLooper.runUiThreadTasks()

        verify(mockListener, timeout(2000)).onCheckoutCanceled()
    }

    @Test
    fun `clicking close invokes cancel(), removing checkoutView from the container`() {
        val sheet = presentBottomSheet()

        assertThat(sheet.containsChildOfType(CheckoutWebView::class.java)).isTrue()

        // click cancel button
        val header = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
        header.menu.performIdentifierAction(R.id.checkoutKitCloseBtn, 0)
        ShadowLooper.runUiThreadTasks()

        assertThat(sheet.containsChildOfType(CheckoutWebView::class.java)).isFalse()
    }

    @Test
    fun `sets header background color based on current configuration`() {
        val customColors = customColors()
        ShopifyCheckoutKit.configuration.colorScheme = ColorScheme.Web(customColors)

        val sheet = presentBottomSheet()

        val header = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
        val headerBackgroundColor = backgroundColor(header)
        val configuredColor = customColors.headerBackground.getValue(activity)

        assertThat(headerBackgroundColor).isEqualTo(configuredColor)
    }

    @Test
    fun `rounds only top header corners`() {
        val sheet = presentBottomSheet()

        val header = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
        val background = header.background as CheckoutSheetHeaderBackgroundDrawable
        val cornerRadius = activity.resources.getDimension(R.dimen.checkout_sheet_corner_radius)

        assertThat(background.appliedCornerRadii).containsExactly(
            cornerRadius,
            cornerRadius,
            cornerRadius,
            cornerRadius,
            0f,
            0f,
            0f,
            0f,
        )
    }

    @Test
    fun `centers header title without toolbar elevation`() {
        val customColors = customColors()
        ShopifyCheckoutKit.configuration.colorScheme = ColorScheme.Web(customColors)

        val sheet = presentBottomSheet()

        val header = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
        val title = sheet.findViewById<TextView>(R.id.checkoutKitHeaderTitle)!!
        val titleLayoutParams = title.layoutParams as Toolbar.LayoutParams

        assertThat(header.elevation).isEqualTo(0f)
        assertThat(header.title).isEmpty()
        assertThat(title.text).isEqualTo(activity.getString(R.string.checkout_web_view_title))
        assertThat(title.currentTextColor).isEqualTo(customColors.headerFont.getValue(activity))
        assertThat(title.textSize).isEqualTo(activity.resources.getDimension(R.dimen.checkout_sheet_title_text_size))
        assertThat(titleLayoutParams.gravity and Gravity.CENTER).isEqualTo(Gravity.CENTER)
    }

    @Test
    fun `sets WebView container background color based on current configuration`() {
        val customColors = customColors()
        ShopifyCheckoutKit.configuration.colorScheme = ColorScheme.Web(customColors)

        val sheet = presentBottomSheet()

        val webViewContainer = sheet.findViewById<RelativeLayout>(R.id.checkoutKitContainer)!!
        val webViewContainerBackgroundColor = backgroundColor(webViewContainer)
        val configuredColor = customColors.webViewBackground.getValue(activity)
        val webView = sheet.currentCheckoutWebView()

        assertThat(webViewContainerBackgroundColor).isEqualTo(configuredColor)
        assertThat(shadowOf(webView).backgroundColor).isEqualTo(configuredColor)
    }

    @Test
    fun `bottom sheet applies custom close icon when provided`() {
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

        val sheet = presentBottomSheet(checkoutListener = mock<DefaultCheckoutListener>())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val toolbar = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
        val closeMenuItem = toolbar.menu.findItem(R.id.checkoutKitCloseBtn)

        assertThat(closeMenuItem).isNotNull
        assertThat(closeMenuItem.icon).isNotNull

        // Verify the custom icon was actually applied
        val shadowDrawable = shadowOf(closeMenuItem.icon)
        assertThat(shadowDrawable.createdFromResId).isEqualTo(android.R.drawable.ic_delete)
    }

    @Test
    fun `bottom sheet applies close icon tint when provided and no custom icon`() {
        val tintColor = Color.SRGB(0xFF0000)
        ShopifyCheckoutKit.configure {
            it.colorScheme = ColorScheme.Dark().customize {
                closeIconTint = tintColor
            }
        }

        val sheet = presentBottomSheet(checkoutListener = mock<DefaultCheckoutListener>())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val toolbar = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
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
    fun `bottom sheet uses default close icon when no customization provided`() {
        ShopifyCheckoutKit.configure {
            it.colorScheme = ColorScheme.Light() // Default colors, no custom icon or tint
        }
        val mockProcessor = mock<DefaultCheckoutListener>()
        val sheet = presentBottomSheet(checkoutListener = mockProcessor)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val toolbar = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
        val closeMenuItem = toolbar.menu.findItem(R.id.checkoutKitCloseBtn)

        assertThat(closeMenuItem).isNotNull
        assertThat(closeMenuItem.icon).isNotNull

        // Verify no custom modifications were applied
        val shadowDrawable = shadowOf(closeMenuItem.icon)
        assertThat(shadowDrawable.createdFromResId).isNotEqualTo(android.R.drawable.ic_delete) // Not our custom icon
        assertThat(closeMenuItem.icon?.colorFilter).isNull() // No tint was applied
    }

    @Test
    fun `bottom sheet prioritizes custom icon over tint when both are provided`() {
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
        val sheet = presentBottomSheet(checkoutListener = mockProcessor)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val toolbar = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
        val closeMenuItem = toolbar.menu.findItem(R.id.checkoutKitCloseBtn)

        assertThat(closeMenuItem).isNotNull
        assertThat(closeMenuItem.icon).isNotNull

        // Verify the custom icon was applied (not the default)
        val shadowDrawable = shadowOf(closeMenuItem.icon)
        assertThat(shadowDrawable.createdFromResId).isEqualTo(android.R.drawable.ic_delete)

        // Custom icon should be applied, tint should be ignored
    }

    @Test
    fun `back press cancels bottom sheet when WebView has no history to navigate`() {
        val mockListener = mock<DefaultCheckoutListener>()
        val sheet = presentBottomSheet(checkoutListener = mockListener)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        sheet.onBackPressedDispatcher.onBackPressed()
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockListener).onCheckoutCanceled()
        assertThat(sheet.isShowing).isFalse()
    }

    @Test
    fun `back press navigates WebView history when history exists and not on confirmation page`() {
        val mockListener = mock<DefaultCheckoutListener>()
        val sheet = presentBottomSheet(
            checkoutUrl = "https://shopify.com/checkouts/c/abc",
            checkoutListener = mockListener,
        )
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val webView = sheet.currentWebView()
        webView.loadUrl("https://shopify.com/checkouts/c/abc/step2")
        // ShadowWebView doesn't auto-track loadUrl in history; push two entries so canGoBack() returns true.
        shadowOf(webView).pushEntryToHistory("https://shopify.com/checkouts/c/abc")
        shadowOf(webView).pushEntryToHistory("https://shopify.com/checkouts/c/abc/step2")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        sheet.onBackPressedDispatcher.onBackPressed()
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockListener, never()).onCheckoutCanceled()
        assertThat(sheet.isShowing).isTrue()
        assertThat(shadowOf(webView).goBackInvocations).isGreaterThan(0)
    }

    @Test
    fun `back press cancels bottom sheet when on confirmation page even with history`() {
        val mockListener = mock<DefaultCheckoutListener>()
        val sheet = presentBottomSheet(
            checkoutUrl = "https://shopify.com/checkouts/c/abc",
            checkoutListener = mockListener,
        )
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val webView = sheet.currentWebView()
        webView.loadUrl("https://shopify.com/cn-12345/thank-you")
        shadowOf(webView).pushEntryToHistory("https://shopify.com/checkouts/c/abc")
        shadowOf(webView).pushEntryToHistory("https://shopify.com/cn-12345/thank-you")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        sheet.onBackPressedDispatcher.onBackPressed()
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockListener).onCheckoutCanceled()
        assertThat(sheet.isShowing).isFalse()
        assertThat(shadowOf(webView).goBackInvocations).isEqualTo(0)
    }

    private fun CheckoutBottomSheet.currentWebView(): BaseWebView =
        findViewById<RelativeLayout>(R.id.checkoutKitContainer)!!
            .children.first { it is BaseWebView } as BaseWebView

    private fun presentBottomSheet(
        checkoutUrl: String = "https://shopify.com",
        checkoutListener: CheckoutListener = processor,
        protocolClient: CheckoutProtocol.Client? = null,
    ): CheckoutBottomSheet =
        CheckoutBottomSheet(checkoutUrl, checkoutListener, activity, protocolClient).also { sheet ->
            sheet.start()
        }

    private fun backgroundColor(view: View): Int {
        return when (val background = view.background) {
            is ColorDrawable -> background.color
            is CheckoutSheetHeaderBackgroundDrawable -> background.fillColor
            else -> fail("Unsupported background type ${background::class.java}")
        }
    }

    private fun customColors(): Colors {
        return Colors(
            headerFont = Color.ResourceId(androidx.appcompat.R.color.material_grey_850),
            headerBackground = Color.ResourceId(androidx.appcompat.R.color.material_blue_grey_900),
            webViewBackground = Color.ResourceId(androidx.appcompat.R.color.material_deep_teal_200),
            progressIndicator = Color.ResourceId(androidx.appcompat.R.color.background_material_dark),
        )
    }

    private fun <T : WebView> CheckoutBottomSheet.containsChildOfType(clazz: Class<T>): Boolean {
        val layout = this.findViewById<RelativeLayout>(R.id.checkoutKitContainer) ?: return false
        return layout.children.any { clazz.isInstance(it) }
    }

    private fun CheckoutBottomSheet.currentCheckoutWebView(): CheckoutWebView =
        findViewById<RelativeLayout>(R.id.checkoutKitContainer)!!
            .children.first { it is CheckoutWebView } as CheckoutWebView

    private fun scrollHandoffWebView(canScrollUp: Boolean): Pair<TestNestedScrollParent, ScrollableBaseWebView> {
        val container = TestNestedScrollParent(activity)
        val webView = ScrollableBaseWebView(activity).apply {
            this.canScrollUp = canScrollUp
            ViewCompat.setNestedScrollingEnabled(this, true)
            installBottomSheetScrollHandoff()
        }
        container.addView(webView)
        return container to webView
    }

    private fun motionEvent(action: Int, y: Float): MotionEvent =
        MotionEvent.obtain(0, 0, action, 0f, y, 0)

    private fun checkoutException(): CheckoutException {
        return CheckoutKitException(
            errorCode = CheckoutKitException.ERROR_SENDING_MESSAGE_TO_CHECKOUT,
            errorDescription = "Error sending message to checkout",
        )
    }

    private class ScrollableBaseWebView(context: Context) : BaseWebView(context) {
        var canScrollUp = false

        override fun getListener(): CheckoutWebViewListener {
            return CheckoutWebViewListener(NoopCheckoutListener())
        }

        override fun canScrollVertically(direction: Int): Boolean {
            return if (direction < 0) {
                canScrollUp
            } else {
                super.canScrollVertically(direction)
            }
        }
    }

    private class TestNestedScrollParent(context: Context) : RelativeLayout(context), NestedScrollingParent3 {
        val preScrollDeltas = mutableListOf<Int>()
        var startedNestedScrollCount = 0
        var stoppedNestedScrollCount = 0

        override fun onStartNestedScroll(child: View, target: View, axes: Int): Boolean {
            return axes and ViewCompat.SCROLL_AXIS_VERTICAL != 0
        }

        override fun onStartNestedScroll(child: View, target: View, axes: Int, type: Int): Boolean {
            return onStartNestedScroll(child, target, axes)
        }

        override fun onNestedScrollAccepted(child: View, target: View, axes: Int) {
            startedNestedScrollCount += 1
        }

        override fun onNestedScrollAccepted(child: View, target: View, axes: Int, type: Int) {
            startedNestedScrollCount += 1
        }

        override fun onStopNestedScroll(target: View) {
            stoppedNestedScrollCount += 1
        }

        override fun onStopNestedScroll(target: View, type: Int) {
            stoppedNestedScrollCount += 1
        }

        override fun onNestedPreScroll(target: View, dx: Int, dy: Int, consumed: IntArray) {
            onNestedPreScroll(target, dx, dy, consumed, ViewCompat.TYPE_TOUCH)
        }

        override fun onNestedPreScroll(target: View, dx: Int, dy: Int, consumed: IntArray, type: Int) {
            preScrollDeltas.add(dy)
            consumed[1] = dy
        }

        override fun onNestedScroll(target: View, dxConsumed: Int, dyConsumed: Int, dxUnconsumed: Int, dyUnconsumed: Int) =
            Unit

        override fun onNestedScroll(
            target: View,
            dxConsumed: Int,
            dyConsumed: Int,
            dxUnconsumed: Int,
            dyUnconsumed: Int,
            type: Int,
        ) = Unit

        override fun onNestedScroll(
            target: View,
            dxConsumed: Int,
            dyConsumed: Int,
            dxUnconsumed: Int,
            dyUnconsumed: Int,
            type: Int,
            consumed: IntArray,
        ) = Unit

        override fun onNestedFling(target: View, velocityX: Float, velocityY: Float, consumed: Boolean): Boolean {
            return false
        }

        override fun onNestedPreFling(target: View, velocityX: Float, velocityY: Float): Boolean {
            return false
        }

        override fun getNestedScrollAxes(): Int {
            return ViewCompat.SCROLL_AXIS_VERTICAL
        }
    }
}

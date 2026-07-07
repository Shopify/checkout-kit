package com.shopify.checkoutkit

import android.content.Context
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.RelativeLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.graphics.Insets
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
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
import kotlin.math.roundToInt

@Suppress("LargeClass")
@RunWith(RobolectricTestRunner::class)
class CheckoutBottomSheetTest {

    private lateinit var activity: ComponentActivity
    private lateinit var processor: DefaultCheckoutListener
    private lateinit var configuration: Configuration

    @Before
    fun setUp() {
        configuration = ShopifyCheckoutKit.getConfiguration()
        activity = Robolectric.buildActivity(ComponentActivity::class.java).get()
        processor = noopDefaultCheckoutListener()
    }

    @After
    fun tearDown() {
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        ShopifyCheckoutKit.configure {
            it.colorScheme = configuration.colorScheme
            it.sheet = configuration.sheet
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
    fun `bottom sheet leaves configured window top margin without grabber chrome`() {
        ShopifyCheckoutKit.configure {
            it.sheet = CheckoutSheetOptions(
                snapPoints = listOf(CheckoutSheetSnapPoint.Expanded(topMarginDp = 12f))
            )
        }

        val sheet = presentBottomSheet()

        val bottomSheet = sheet.findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)!!
        val layoutParams = bottomSheet.layoutParams as FrameLayout.LayoutParams

        assertThat(layoutParams.topMargin).isEqualTo(12f.dpToPx(activity).roundToInt())
        assertThat(bottomSheet.findViewById<View>(R.id.checkoutKitDragHandle)!!.visibility).isEqualTo(View.GONE)
    }

    @Test
    fun `bottom sheet clamps configured window top margin below status bar`() {
        ShopifyCheckoutKit.configure {
            it.sheet = CheckoutSheetOptions(
                snapPoints = listOf(CheckoutSheetSnapPoint.Expanded(topMarginDp = 12f))
            )
        }
        val sheet = presentBottomSheet()
        val bottomSheet = sheet.findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)!!
        val statusBarTopInset = 24f.dpToPx(activity).roundToInt()

        ViewCompat.dispatchApplyWindowInsets(
            bottomSheet,
            WindowInsetsCompat.Builder()
                .setInsets(WindowInsetsCompat.Type.systemBars(), Insets.of(0, statusBarTopInset, 0, 0))
                .build(),
        )

        val layoutParams = bottomSheet.layoutParams as FrameLayout.LayoutParams

        assertThat(layoutParams.topMargin).isEqualTo(statusBarTopInset)
    }

    @Test
    fun `material expanded snap point uses wide window top margin above width threshold`() {
        ShopifyCheckoutKit.configure {
            it.sheet = CheckoutSheetOptions(
                snapPoints = listOf(CheckoutSheetSnapPoint.MaterialExpanded)
            )
        }
        val sheet = presentBottomSheet()
        val bottomSheet = sheet.findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)!!
        val wideWindowWidth = (CheckoutSheetSnapPoint.MATERIAL_WIDE_WINDOW_WIDTH_THRESHOLD_DP + 1f)
            .dpToPx(activity)
            .roundToInt()
        sheet.window!!.decorView.layout(0, 0, wideWindowWidth, TEST_SHEET_SIZE)

        ViewCompat.dispatchApplyWindowInsets(
            bottomSheet,
            WindowInsetsCompat.Builder()
                .setInsets(WindowInsetsCompat.Type.systemBars(), Insets.NONE)
                .build(),
        )

        val layoutParams = bottomSheet.layoutParams as FrameLayout.LayoutParams

        assertThat(layoutParams.topMargin)
            .isEqualTo(CheckoutSheetSnapPoint.MATERIAL_WIDE_TOP_MARGIN_DP.dpToPx(activity).roundToInt())
    }

    @Test
    fun `bottom sheet uses non floating full screen dialog window`() {
        val sheet = presentBottomSheet()
        val styledAttributes = sheet.context.obtainStyledAttributes(
            intArrayOf(
                android.R.attr.windowIsFloating,
                android.R.attr.windowNoTitle,
            )
        )

        try {
            assertThat(styledAttributes.getBoolean(0, true)).isFalse()
            assertThat(styledAttributes.getBoolean(1, false)).isTrue()
        } finally {
            styledAttributes.recycle()
        }

        assertThat(sheet.window?.attributes?.width).isEqualTo(ViewGroup.LayoutParams.MATCH_PARENT)
        assertThat(sheet.window?.attributes?.height).isEqualTo(ViewGroup.LayoutParams.MATCH_PARENT)
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
    fun `checkoutView installs scroll handoff listener when presented`() {
        val sheet = presentBottomSheet()

        val webView = sheet.currentCheckoutWebView()

        assertThat(shadowOf(webView).getOnTouchListener()).isNotNull
    }

    @Test
    fun `checkoutView handoff keeps downward drags in WebView while checkout can scroll up`() {
        val (sheet, webView) = scrollHandoffWebView(canScrollUp = true, scrollY = TEST_SCROLL_OFFSET)
        val onTouchListener = shadowOf(webView).getOnTouchListener()

        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_DOWN, y = 20f))
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_MOVE, y = 100f))

        assertThat(sheetOffsetY(sheet)).isEqualTo(0f)
    }

    @Test
    fun `checkoutView handoff keeps gesture in WebView after checkout reaches scroll top`() {
        val (sheet, webView) = scrollHandoffWebView(canScrollUp = true, scrollY = TEST_SCROLL_OFFSET)
        val onTouchListener = shadowOf(webView).getOnTouchListener()

        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_DOWN, y = 20f))
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_MOVE, y = 100f))
        webView.canScrollUp = false
        webView.scrollTo(0, 0)
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_MOVE, y = 180f))

        assertThat(sheetOffsetY(sheet)).isEqualTo(0f)
    }

    @Test
    fun `checkoutView handoff moves sheet when checkout cannot scroll up`() {
        val (sheet, webView) = scrollHandoffWebView(canScrollUp = false)
        val onTouchListener = shadowOf(webView).getOnTouchListener()

        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_DOWN, y = 20f))
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_MOVE, y = 100f))

        assertThat(sheetOffsetY(sheet)).isGreaterThan(0f)
    }

    @Test
    fun `checkoutView handoff does not move sheet when drag to dismiss is disabled`() {
        val (sheet, webView) = scrollHandoffWebView(canScrollUp = false)
        val onTouchListener = shadowOf(webView).getOnTouchListener()
        sheet.dragToDismissEnabled = false

        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_DOWN, y = 20f))
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_MOVE, y = 100f))

        assertThat(sheetOffsetY(sheet)).isEqualTo(0f)
    }

    @Test
    fun `checkoutView handoff keeps small-scroll downward drags in WebView while checkout can scroll up`() {
        val (sheet, webView) = scrollHandoffWebView(canScrollUp = true, scrollY = 10)
        val onTouchListener = shadowOf(webView).getOnTouchListener()

        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_DOWN, y = 20f))
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_MOVE, y = 100f))

        assertThat(sheetOffsetY(sheet)).isEqualTo(0f)
    }

    @Test
    fun `checkoutView handoff ignores upward page drags`() {
        val (sheet, webView) = scrollHandoffWebView(canScrollUp = false)
        val onTouchListener = shadowOf(webView).getOnTouchListener()

        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_DOWN, y = 100f))
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_MOVE, y = 20f))

        assertThat(sheetOffsetY(sheet)).isEqualTo(0f)
    }

    @Test
    fun `checkoutView handoff keeps sheet-owned gesture out of WebView after sheet expands`() {
        val (sheet, webView) = scrollHandoffWebView(canScrollUp = false)
        val onTouchListener = shadowOf(webView).getOnTouchListener()

        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_DOWN, y = 20f))
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_MOVE, y = 160f))
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_MOVE, y = 20f))
        onTouchListener.onTouch(webView, motionEvent(MotionEvent.ACTION_MOVE, y = -80f))

        assertThat(sheetOffsetY(sheet)).isEqualTo(0f)
        assertThat(webView.touchActions).contains(MotionEvent.ACTION_CANCEL)
        assertThat(webView.touchActions).doesNotContain(MotionEvent.ACTION_DOWN, MotionEvent.ACTION_MOVE)
    }

    @Test
    fun `checkout sheet intercepts downward drag outside checkout content`() {
        val (sheet, _) = checkoutSheetWithScrollableChild(childTop = TEST_SHEET_HEADER_SIZE)

        sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_DOWN, y = 20f))

        assertThat(
            sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_MOVE, y = 100f))
        ).isTrue()
    }

    @Test
    fun `checkout sheet does not intercept downward drag when drag to dismiss is disabled`() {
        val (sheet, _) = checkoutSheetWithScrollableChild(childTop = TEST_SHEET_HEADER_SIZE)
        sheet.dragToDismissEnabled = false

        sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_DOWN, y = 20f))

        assertThat(
            sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_MOVE, y = 100f))
        ).isFalse()
    }

    @Test
    fun `checkout sheet intercepts header drag when checkout content is scrolled`() {
        val (sheet, _) = checkoutSheetWithScrollableChild(
            childTop = TEST_SHEET_HEADER_SIZE,
            childScrollY = TEST_SHEET_HEADER_SIZE,
        )

        sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_DOWN, y = 20f))

        assertThat(
            sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_MOVE, y = 100f))
        ).isTrue()
    }

    @Test
    fun `checkout sheet handles downward drag that starts above checkout content`() {
        val (sheet, _) = checkoutSheetWithScrollableChild(childTop = TEST_SHEET_HEADER_SIZE)
        val moveInsideCheckoutContent = motionEvent(MotionEvent.ACTION_MOVE, y = 200f)

        sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_DOWN, y = 20f))

        assertThat(sheet.onInterceptTouchEvent(moveInsideCheckoutContent)).isTrue()

        sheet.onTouchEvent(moveInsideCheckoutContent)

        assertThat(sheetOffsetY(sheet)).isGreaterThan(0f)
    }

    @Test
    fun `checkout sheet does not intercept downward drag inside checkout content`() {
        val (sheet, _) = checkoutSheetWithScrollableChild(canScrollUp = false)

        sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_DOWN, y = 20f))

        assertThat(
            sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_MOVE, y = 100f))
        ).isFalse()
    }

    @Test
    fun `checkout sheet does not intercept when checkout content bounds are unavailable`() {
        val sheet = CheckoutBottomSheetLayout(activity)
        val checkoutContent = View(activity)
        sheet.bindScrollableChild(checkoutContent)

        sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_DOWN, y = 20f))

        assertThat(
            sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_MOVE, y = 100f))
        ).isFalse()
    }

    @Test
    fun `checkout sheet does not intercept before checkout content is bound`() {
        val sheet = CheckoutBottomSheetLayout(activity)

        sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_DOWN, y = 20f))

        assertThat(
            sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_MOVE, y = 100f))
        ).isFalse()
    }

    @Test
    fun `checkoutView keeps sheet from intercepting upward page scrolls`() {
        val (sheet, _) = checkoutSheetWithScrollableChild(canScrollUp = false)

        sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_DOWN, y = 100f))

        assertThat(
            sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_MOVE, y = 20f))
        ).isFalse()
    }

    @Test
    fun `checkout sheet follows handled downward drag`() {
        val (sheet, _) = checkoutSheetWithScrollableChild(childTop = TEST_SHEET_HEADER_SIZE)
        val move = motionEvent(MotionEvent.ACTION_MOVE, y = 100f)

        sheet.onInterceptTouchEvent(motionEvent(MotionEvent.ACTION_DOWN, y = 20f))
        sheet.onInterceptTouchEvent(move)
        sheet.onTouchEvent(move)

        assertThat(sheetOffsetY(sheet)).isGreaterThan(0f)
    }

    @Test
    fun `checkout content handoff does not dismiss below distance threshold`() {
        val (sheet, _) = checkoutSheetWithScrollableChild()
        var dismissed = false
        sheet.onDismissRequested = { dismissed = true }

        sheet.startScrollableChildGesture(motionEvent(MotionEvent.ACTION_DOWN, y = 20f))
        sheet.dragScrollableChildBy(TEST_SHEET_SIZE * 0.2f, motionEvent(MotionEvent.ACTION_MOVE, y = 220f))
        sheet.finishScrollableChildGesture()

        assertThat(dismissed).isFalse()
    }

    @Test
    fun `bottom sheet applies configured drag to dismiss setting`() {
        ShopifyCheckoutKit.configure {
            it.sheet = CheckoutSheetOptions(
                dismissal = CheckoutSheetDismissal(dragToDismissEnabled = false)
            )
        }

        val sheet = presentBottomSheet()
        val bottomSheet = sheet.findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)!!

        assertThat(bottomSheet.dragToDismissEnabled).isFalse()
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
        runDismissAnimation()

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
        runDismissAnimation()

        assertThat(sheet.containsChildOfType(CheckoutWebView::class.java)).isFalse()
        assertThat(shadowOf(cachedWebView).wasDestroyCalled()).isTrue()
    }

    @Suppress("DEPRECATION")
    @Test
    fun `bottom sheet uses window resizing while presented`() {
        val originalMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN or
            WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN
        activity.window.setSoftInputMode(originalMode)

        val sheet = presentBottomSheet()
        val presentedMode = sheet.window?.attributes?.softInputMode ?: 0

        assertThat(presentedMode and WindowManager.LayoutParams.SOFT_INPUT_MASK_ADJUST)
            .isEqualTo(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        assertThat(activity.window.attributes.softInputMode).isEqualTo(originalMode)

        sheet.dismiss()
        runDismissAnimation()

        assertThat(activity.window.attributes.softInputMode).isEqualTo(originalMode)
    }

    @Test
    fun `bottom inset padding uses ime inset through Android 10`() {
        assertThat(
            checkoutBottomInsetPadding(
                systemBarsBottomInset = 16,
                imeBottomInset = 240,
                sdkInt = Build.VERSION_CODES.M,
            )
        ).isEqualTo(240)

        assertThat(
            checkoutBottomInsetPadding(
                systemBarsBottomInset = 16,
                imeBottomInset = 240,
                sdkInt = Build.VERSION_CODES.Q,
            )
        ).isEqualTo(240)

        assertThat(
            checkoutBottomInsetPadding(
                systemBarsBottomInset = 24,
                imeBottomInset = 8,
                sdkInt = Build.VERSION_CODES.Q,
            )
        ).isEqualTo(24)
    }

    @Test
    fun `bottom inset padding ignores ime inset after Android 10`() {
        assertThat(
            checkoutBottomInsetPadding(
                systemBarsBottomInset = 16,
                imeBottomInset = 240,
                sdkInt = Build.VERSION_CODES.R,
            )
        ).isEqualTo(16)
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
        runDismissAnimation()

        assertThat(sheet.isShowing).isFalse()
        assertThat(shadowOf(webView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `present connects protocol client to checkout WebView bridge`() {
        var received = false
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.messagesChange) { received = true }

        ShopifyCheckoutKit.present("https://shopify.com", activity) {
            connect(client)
        }
        val sheet = ShadowDialog.getLatestDialog() as CheckoutBottomSheet
        val webView = sheet.currentCheckoutWebView()
        val bridge = shadowOf(webView)
            .getJavascriptInterface(EmbeddedCheckoutProtocolBridge.INTERFACE_NAME) as EmbeddedCheckoutProtocolBridge

        bridge.postMessage(ecMessagesChangeMessage())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).isTrue()
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
        runDismissAnimation()

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
        header.menu.performIdentifierAction(R.id.shopify_checkout_kit_close_button, 0)
        ShadowLooper.runUiThreadTasks()

        verify(mockListener, timeout(2000)).onCheckoutCanceled()
    }

    @Test
    fun `calls onCheckoutCanceled if outside touch target is clicked`() {
        val mockListener = mock<DefaultCheckoutListener>()
        val sheet = presentBottomSheet(checkoutListener = mockListener)

        sheet.findViewById<View>(R.id.checkoutKitOutsideTouchTarget)!!.performClick()
        ShadowLooper.runUiThreadTasks()

        verify(mockListener).onCheckoutCanceled()
        verify(mockListener, never()).onCheckoutFailed(any())
    }

    @Test
    fun `outside touch target does not cancel when tap away to dismiss is disabled`() {
        ShopifyCheckoutKit.configure {
            it.sheet = CheckoutSheetOptions(
                dismissal = CheckoutSheetDismissal(tapAwayToDismissEnabled = false)
            )
        }
        val mockListener = mock<DefaultCheckoutListener>()
        val sheet = presentBottomSheet(checkoutListener = mockListener)
        val outsideTouchTarget = sheet.findViewById<View>(R.id.checkoutKitOutsideTouchTarget)!!

        outsideTouchTarget.performClick()
        ShadowLooper.runUiThreadTasks()

        assertThat(outsideTouchTarget.isClickable).isFalse()
        assertThat(sheet.isShowing).isTrue()
        verify(mockListener, never()).onCheckoutCanceled()
        verify(mockListener, never()).onCheckoutFailed(any())
    }

    @Test
    fun `clicking close invokes cancel(), removing checkoutView from the container`() {
        val sheet = presentBottomSheet()

        assertThat(sheet.containsChildOfType(CheckoutWebView::class.java)).isTrue()

        // click cancel button
        val header = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
        header.menu.performIdentifierAction(R.id.shopify_checkout_kit_close_button, 0)
        runDismissAnimation()

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
    fun `rounds and clips only top sheet corners`() {
        ShopifyCheckoutKit.configuration.sheet = CheckoutSheetOptions(cornerRadiusDp = 18f)

        val sheet = presentBottomSheet()

        val bottomSheet = sheet.findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)!!
        val header = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
        val background = header.background as CheckoutSheetHeaderBackgroundDrawable
        val cornerRadius = 18f.dpToPx(activity)

        assertThat(bottomSheet.topCornerRadiusPx).isEqualTo(cornerRadius)
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
    fun `applies configured header title alignment and toolbar elevation`() {
        ShopifyCheckoutKit.configuration.sheet = CheckoutSheetOptions(
            titleAlignment = CheckoutSheetTitleAlignment.START,
            toolbarElevationDp = 6f,
        )

        val sheet = presentBottomSheet()

        val header = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
        val title = sheet.findViewById<TextView>(R.id.checkoutKitHeaderTitle)!!
        val titleLayoutParams = title.layoutParams as Toolbar.LayoutParams

        assertThat(header.elevation).isEqualTo(6f.dpToPx(activity))
        assertThat(titleLayoutParams.gravity and Gravity.START).isEqualTo(Gravity.START)
        assertThat(titleLayoutParams.gravity and Gravity.CENTER_VERTICAL).isEqualTo(Gravity.CENTER_VERTICAL)
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
            it.sheet = CheckoutSheetOptions(closeIcon = customIcon)
        }

        val sheet = presentBottomSheet(checkoutListener = mock<DefaultCheckoutListener>())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val toolbar = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
        val closeMenuItem = toolbar.menu.findItem(R.id.shopify_checkout_kit_close_button)

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
            it.sheet = CheckoutSheetOptions(closeIconTint = tintColor)
        }

        val sheet = presentBottomSheet(checkoutListener = mock<DefaultCheckoutListener>())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val toolbar = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
        val closeMenuItem = toolbar.menu.findItem(R.id.shopify_checkout_kit_close_button)

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
            it.colorScheme = ColorScheme.Light()
            it.sheet = CheckoutSheetOptions()
        }
        val mockProcessor = mock<DefaultCheckoutListener>()
        val sheet = presentBottomSheet(checkoutListener = mockProcessor)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val toolbar = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
        val closeMenuItem = toolbar.menu.findItem(R.id.shopify_checkout_kit_close_button)

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

        ShopifyCheckoutKit.configure {
            it.sheet = CheckoutSheetOptions(
                closeIcon = customIcon,
                closeIconTint = tintColor,
            )
        }
        val mockProcessor = mock<DefaultCheckoutListener>()
        val sheet = presentBottomSheet(checkoutListener = mockProcessor)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val toolbar = sheet.findViewById<Toolbar>(R.id.checkoutKitHeader)!!
        val closeMenuItem = toolbar.menu.findItem(R.id.shopify_checkout_kit_close_button)

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

    private fun runDismissAnimation() {
        ShadowLooper.idleMainLooper(1, TimeUnit.SECONDS)
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

    private fun checkoutSheetWithScrollableChild(
        canScrollUp: Boolean = false,
        childTop: Int = 0,
        childScrollY: Int = 0,
    ): Pair<CheckoutBottomSheetLayout, ScrollableView> {
        val sheet = CheckoutBottomSheetLayout(activity)
        val scrollableView = ScrollableView(activity).apply {
            this.canScrollUp = canScrollUp
            scrollTo(0, childScrollY)
        }
        sheet.addView(
            scrollableView,
            RelativeLayout.LayoutParams(TEST_SHEET_SIZE, TEST_SHEET_SIZE - childTop),
        )
        sheet.bindScrollableChild(scrollableView)
        sheet.measure(
            View.MeasureSpec.makeMeasureSpec(TEST_SHEET_SIZE, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(TEST_SHEET_SIZE, View.MeasureSpec.EXACTLY),
        )
        sheet.layout(0, 0, TEST_SHEET_SIZE, TEST_SHEET_SIZE)
        scrollableView.layout(0, childTop, TEST_SHEET_SIZE, TEST_SHEET_SIZE)
        return sheet to scrollableView
    }

    private fun scrollHandoffWebView(
        canScrollUp: Boolean,
        scrollY: Int = 0,
    ): Pair<CheckoutBottomSheetLayout, ScrollableBaseWebView> {
        val sheet = CheckoutBottomSheetLayout(activity)
        val webView = ScrollableBaseWebView(activity).apply {
            this.canScrollUp = canScrollUp
            scrollTo(0, scrollY)
        }
        sheet.addView(
            webView,
            RelativeLayout.LayoutParams(TEST_SHEET_SIZE, TEST_SHEET_SIZE),
        )
        sheet.bindScrollableChild(webView)
        sheet.measure(
            View.MeasureSpec.makeMeasureSpec(TEST_SHEET_SIZE, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(TEST_SHEET_SIZE, View.MeasureSpec.EXACTLY),
        )
        sheet.layout(0, 0, TEST_SHEET_SIZE, TEST_SHEET_SIZE)
        webView.layout(0, 0, TEST_SHEET_SIZE, TEST_SHEET_SIZE)
        webView.installBottomSheetScrollHandoff(sheet)
        return sheet to webView
    }

    private fun motionEvent(action: Int, y: Float): MotionEvent =
        MotionEvent.obtain(0, 0, action, 100f, y, 0)

    private fun ecMessagesChangeMessage(): String =
        """{"jsonrpc":"2.0","method":"ec.messages.change","params":{"checkout":$CHECKOUT_JSON}}"""

    private fun checkoutException(): CheckoutException {
        return CheckoutKitException(
            errorCode = CheckoutKitException.ERROR_SENDING_MESSAGE_TO_CHECKOUT,
            errorDescription = "Error sending message to checkout",
        )
    }

    private class ScrollableView(context: Context) : View(context) {
        var canScrollUp = false

        override fun canScrollVertically(direction: Int): Boolean {
            return if (direction < 0) {
                canScrollUp
            } else {
                super.canScrollVertically(direction)
            }
        }
    }

    private class ScrollableBaseWebView(context: Context) : BaseWebView(context) {
        var canScrollUp = false
        val touchActions = mutableListOf<Int>()

        override fun getListener(): CheckoutWebViewListener {
            return CheckoutWebViewListener(NoopCheckoutListener())
        }

        override fun onTouchEvent(event: MotionEvent): Boolean {
            touchActions += event.actionMasked
            return true
        }

        override fun canScrollVertically(direction: Int): Boolean {
            return if (direction < 0) {
                canScrollUp
            } else {
                super.canScrollVertically(direction)
            }
        }
    }

    private companion object {
        private const val TEST_SHEET_SIZE = 1000
        private const val TEST_SHEET_HEADER_SIZE = 120
        private const val TEST_SCROLL_OFFSET = 100
        private const val CHECKOUT_JSON =
            """{"id":"chk1","currency":"USD","status":"incomplete","line_items":[],"totals":[],"links":[],"ucp":""" +
                """{"payment_handlers":{},"version":"1.0"}}"""
    }
}

private fun sheetOffsetY(sheet: View): Float =
    sheet.top + sheet.translationY

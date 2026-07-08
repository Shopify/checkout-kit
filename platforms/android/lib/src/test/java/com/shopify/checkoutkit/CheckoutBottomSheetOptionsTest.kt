package com.shopify.checkoutkit

import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.view.MotionEvent
import android.view.View
import android.view.Window
import android.view.WindowManager
import android.widget.RelativeLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.view.WindowCompat
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.fail
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.android.controller.ActivityController
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowLooper

@RunWith(RobolectricTestRunner::class)
class CheckoutBottomSheetOptionsTest {

    private lateinit var activityController: ActivityController<ComponentActivity>
    private lateinit var activity: ComponentActivity
    private lateinit var initialConfiguration: Configuration
    private var presentedSheet: CheckoutBottomSheet? = null
    private val webMessageTransport = FakeWebMessageTransport()

    @Before
    fun setUp() {
        initialConfiguration = ShopifyCheckoutKit.getConfiguration()
        activityController = Robolectric.buildActivity(ComponentActivity::class.java)
        activity = activityController.get()
    }

    @After
    fun tearDown() {
        presentedSheet?.dismiss(animate = false)
        presentedSheet = null
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        ShopifyCheckoutKit.configure {
            it.appearance = initialConfiguration.appearance
            it.sheet = initialConfiguration.sheet
            it.preloading = initialConfiguration.preloading
            it.platform = initialConfiguration.platform
            it.logLevel = initialConfiguration.logLevel
        }
        if (::activityController.isInitialized) {
            activityController.close()
        }
    }

    @Test
    fun `default scrim color matches Material Components scrim color`() {
        val sheet = presentBottomSheet()
        val outsideTouchTarget = sheet.findViewById<View>(R.id.checkoutKitOutsideTouchTarget)!!

        assertThat(backgroundColor(outsideTouchTarget)).isEqualTo(MATERIAL_COMPONENTS_SCRIM_COLOR)
    }

    @Suppress("DEPRECATION")
    @Test
    fun `applies configured scrim color without platform window dim`() {
        val scrimColor = Color.SRGB(0x66010203)
        ShopifyCheckoutKit.configure {
            it.sheet = CheckoutSheetOptions(scrimColor = scrimColor)
        }

        val sheet = presentBottomSheet()

        val outsideTouchTarget = sheet.findViewById<View>(R.id.checkoutKitOutsideTouchTarget)!!
        val windowDimFlag = sheet.window!!.attributes.flags and WindowManager.LayoutParams.FLAG_DIM_BEHIND

        assertThat(backgroundColor(outsideTouchTarget)).isEqualTo(scrimColor.getValue(activity))
        assertThat(sheet.window!!.attributes.dimAmount).isEqualTo(0f)
        assertThat(windowDimFlag).isEqualTo(0)
    }

    @Suppress("DEPRECATION")
    @Config(sdk = [29])
    @Test
    fun `keeps transparent system bars with navigation contrast enforcement`() {
        val sheet = presentBottomSheet()

        assertThat(sheet.window!!.statusBarColor).isEqualTo(android.graphics.Color.TRANSPARENT)
        assertThat(sheet.window!!.navigationBarColor).isEqualTo(android.graphics.Color.TRANSPARENT)
        assertThat(sheet.window!!.isNavigationBarContrastEnforced).isTrue()
    }

    @Suppress("DEPRECATION")
    @Config(sdk = [29])
    @Test
    fun `uses dark navigation bar buttons over light checkout backgrounds`() {
        ShopifyCheckoutKit.configure {
            it.appearance = CheckoutAppearance.App(ColorScheme.Light())
        }

        val sheet = presentBottomSheet()

        assertThat(sheet.window!!.isAppearanceLightNavigationBars).isTrue()
        assertThat(sheet.window!!.navigationBarColor).isEqualTo(android.graphics.Color.TRANSPARENT)
    }

    @Config(sdk = [29])
    @Test
    fun `uses light navigation bar buttons over dark checkout backgrounds`() {
        ShopifyCheckoutKit.configure {
            it.appearance = CheckoutAppearance.App(ColorScheme.Dark())
        }

        val sheet = presentBottomSheet()

        assertThat(sheet.window!!.isAppearanceLightNavigationBars).isFalse()
    }

    @Suppress("DEPRECATION")
    @Config(sdk = [25])
    @Test
    fun `uses navigation bar scrim over light checkout backgrounds when dark nav buttons are unavailable`() {
        ShopifyCheckoutKit.configure {
            it.appearance = CheckoutAppearance.App(ColorScheme.Light())
        }

        val sheet = presentBottomSheet()

        assertThat(sheet.window!!.navigationBarColor).isEqualTo(LEGACY_LIGHT_BACKGROUND_NAVIGATION_BAR_COLOR)
    }

    @Test
    fun `disabling drag to dismiss keeps outside touch cancellation enabled`() {
        val listener = RecordingCheckoutListener()
        ShopifyCheckoutKit.configure {
            it.sheet = CheckoutSheetOptions(
                dismissal = CheckoutSheetDismissal(dragToDismissEnabled = false)
            )
        }

        val sheet = presentBottomSheet(checkoutListener = listener)
        val checkoutSheet = sheet.findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)!!

        assertThat(checkoutSheet.dragToDismissEnabled).isFalse()

        sheet.findViewById<View>(R.id.checkoutKitOutsideTouchTarget)!!.performClick()

        assertThat(listener.canceled).isTrue()
    }

    @Test
    fun `drag handle is hidden by default`() {
        val sheet = presentBottomSheet()
        val dragHandle = sheet.findViewById<View>(R.id.checkoutKitDragHandle)!!
        val title = sheet.findViewById<TextView>(R.id.checkoutKitHeaderTitle)!!
        val titleLayoutParams = title.layoutParams as Toolbar.LayoutParams

        assertThat(dragHandle.visibility).isEqualTo(View.GONE)
        assertThat(dragHandle.importantForAccessibility).isEqualTo(View.IMPORTANT_FOR_ACCESSIBILITY_NO)
        assertThat(dragHandle.isFocusable).isFalse()
        assertThat(dragHandle.isClickable).isFalse()
        assertThat(titleLayoutParams.topMargin).isEqualTo(0)
    }

    @Test
    fun `drag handle is visual only when enabled`() {
        ShopifyCheckoutKit.configure {
            it.sheet = CheckoutSheetOptions(dragHandle = CheckoutSheetDragHandle(visible = true))
        }

        val sheet = presentBottomSheet()
        val dragHandle = sheet.findViewById<View>(R.id.checkoutKitDragHandle)!!
        val title = sheet.findViewById<TextView>(R.id.checkoutKitHeaderTitle)!!
        val titleLayoutParams = title.layoutParams as Toolbar.LayoutParams

        assertThat(dragHandle.visibility).isEqualTo(View.VISIBLE)
        assertThat(dragHandle.layoutParams.width).isEqualTo(
            activity.resources.getDimensionPixelSize(R.dimen.checkout_sheet_drag_handle_width)
        )
        assertThat(dragHandle.layoutParams.height).isEqualTo(
            activity.resources.getDimensionPixelSize(R.dimen.checkout_sheet_drag_handle_height)
        )
        assertThat(dragHandle.importantForAccessibility).isEqualTo(View.IMPORTANT_FOR_ACCESSIBILITY_NO)
        assertThat(dragHandle.isFocusable).isFalse()
        assertThat(dragHandle.isClickable).isFalse()
        assertThat(dragHandle.background).isInstanceOf(GradientDrawable::class.java)
        assertThat(titleLayoutParams.topMargin).isEqualTo(
            activity.resources.getDimensionPixelSize(R.dimen.checkout_sheet_drag_handle_title_top_margin)
        )
    }

    @Test
    fun `drag handle applies configured color scheme color when provided`() {
        val customDragHandleColor = Color.SRGB(0xFF336699.toInt())
        ShopifyCheckoutKit.configure {
            it.appearance = CheckoutAppearance.App(
                colorScheme = ColorScheme.Light().customize {
                    dragHandleColor = customDragHandleColor
                },
            )
            it.sheet = CheckoutSheetOptions(dragHandle = CheckoutSheetDragHandle(visible = true))
        }

        val sheet = presentBottomSheet()
        val dragHandle = sheet.findViewById<View>(R.id.checkoutKitDragHandle)!!

        assertThat(dragHandle.background).isInstanceOf(GradientDrawable::class.java)
        assertThat(shadowOf(dragHandle.background as GradientDrawable).lastSetColor).isEqualTo(0x66336699)
    }

    @Test
    fun `drag handle remains hidden when drag to dismiss is disabled`() {
        ShopifyCheckoutKit.configure {
            it.sheet = CheckoutSheetOptions(
                dismissal = CheckoutSheetDismissal(dragToDismissEnabled = false),
                dragHandle = CheckoutSheetDragHandle(visible = true),
            )
        }

        val sheet = presentBottomSheet()
        val dragHandle = sheet.findViewById<View>(R.id.checkoutKitDragHandle)!!
        val title = sheet.findViewById<TextView>(R.id.checkoutKitHeaderTitle)!!
        val titleLayoutParams = title.layoutParams as Toolbar.LayoutParams

        assertThat(dragHandle.visibility).isEqualTo(View.GONE)
        assertThat(titleLayoutParams.topMargin).isEqualTo(0)
    }

    @Test
    fun `disabled drag to dismiss ignores sheet and checkout content drags`() {
        val (sheet, _) = checkoutSheetWithScrollableChild(childTop = TEST_SHEET_HEADER_SIZE)
        val down = motionEvent(MotionEvent.ACTION_DOWN, y = 20f)
        val move = motionEvent(MotionEvent.ACTION_MOVE, y = 100f)
        sheet.dragToDismissEnabled = false

        sheet.onInterceptTouchEvent(down)

        assertThat(sheet.onInterceptTouchEvent(move)).isFalse()

        sheet.onTouchEvent(move)
        sheet.startScrollableChildGesture(down)
        sheet.dragScrollableChildBy(TEST_SHEET_SIZE * 0.3f, move)

        assertThat(sheet.translationY).isEqualTo(0f)
    }

    private fun presentBottomSheet(
        checkoutUrl: String = "https://shopify.com",
        checkoutListener: CheckoutListener = noopDefaultCheckoutListener(),
    ): CheckoutBottomSheet =
        CheckoutBottomSheet(
            checkoutUrl,
            checkoutListener,
            activity,
            webMessageTransport = webMessageTransport,
        ).also { sheet ->
            presentedSheet = sheet
            sheet.start()
        }

    private fun backgroundColor(view: View): Int {
        return when (val background = view.background) {
            is ColorDrawable -> background.color
            else -> fail("Unsupported background type ${background::class.java}")
        }
    }

    private fun checkoutSheetWithScrollableChild(childTop: Int): Pair<CheckoutBottomSheetLayout, View> {
        val sheet = CheckoutBottomSheetLayout(activity)
        val scrollableView = View(activity)
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

    private fun motionEvent(action: Int, y: Float): MotionEvent =
        MotionEvent.obtain(0, 0, action, 100f, y, 0)

    private val Window.isAppearanceLightNavigationBars: Boolean
        get() = WindowCompat.getInsetsController(this, decorView).isAppearanceLightNavigationBars

    private class RecordingCheckoutListener : DefaultCheckoutListener() {
        var canceled = false

        override fun onCheckoutFailed(error: CheckoutException) = Unit

        override fun onCheckoutCanceled() {
            canceled = true
        }
    }

    private companion object {
        private const val TEST_SHEET_SIZE = 1000
        private const val TEST_SHEET_HEADER_SIZE = 120
        private const val MATERIAL_COMPONENTS_SCRIM_COLOR = 0x52000000
        private const val LEGACY_LIGHT_BACKGROUND_NAVIGATION_BAR_COLOR = 0x52000000
    }
}

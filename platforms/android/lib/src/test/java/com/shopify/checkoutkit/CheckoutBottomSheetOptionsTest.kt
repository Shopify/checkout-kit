package com.shopify.checkoutkit

import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.RelativeLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.appcompat.widget.Toolbar
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.fail
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowLooper

@RunWith(RobolectricTestRunner::class)
class CheckoutBottomSheetOptionsTest {

    private lateinit var activity: ComponentActivity
    private lateinit var initialConfiguration: Configuration

    @Before
    fun setUp() {
        initialConfiguration = ShopifyCheckoutKit.getConfiguration()
        activity = Robolectric.buildActivity(ComponentActivity::class.java).get()
    }

    @After
    fun tearDown() {
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        ShopifyCheckoutKit.configure {
            it.colorScheme = initialConfiguration.colorScheme
            it.sheet = initialConfiguration.sheet
            it.preloading = initialConfiguration.preloading
            it.platform = initialConfiguration.platform
            it.logLevel = initialConfiguration.logLevel
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

    @Test
    fun `disabling drag to dismiss keeps outside touch cancellation enabled`() {
        val listener = mock<DefaultCheckoutListener>()
        ShopifyCheckoutKit.configure {
            it.sheet = CheckoutSheetOptions(
                dismissal = CheckoutSheetDismissal(dragToDismissEnabled = false)
            )
        }

        val sheet = presentBottomSheet(checkoutListener = listener)
        val checkoutSheet = sheet.findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)!!

        assertThat(checkoutSheet.dragToDismissEnabled).isFalse()

        sheet.findViewById<View>(R.id.checkoutKitOutsideTouchTarget)!!.performClick()

        verify(listener).onCheckoutCanceled()
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
            it.colorScheme = ColorScheme.Light().customize {
                dragHandleColor = customDragHandleColor
            }
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
        CheckoutBottomSheet(checkoutUrl, checkoutListener, activity).also { sheet ->
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

    private companion object {
        private const val TEST_SHEET_SIZE = 1000
        private const val TEST_SHEET_HEADER_SIZE = 120
        private const val MATERIAL_COMPONENTS_SCRIM_COLOR = 0x52000000
    }
}

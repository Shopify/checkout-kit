package com.shopify.checkoutkit.checkout

import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.window.layout.FoldingFeature
import androidx.window.testing.layout.FoldingFeature
import androidx.window.testing.layout.TestWindowLayoutInfo
import androidx.window.testing.layout.WindowLayoutInfoPublisherRule
import com.shopify.checkoutkit.internal.preload.PreloadCache
import com.shopify.checkoutkit.internal.presentation.CheckoutBottomSheet
import com.shopify.checkoutkit.internal.presentation.CheckoutBottomSheetLayout
import com.shopify.checkoutkit.internal.presentation.SheetHorizontalPlacement
import com.shopify.checkoutkit.internal.presentation.separatingVerticalFold
import com.shopify.checkoutkit.internal.presentation.startSidePlacement
import com.shopify.checkoutkit.internal.web.CheckoutWebView
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowLooper

@RunWith(RobolectricTestRunner::class)
@Config(qualifiers = "w800dp-h880dp-mdpi")
class CheckoutBottomSheetFoldTest {

    @get:Rule
    val windowLayoutInfoPublisher = WindowLayoutInfoPublisherRule()

    private lateinit var activity: ComponentActivity
    private val webMessageTransport = FakeWebMessageTransport()

    @Before
    fun setUp() {
        activity = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
    }

    @After
    fun tearDown() {
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().idle()
        CheckoutWebView.cacheClock = PreloadCache.Clock()
    }

    @Test
    fun `sheet moves to the start side of a half opened vertical fold`() {
        val sheet = presentBottomSheet()

        publishFold(FoldingFeature.State.HALF_OPENED, FoldingFeature.Orientation.VERTICAL)

        assertSheetPlacement(sheet, gravity = Gravity.BOTTOM or Gravity.LEFT, width = 400, leftMargin = 0)
    }

    @Test
    fun `sheet returns to the center when the fold opens flat`() {
        val sheet = presentBottomSheet()
        publishFold(FoldingFeature.State.HALF_OPENED, FoldingFeature.Orientation.VERTICAL)

        publishFold(FoldingFeature.State.FLAT, FoldingFeature.Orientation.VERTICAL)

        assertSheetCentered(sheet)
    }

    @Test
    fun `sheet stays centered for a horizontal fold`() {
        val sheet = presentBottomSheet()

        publishFold(FoldingFeature.State.HALF_OPENED, FoldingFeature.Orientation.HORIZONTAL)

        assertSheetCentered(sheet)
    }

    @Test
    fun `only a separating vertical fold is used for placement`() {
        val bookFold = fold(FoldingFeature.State.HALF_OPENED, FoldingFeature.Orientation.VERTICAL)
        val tabletopFold = fold(FoldingFeature.State.HALF_OPENED, FoldingFeature.Orientation.HORIZONTAL)
        val flatFold = fold(FoldingFeature.State.FLAT, FoldingFeature.Orientation.VERTICAL)

        assertThat(TestWindowLayoutInfo(listOf(bookFold)).separatingVerticalFold()).isEqualTo(bookFold)
        assertThat(TestWindowLayoutInfo(listOf(tabletopFold)).separatingVerticalFold()).isNull()
        assertThat(TestWindowLayoutInfo(listOf(flatFold)).separatingVerticalFold()).isNull()
    }

    @Test
    fun `start side placement fills the start side up to the maximum width`() {
        assertThat(
            startSidePlacement(parentWidth = 2076, foldLeft = 1038, foldRight = 1038, isRtl = false, maxWidthPx = 1560)
        )
            .isEqualTo(SheetHorizontalPlacement(left = 0, width = 1038))
        assertThat(
            startSidePlacement(parentWidth = 2000, foldLeft = 900, foldRight = 1100, isRtl = true, maxWidthPx = 1560)
        )
            .isEqualTo(SheetHorizontalPlacement(left = 1100, width = 900))
    }

    @Test
    fun `start side placement centers a capped sheet on the start side`() {
        assertThat(
            startSidePlacement(parentWidth = 2400, foldLeft = 1200, foldRight = 1200, isRtl = false, maxWidthPx = 800)
        )
            .isEqualTo(SheetHorizontalPlacement(left = 200, width = 800))
        assertThat(
            startSidePlacement(parentWidth = 2400, foldLeft = 1200, foldRight = 1200, isRtl = true, maxWidthPx = 800)
        )
            .isEqualTo(SheetHorizontalPlacement(left = 1400, width = 800))
    }

    @Test
    fun `start side placement is null when the start side has no width`() {
        assertThat(startSidePlacement(parentWidth = 1000, foldLeft = 0, foldRight = 0, isRtl = false, maxWidthPx = 800))
            .isNull()
        assertThat(
            startSidePlacement(parentWidth = 1000, foldLeft = 1000, foldRight = 1200, isRtl = true, maxWidthPx = 800)
        )
            .isNull()
    }

    private fun fold(state: FoldingFeature.State, orientation: FoldingFeature.Orientation): FoldingFeature =
        FoldingFeature(activity = activity, state = state, orientation = orientation)

    private fun publishFold(state: FoldingFeature.State, orientation: FoldingFeature.Orientation) {
        windowLayoutInfoPublisher.overrideWindowLayoutInfo(TestWindowLayoutInfo(listOf(fold(state, orientation))))
        ShadowLooper.shadowMainLooper().idle()
    }

    private fun assertSheetPlacement(sheet: CheckoutBottomSheet, gravity: Int, width: Int, leftMargin: Int) {
        val params = sheetLayoutParams(sheet)
        assertThat(params.gravity).isEqualTo(gravity)
        assertThat(params.width).isEqualTo(width)
        assertThat(params.leftMargin).isEqualTo(leftMargin)
    }

    private fun assertSheetCentered(sheet: CheckoutBottomSheet) {
        assertSheetPlacement(
            sheet,
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL,
            width = ViewGroup.LayoutParams.MATCH_PARENT,
            leftMargin = 0,
        )
    }

    private fun sheetLayoutParams(sheet: CheckoutBottomSheet): FrameLayout.LayoutParams =
        sheet.findViewById<CheckoutBottomSheetLayout>(R.id.checkout_sheet)!!.layoutParams as FrameLayout.LayoutParams

    private fun presentBottomSheet(): CheckoutBottomSheet =
        CheckoutBottomSheet(
            "https://shopify.com",
            noopDefaultCheckoutListener(),
            activity,
            null,
            webMessageTransport,
        ).also { sheet ->
            sheet.start()
            ShadowLooper.shadowMainLooper().idle()
        }
}

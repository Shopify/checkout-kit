package com.shopify.checkoutkit.checkout
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.ActivityInfo
import android.content.res.Configuration.UI_MODE_NIGHT_MASK
import android.content.res.Configuration.UI_MODE_NIGHT_NO
import android.content.res.Configuration.UI_MODE_NIGHT_YES
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.RelativeLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.OnConfigurationChangedProvider
import androidx.core.util.Consumer
import androidx.core.view.WindowCompat
import androidx.core.view.children
import com.shopify.checkoutkit.internal.presentation.CheckoutBottomSheet
import com.shopify.checkoutkit.internal.presentation.CheckoutSheetHeaderBackgroundDrawable
import com.shopify.checkoutkit.internal.presentation.dpToPx
import com.shopify.checkoutkit.internal.web.CheckoutWebView
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.fail
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.android.controller.ActivityController
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import org.robolectric.shadows.ShadowDialog
import org.robolectric.shadows.ShadowLooper
import android.content.res.Configuration as AndroidConfiguration
import com.shopify.checkoutkit.checkout.test.R as TestR

/**
 * Covers system night mode changes while checkout is open, for a host activity that declares `uiMode` in
 * `android:configChanges`.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [29])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class CheckoutThemeChangeTest {

    private lateinit var activityController: ActivityController<ComponentActivity>
    private lateinit var activity: ComponentActivity
    private lateinit var initialConfiguration: Configuration
    private var plainActivityController: ActivityController<Activity>? = null
    private var presentedCheckout: CheckoutHandle? = null
    private val webMessageTransport = FakeWebMessageTransport()

    @Before
    fun setUp() {
        initialConfiguration = ShopifyCheckout.getConfiguration()
        val application = RuntimeEnvironment.getApplication()
        listOf(ComponentActivity::class.java, Activity::class.java).forEach { activityClass ->
            shadowOf(application.packageManager).addOrUpdateActivity(
                ActivityInfo().apply {
                    name = activityClass.name
                    packageName = application.packageName
                    configChanges = ActivityInfo.CONFIG_UI_MODE
                }
            )
        }
        activityController = Robolectric.buildActivity(ComponentActivity::class.java).setup()
        activity = activityController.get()
    }

    @After
    fun tearDown() {
        presentedCheckout?.dismiss()
        presentedCheckout = null
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        ShopifyCheckout.configure {
            it.appearance = initialConfiguration.appearance
            it.sheet = initialConfiguration.sheet
        }
        plainActivityController?.close()
        activityController.close()
    }

    @Test
    @Config(qualifiers = "notnight")
    fun `automatic sheet applies dark colors when the system switches to dark while open`() {
        configureSheet(CheckoutAppearance.App(automaticScheme()))
        val listener = mock<DefaultCheckoutListener>()
        val sheet = presentSheet(listener)
        val webView = sheet.currentWebView()
        assertSheetColors(sheet, LIGHT_COLORS, lightNavigationBars = true)

        changeNightMode(activityController, night = true)

        assertSheetColors(sheet, DARK_COLORS, lightNavigationBars = false)
        assertSheetStaysOpen(sheet, webView)
        verify(listener, never()).onCheckoutDismissed()
    }

    @Test
    @Config(qualifiers = "night")
    fun `automatic sheet applies light colors when the system switches to light while open`() {
        configureSheet(CheckoutAppearance.App(automaticScheme()))
        val listener = mock<DefaultCheckoutListener>()
        val sheet = presentSheet(listener)
        val webView = sheet.currentWebView()
        assertSheetColors(sheet, DARK_COLORS, lightNavigationBars = false)

        changeNightMode(activityController, night = false)

        assertSheetColors(sheet, LIGHT_COLORS, lightNavigationBars = true)
        assertSheetStaysOpen(sheet, webView)
        verify(listener, never()).onCheckoutDismissed()
    }

    @Test
    @Config(qualifiers = "notnight")
    fun `automatic sheet follows repeated system theme changes`() {
        configureSheet(CheckoutAppearance.App(automaticScheme()))
        val sheet = presentSheet()

        changeNightMode(activityController, night = true)
        changeNightMode(activityController, night = false)

        assertSheetColors(sheet, LIGHT_COLORS, lightNavigationBars = true)
    }

    @Test
    @Config(qualifiers = "notnight")
    fun `automatic sheet resolves night resources when the host updates them after notifying listeners`() {
        configureSheet(
            CheckoutAppearance.App(ColorScheme.Automatic(lightColors = RESOURCE_COLORS, darkColors = RESOURCE_COLORS))
        )
        val sheet = presentSheet()
        assertSheetColors(sheet, RESOURCE_COLORS, lightNavigationBars = true)
        assertThat(backgroundColor(sheet.findViewById(R.id.checkout_header)!!)).isEqualTo(0xFFF0F0F0.toInt())

        changeNightModeInAppCompatOrder(night = true)

        assertSheetColors(sheet, RESOURCE_COLORS, lightNavigationBars = false)
        assertThat(backgroundColor(sheet.findViewById(R.id.checkout_header)!!)).isEqualTo(0xFF202020.toInt())

        changeNightModeInAppCompatOrder(night = false)

        assertSheetColors(sheet, RESOURCE_COLORS, lightNavigationBars = true)
        assertThat(backgroundColor(sheet.findViewById(R.id.checkout_header)!!)).isEqualTo(0xFFF0F0F0.toInt())
    }

    @Test
    @Config(qualifiers = "notnight")
    fun `light scheme keeps its colors when the system switches to dark`() {
        configureSheet(CheckoutAppearance.App(ColorScheme.Light(LIGHT_COLORS)))
        val sheet = presentSheet()

        changeNightMode(activityController, night = true)

        assertSheetColors(sheet, LIGHT_COLORS, lightNavigationBars = true)
    }

    @Test
    @Config(qualifiers = "night")
    fun `dark scheme keeps its colors and custom icon tint when the system switches to light`() {
        configureSheet(CheckoutAppearance.App(ColorScheme.Dark(DARK_COLORS)))
        val sheet = presentSheet()
        assertSheetColors(sheet, DARK_COLORS, lightNavigationBars = false)

        changeNightMode(activityController, night = false)

        assertSheetColors(sheet, DARK_COLORS, lightNavigationBars = false)
    }

    @Test
    @Config(qualifiers = "notnight")
    fun `storefront appearance keeps its colors when the system switches to dark`() {
        configureSheet(
            CheckoutAppearance.Storefront().customize {
                webViewBackgroundColor = LIGHT_COLORS.webViewBackgroundColor
                headerBackgroundColor = LIGHT_COLORS.headerBackgroundColor
                headerTitleColor = LIGHT_COLORS.headerTitleColor
                progressIndicatorColor = LIGHT_COLORS.progressIndicatorColor
                closeIconTintColor = LIGHT_COLORS.closeIconTintColor
                dragHandleColor = LIGHT_COLORS.dragHandleColor
                headerBorderColor = LIGHT_COLORS.headerBorderColor
            }
        )
        val sheet = presentSheet()

        changeNightMode(activityController, night = true)

        assertSheetColors(sheet, LIGHT_COLORS, lightNavigationBars = true)
    }

    @Test
    @Config(qualifiers = "notnight")
    fun `embedded automatic checkout applies dark colors when the system switches to dark`() {
        ShopifyCheckout.configure { it.appearance = CheckoutAppearance.App(automaticScheme()) }
        val view = embeddedCheckout(activity)
        val webView = view.currentWebView()
        assertCheckoutColors(view, LIGHT_COLORS)

        changeNightMode(activityController, night = true)

        assertCheckoutColors(view, DARK_COLORS)
        assertThat(view.findViewById<Toolbar>(R.id.checkout_header).background).isInstanceOf(ColorDrawable::class.java)
        assertEmbeddedWebViewKept(view, webView)
    }

    @Test
    @Config(qualifiers = "night")
    fun `embedded automatic checkout applies light colors when the system switches to light`() {
        ShopifyCheckout.configure { it.appearance = CheckoutAppearance.App(automaticScheme()) }
        val view = embeddedCheckout(activity)
        val webView = view.currentWebView()
        assertCheckoutColors(view, DARK_COLORS)

        changeNightMode(activityController, night = false)

        assertCheckoutColors(view, LIGHT_COLORS)
        assertEmbeddedWebViewKept(view, webView)
    }

    @Test
    @Config(qualifiers = "notnight")
    fun `embedded light checkout keeps its colors when the system switches to dark`() {
        ShopifyCheckout.configure { it.appearance = CheckoutAppearance.App(ColorScheme.Light(LIGHT_COLORS)) }
        val view = embeddedCheckout(activity)

        changeNightMode(activityController, night = true)

        assertCheckoutColors(view, LIGHT_COLORS)
    }

    @Test
    @Config(qualifiers = "notnight")
    fun `embedded automatic checkout in a plain activity follows system theme changes`() {
        ShopifyCheckout.configure { it.appearance = CheckoutAppearance.App(automaticScheme()) }
        val controller = Robolectric.buildActivity(Activity::class.java).setup()
        plainActivityController = controller
        val view = embeddedCheckout(controller.get())
        val webView = view.currentWebView()
        assertCheckoutColors(view, LIGHT_COLORS)

        changeNightMode(controller, night = true)

        assertCheckoutColors(view, DARK_COLORS)
        assertEmbeddedWebViewKept(view, webView)

        changeNightMode(controller, night = false)

        assertCheckoutColors(view, LIGHT_COLORS)
        assertEmbeddedWebViewKept(view, webView)
    }

    @Test
    @Config(qualifiers = "notnight")
    fun `embedded checkout ignores a queued theme change after destroy`() {
        ShopifyCheckout.configure { it.appearance = CheckoutAppearance.App(automaticScheme()) }
        val context = ListenerCountingContext(activity)
        val view = embeddedCheckout(activity, context)
        val changes = mutableListOf<Boolean>()
        view.onThemeColorsChanged = { changes += it }
        val title = view.findViewById<TextView>(R.id.checkout_header_title)
        assertThat(context.listenerCount).isEqualTo(1)

        reportNightModeInAppCompatOrder(night = true)
        view.destroy()
        ShadowLooper.shadowMainLooper().idle()

        assertThat(changes).isEmpty()
        assertThat(title.currentTextColor).isEqualTo(LIGHT_COLORS.headerTitleColor.getValue(activity))
        assertThat(context.listenerCount).isZero()
    }

    @Test
    @Config(qualifiers = "notnight")
    fun `embedded automatic checkout catches up with a theme change made while detached`() {
        ShopifyCheckout.configure { it.appearance = CheckoutAppearance.App(automaticScheme()) }
        val context = ListenerCountingContext(activity)
        val view = embeddedCheckout(activity, context)
        val changes = mutableListOf<Boolean>()
        view.onThemeColorsChanged = { changes += it }
        assertThat(context.listenerCount).isEqualTo(1)

        activity.setContentView(FrameLayout(activity))
        assertThat(context.listenerCount).isZero()

        changeNightMode(activityController, night = true)
        assertThat(changes).isEmpty()
        assertCheckoutColors(view, LIGHT_COLORS)

        activity.setContentView(view)
        ShadowLooper.shadowMainLooper().idle()

        assertThat(context.listenerCount).isEqualTo(1)
        assertCheckoutColors(view, DARK_COLORS)
        assertThat(changes).containsExactly(true)

        changeNightMode(activityController, night = false)

        assertCheckoutColors(view, LIGHT_COLORS)
        assertThat(changes).containsExactly(true, false)
        assertThat(context.listenerCount).isEqualTo(1)
    }

    private fun configureSheet(appearance: CheckoutAppearance) {
        ShopifyCheckout.configure {
            it.appearance = appearance
            it.sheet = CheckoutSheetOptions(
                cornerRadiusDp = SHEET_CORNER_RADIUS_DP,
                dragHandle = CheckoutSheetDragHandle(visible = true),
            )
        }
    }

    private fun automaticScheme(): ColorScheme =
        ColorScheme.Automatic(lightColors = LIGHT_COLORS, darkColors = DARK_COLORS)

    private fun presentSheet(listener: DefaultCheckoutListener = noopDefaultCheckoutListener()): CheckoutBottomSheet {
        presentedCheckout = CheckoutService.present(
            CHECKOUT_URL,
            activity,
            listener,
            webMessageTransport = webMessageTransport,
        )
        return ShadowDialog.getLatestDialog() as CheckoutBottomSheet
    }

    private fun embeddedCheckout(host: Activity, context: Context = host): ShopifyCheckout {
        val view = ShopifyCheckout(
            checkoutUrl = CHECKOUT_URL,
            context = context,
            webMessageTransport = webMessageTransport,
            hostConfiguration = CheckoutHostConfiguration(
                listener = noopDefaultCheckoutListener(),
                protocolClient = null,
                onDismissRequest = {},
                onFailure = {},
                reportInitializationFailure = false,
            ),
        )
        host.setContentView(view)
        return view
    }

    private fun nightConfiguration(host: Activity, night: Boolean): AndroidConfiguration =
        AndroidConfiguration(host.resources.configuration).apply {
            uiMode = (uiMode and UI_MODE_NIGHT_MASK.inv()) or if (night) UI_MODE_NIGHT_YES else UI_MODE_NIGHT_NO
        }

    /**
     * Changes the system night mode for a host that handles `uiMode` itself.
     *
     * The activity keeps running and receives `onConfigurationChanged`. Robolectric reports the change to the
     * activity's own window only, so a sheet's dialog window gets no view callback.
     */
    private fun <T : Activity> changeNightMode(controller: ActivityController<T>, night: Boolean) {
        val host = controller.get()
        val recreatedActivity = controller.configurationChange(nightConfiguration(host, night)).get()
        assertThat(recreatedActivity).isSameAs(host)
        ShadowLooper.shadowMainLooper().idle()
    }

    /**
     * Changes the night mode in the order an `AppCompatActivity` that handles `uiMode` uses: it notifies its
     * configuration listeners first, then its delegate calls `Resources.updateConfiguration` with the new night
     * mode, in the same main thread message. Robolectric's `AppCompatActivity` updates its resources before the
     * listeners, so this test drives the order directly.
     */
    private fun changeNightModeInAppCompatOrder(night: Boolean) {
        reportNightModeInAppCompatOrder(night)
        ShadowLooper.shadowMainLooper().idle()
    }

    /**
     * Reports a night mode change in `AppCompatActivity` order, like [changeNightModeInAppCompatOrder], but
     * does not run the main thread work that the change posts.
     */
    @Suppress("DEPRECATION")
    private fun reportNightModeInAppCompatOrder(night: Boolean) {
        val newConfiguration = nightConfiguration(activity, night)
        activity.onConfigurationChanged(newConfiguration)
        activity.resources.updateConfiguration(newConfiguration, activity.resources.displayMetrics)
    }

    private fun assertSheetColors(sheet: CheckoutBottomSheet, colors: Colors, lightNavigationBars: Boolean) {
        val checkoutView = sheet.findViewById<ViewGroup>(R.id.checkout_view_container)!!
            .children.first { it is ShopifyCheckout } as ShopifyCheckout
        assertCheckoutColors(checkoutView, colors)

        val header = sheet.findViewById<Toolbar>(R.id.checkout_header)!!
        val headerBackground = header.background as CheckoutSheetHeaderBackgroundDrawable
        val cornerRadius = SHEET_CORNER_RADIUS_DP.dpToPx(activity)
        assertThat(headerBackground.appliedCornerRadii)
            .containsExactly(cornerRadius, cornerRadius, cornerRadius, cornerRadius, 0f, 0f, 0f, 0f)

        val dragHandle = sheet.findViewById<View>(R.id.checkout_drag_handle)!!
        assertThat(dragHandle.visibility).isEqualTo(View.VISIBLE)
        assertThat((dragHandle.background as GradientDrawable).color?.defaultColor)
            .isEqualTo(dragHandleColorWithAlpha(colors.dragHandleColor!!.getValue(activity)))

        val window = sheet.window!!
        assertThat(WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightNavigationBars)
            .isEqualTo(lightNavigationBars)
    }

    private fun assertCheckoutColors(view: ShopifyCheckout, colors: Colors) {
        val context = view.context
        val header = view.findViewById<Toolbar>(R.id.checkout_header)
        val title = view.findViewById<TextView>(R.id.checkout_header_title)
        val webViewBackground = colors.webViewBackgroundColor.getValue(context)

        assertThat(backgroundColor(header)).isEqualTo(colors.headerBackgroundColor.getValue(context))
        assertThat(title.currentTextColor).isEqualTo(colors.headerTitleColor.getValue(context))
        assertThat(backgroundColor(view.findViewById(R.id.checkout_container))).isEqualTo(webViewBackground)
        assertThat(backgroundColor(view.findViewById(R.id.checkout_loading_background))).isEqualTo(webViewBackground)
        assertThat(shadowOf(view.currentWebView()).backgroundColor).isEqualTo(webViewBackground)
        assertThat(view.webViewBackgroundColor).isEqualTo(webViewBackground)
        assertThat(backgroundColor(view.findViewById(R.id.checkout_header_border)))
            .isEqualTo(colors.headerBorderColor!!.getValue(context))
        assertThat(view.findViewById<ProgressBar>(R.id.checkout_progress_bar).progressTintList?.defaultColor)
            .isEqualTo(colors.progressIndicatorColor.getValue(context))

        val closeIcon = header.menu.findItem(R.id.checkout_close_button).icon!!
        assertThat(renderedColor(closeIcon)).isEqualTo(expectedCloseIconColor(context, colors))
    }

    /**
     * The custom test icon draws in its own tint. The default icon draws in the configured tint.
     */
    private fun expectedCloseIconColor(context: Context, colors: Colors): Int = when (colors.closeIcon?.id) {
        null -> colors.closeIconTintColor!!.getValue(context)
        TestR.drawable.checkout_test_tinted_close -> TINTED_CLOSE_ICON_COLOR
        else -> fail("No expected color for close icon ${colors.closeIcon}")
    }

    /**
     * Draws the icon and returns the color of its most opaque pixel.
     */
    private fun renderedColor(drawable: Drawable): Int {
        val bitmap = Bitmap.createBitmap(ICON_RENDER_SIZE_PX, ICON_RENDER_SIZE_PX, Bitmap.Config.ARGB_8888)
        val bounds = drawable.copyBounds()
        drawable.setBounds(0, 0, ICON_RENDER_SIZE_PX, ICON_RENDER_SIZE_PX)
        drawable.draw(Canvas(bitmap))
        drawable.bounds = bounds
        val pixels = IntArray(ICON_RENDER_SIZE_PX * ICON_RENDER_SIZE_PX)
        bitmap.getPixels(pixels, 0, ICON_RENDER_SIZE_PX, 0, 0, ICON_RENDER_SIZE_PX, ICON_RENDER_SIZE_PX)
        val pixel = pixels.maxByOrNull { android.graphics.Color.alpha(it) } ?: fail("Icon has no pixels")
        assertThat(android.graphics.Color.alpha(pixel)).isEqualTo(OPAQUE_ALPHA)
        return pixel
    }

    private fun assertSheetStaysOpen(sheet: CheckoutBottomSheet, webView: CheckoutWebView) {
        assertThat(sheet.isShowing).isTrue()
        assertThat(sheet.currentWebView()).isSameAs(webView)
        assertThat(shadowOf(webView).wasDestroyCalled()).isFalse()
        assertThat(shadowOf(webView).reloadInvocations).isZero()
    }

    private fun assertEmbeddedWebViewKept(view: ShopifyCheckout, webView: CheckoutWebView) {
        assertThat(view.currentWebView()).isSameAs(webView)
        assertThat(shadowOf(webView).wasDestroyCalled()).isFalse()
        assertThat(shadowOf(webView).reloadInvocations).isZero()
    }

    private fun backgroundColor(view: View): Int = when (val background = view.background) {
        is ColorDrawable -> background.color
        is CheckoutSheetHeaderBackgroundDrawable -> background.fillColor
        else -> fail("Unsupported background type ${background::class.java}")
    }

    private fun dragHandleColorWithAlpha(color: Int): Int {
        val alpha = (android.graphics.Color.alpha(color) * DRAG_HANDLE_ALPHA).toInt()
        return android.graphics.Color.argb(
            alpha,
            android.graphics.Color.red(color),
            android.graphics.Color.green(color),
            android.graphics.Color.blue(color),
        )
    }

    private fun CheckoutBottomSheet.currentWebView(): CheckoutWebView =
        findViewById<RelativeLayout>(R.id.checkout_container)!!
            .children.first { it is CheckoutWebView } as CheckoutWebView

    private fun ShopifyCheckout.currentWebView(): CheckoutWebView =
        findViewById<RelativeLayout>(R.id.checkout_container)
            .children.first { it is CheckoutWebView } as CheckoutWebView

    private companion object {
        private const val CHECKOUT_URL = "https://shopify.com/checkouts/c/abc"
        private const val SHEET_CORNER_RADIUS_DP = 18f
        private const val DRAG_HANDLE_ALPHA = 0.4f
        private const val ICON_RENDER_SIZE_PX = 96
        private const val OPAQUE_ALPHA = 255
        private const val TINTED_CLOSE_ICON_COLOR = 0xFF00AA00.toInt()

        private val LIGHT_COLORS = Colors(
            webViewBackgroundColor = Color.SRGB(0xFFFAFAFA.toInt()),
            headerBackgroundColor = Color.SRGB(0xFFF0F0F0.toInt()),
            headerTitleColor = Color.SRGB(0xFF101010.toInt()),
            progressIndicatorColor = Color.SRGB(0xFF1773B0.toInt()),
            closeIconTintColor = Color.SRGB(0xFF404040.toInt()),
            dragHandleColor = Color.SRGB(0xFF336699.toInt()),
            headerBorderColor = Color.SRGB(0xFFE1E3E5.toInt()),
        )

        private val DARK_COLORS = Colors(
            webViewBackgroundColor = Color.SRGB(0xFF121212.toInt()),
            headerBackgroundColor = Color.SRGB(0xFF202020.toInt()),
            headerTitleColor = Color.SRGB(0xFFF5F5F5.toInt()),
            progressIndicatorColor = Color.SRGB(0xFF1E8CC8.toInt()),
            closeIcon = DrawableResource(TestR.drawable.checkout_test_tinted_close),
            dragHandleColor = Color.SRGB(0xFF99CCFF.toInt()),
            headerBorderColor = Color.SRGB(0xFF454545.toInt()),
        )

        /** One palette for both themes; each color has a `values-night` variant in the test resources. */
        private val RESOURCE_COLORS = Colors(
            webViewBackgroundColor = Color.ResourceId(TestR.color.checkout_test_web_view_background),
            headerBackgroundColor = Color.ResourceId(TestR.color.checkout_test_header_background),
            headerTitleColor = Color.ResourceId(TestR.color.checkout_test_header_font),
            progressIndicatorColor = Color.ResourceId(TestR.color.checkout_test_progress_indicator),
            closeIconTintColor = Color.ResourceId(TestR.color.checkout_test_close_icon_tint),
            dragHandleColor = Color.ResourceId(TestR.color.checkout_test_drag_handle),
            headerBorderColor = Color.ResourceId(TestR.color.checkout_test_header_border),
        )
    }
}

/**
 * Wraps the host activity and counts the configuration listeners that checkout registers on it. It forwards each
 * listener to the activity, so the activity still notifies it.
 */
private class ListenerCountingContext(private val host: ComponentActivity) :
    ContextWrapper(host),
    OnConfigurationChangedProvider {

    private val listeners = mutableListOf<Consumer<AndroidConfiguration>>()

    val listenerCount: Int
        get() = listeners.size

    override fun addOnConfigurationChangedListener(listener: Consumer<AndroidConfiguration>) {
        listeners += listener
        host.addOnConfigurationChangedListener(listener)
    }

    override fun removeOnConfigurationChangedListener(listener: Consumer<AndroidConfiguration>) {
        listeners -= listener
        host.removeOnConfigurationChangedListener(listener)
    }
}

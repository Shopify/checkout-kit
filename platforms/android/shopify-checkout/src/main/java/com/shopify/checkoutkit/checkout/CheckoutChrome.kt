package com.shopify.checkoutkit.checkout
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Build
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MenuItem
import android.view.View
import android.view.View.INVISIBLE
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.widget.ProgressBar
import android.widget.RelativeLayout
import android.widget.TextView
import androidx.annotation.ColorInt
import androidx.appcompat.content.res.AppCompatResources
import androidx.appcompat.widget.Toolbar
import androidx.core.graphics.drawable.DrawableCompat
import androidx.core.graphics.drawable.toDrawable
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.shopify.checkoutkit.internal.presentation.dpToPx
import com.shopify.checkoutkit.internal.presentation.roundedTopCornerDrawable
import com.shopify.checkoutkit.internal.presentation.showsDragHandle
import com.shopify.checkoutkit.internal.web.CheckoutWebView
import com.shopify.checkoutkit.internal.web.removeFromParent

/**
 * Draws the checkout chrome inside [root]: the header, title, close button, header border, progress bar,
 * loading background, and the container that holds the checkout WebView.
 *
 * It applies the [colorScheme] colors for one theme at a time. [applyTheme] switches the theme.
 */
internal class CheckoutChrome(
    private val root: ViewGroup,
    private val colorScheme: ColorScheme,
    private val sheetOptions: CheckoutSheetOptions,
    onCloseRequested: () -> Unit,
) {
    private val context: Context = root.context
    private val header: Toolbar
    private val title: TextView
    private val headerBorder: View
    private val container: RelativeLayout
    private val loadingBackground: View
    private val progressBar: ProgressBar
    private var isDarkTheme = context.isDarkTheme()
    private var sheetCornerRadiusDp: Float? = null
    private var webView: CheckoutWebView? = null
    private var headerBorderIsVisible = false

    @ColorInt
    var webViewBackgroundColor: Int = Color.TRANSPARENT
        private set

    init {
        LayoutInflater.from(context).inflate(R.layout.checkout_view_content, root, true)
        header = root.findViewById(R.id.checkout_header)
        title = root.findViewById(R.id.checkout_header_title)
        headerBorder = root.findViewById(R.id.checkout_header_border)
        container = root.findViewById(R.id.checkout_container)
        loadingBackground = root.findViewById(R.id.checkout_loading_background)
        progressBar = root.findViewById(R.id.checkout_progress_bar)

        header.apply {
            elevation = sheetOptions.toolbarElevationDp.dpToPx(context)
            inflateMenu(R.menu.checkout_menu)
            menu.findItem(R.id.checkout_close_button).setOnMenuItemClickListener {
                onCloseRequested()
                true
            }
        }

        title.apply {
            text = ShopifyCheckout.configuration.resolveCheckoutTitle(context)

            (layoutParams as? Toolbar.LayoutParams)?.let { params ->
                params.topMargin = 0
                params.gravity = when (sheetOptions.titleAlignment) {
                    CheckoutSheetTitleAlignment.START -> Gravity.START or Gravity.CENTER_VERTICAL
                    CheckoutSheetTitleAlignment.CENTER -> Gravity.CENTER
                }
                layoutParams = params
            }
        }

        applyColors()
    }

    /**
     * Applies the sheet-owned parts of the chrome: rounded header corners and room for the drag handle.
     */
    fun configureForBottomSheet(sheet: CheckoutSheetOptions) {
        sheetCornerRadiusDp = sheet.cornerRadiusDp
        applyColors()
        (title.layoutParams as? Toolbar.LayoutParams)?.let { params ->
            params.topMargin = if (sheet.showsDragHandle) {
                context.resources.getDimensionPixelSize(R.dimen.checkout_sheet_drag_handle_title_top_margin)
            } else {
                0
            }
            title.layoutParams = params
        }
    }

    /**
     * Applies the colors for [isDarkTheme]. Returns `false` when the chrome already uses that theme.
     */
    fun applyTheme(isDarkTheme: Boolean): Boolean {
        if (isDarkTheme == this.isDarkTheme) return false

        this.isDarkTheme = isDarkTheme
        applyColors()
        return true
    }

    fun attachWebView(webView: CheckoutWebView) {
        this.webView = webView
        webView.removeFromParent()
        webView.setBackgroundColor(webViewBackgroundColor)
        webView.setOnScrollChangeListener { _, _, scrollY, _, _ ->
            val shouldShowBorder = scrollY > 0
            if (headerBorderIsVisible == shouldShowBorder) return@setOnScrollChangeListener

            headerBorderIsVisible = shouldShowBorder
            headerBorder.animate().cancel()
            headerBorder.animate()
                .alpha(if (shouldShowBorder) 1f else 0f)
                .setDuration(HEADER_BORDER_FADE_DURATION_MS)
                .start()
        }
        headerBorderIsVisible = webView.scrollY > 0
        headerBorder.animate().cancel()
        headerBorder.alpha = if (headerBorderIsVisible) 1f else 0f
        container.addView(webView, 0, RelativeLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        progressBar.bringToFront()

        if (webView.hasFinishedLoading()) {
            progressBar.visibility = INVISIBLE
            hideLoadingBackground()
        }
    }

    fun detachWebView() {
        webView?.setOnScrollChangeListener(null)
        webView = null
    }

    fun setProgressBarVisibility(visibility: Int) {
        progressBar.visibility = visibility
    }

    fun setProgress(percentage: Int) {
        progressBar.setProgressCompat(percentage)
    }

    fun hideLoadingBackground() {
        loadingBackground.visibility = INVISIBLE
    }

    fun applyBottomInsetPadding() {
        container.applyCheckoutBottomInsetPadding()
    }

    /**
     * Applies the color scheme's colors for [isDarkTheme] to every themed element of the chrome.
     * A sheet-presented header keeps its rounded top corners.
     */
    private fun applyColors() {
        val headerBackgroundColor = colorScheme.headerBackgroundColor(isDarkTheme).getValue(context)
        val headerTitleColor = colorScheme.headerTitleColor(isDarkTheme).getValue(context)
        webViewBackgroundColor = colorScheme.webViewBackgroundColor(isDarkTheme).getValue(context)

        header.apply {
            background = sheetCornerRadiusDp?.let { cornerRadiusDp ->
                roundedTopCornerDrawable(context, headerBackgroundColor, cornerRadiusDp)
            } ?: headerBackgroundColor.toDrawable()
            setTitleTextColor(headerTitleColor)
            menu.findItem(R.id.checkout_close_button).applyCheckoutCloseIcon(
                context = context,
                colorScheme = colorScheme,
                sheet = sheetOptions,
                isDarkTheme = isDarkTheme,
            )
        }
        title.setTextColor(headerTitleColor)

        container.setBackgroundColor(webViewBackgroundColor)
        loadingBackground.setBackgroundColor(webViewBackgroundColor)
        webView?.setBackgroundColor(webViewBackgroundColor)
        headerBorder.setBackgroundColor(colorScheme.headerBorderColor(isDarkTheme).getValue(context))
        progressBar.progressTintList = ColorStateList.valueOf(
            colorScheme.progressIndicatorColor(isDarkTheme).getValue(context)
        )
    }
}

private const val HEADER_BORDER_FADE_DURATION_MS = 120L

private fun View.applyCheckoutBottomInsetPadding() {
    ViewCompat.setOnApplyWindowInsetsListener(this) { _, insets ->
        val systemBarsBottomInset = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom
        val imeBottomInset = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
        val bottomInset = maxOf(systemBarsBottomInset, imeBottomInset)
        if (paddingBottom != bottomInset) {
            setPadding(paddingLeft, paddingTop, paddingRight, bottomInset)
        }
        insets
    }
    ViewCompat.requestApplyInsets(this)
}

private fun ProgressBar.setProgressCompat(percentage: Int) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        setProgress(percentage, true)
    } else {
        progress = percentage
    }
}

/**
 * Sets the close icon for the current theme. It loads the icon again each time, so a theme change does not
 * keep the previous theme's icon or tint. A custom icon is used as it is, with its own tint.
 */
private fun MenuItem.applyCheckoutCloseIcon(
    context: Context,
    colorScheme: ColorScheme,
    sheet: CheckoutSheetOptions,
    isDarkTheme: Boolean,
) {
    val customCloseIcon = sheet.closeIcon ?: colorScheme.closeIcon(isDarkTheme)
    if (customCloseIcon != null) {
        icon = AppCompatResources.getDrawable(context, customCloseIcon.id)
        return
    }

    val tint = sheet.closeIconTintColor ?: colorScheme.closeIconTintColor(isDarkTheme)
    icon = AppCompatResources.getDrawable(context, R.drawable.checkout_close)?.mutate()?.also { closeIcon ->
        tint?.let { DrawableCompat.setTint(closeIcon, it.getValue(context)) }
    }
}

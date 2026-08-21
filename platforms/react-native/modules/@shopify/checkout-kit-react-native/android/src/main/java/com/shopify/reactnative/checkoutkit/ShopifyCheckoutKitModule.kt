package com.shopify.reactnative.checkoutkit

import androidx.activity.ComponentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.shopify.checkoutkit.CheckoutAppearance
import com.shopify.checkoutkit.CheckoutHandle
import com.shopify.checkoutkit.CheckoutPreload
import com.shopify.checkoutkit.Color
import com.shopify.checkoutkit.ColorScheme
import com.shopify.checkoutkit.Colors
import com.shopify.checkoutkit.Configuration
import com.shopify.checkoutkit.LogLevel
import com.shopify.checkoutkit.NativeShopifyCheckoutKitSpec
import com.shopify.checkoutkit.Platform
import com.shopify.checkoutkit.PreloadState
import com.shopify.checkoutkit.Preloading
import com.shopify.checkoutkit.ShopifyCheckoutKit
import java.util.Locale
import org.json.JSONObject

open class ShopifyCheckoutKitModule(
    reactContext: ReactApplicationContext,
) : NativeShopifyCheckoutKitSpec(reactContext) {
    private var checkoutSheet: CheckoutHandle? = null
    private var checkoutListener: CustomCheckoutListener? = null
    private var checkoutPreload: CheckoutPreload? = null

    init {
        ShopifyCheckoutKit.configure { configuration ->
            configuration.platform = Platform.ReactNative()
            checkoutConfig = configuration
        }
    }

    override fun invalidate() {
        releaseCheckoutListener()
        releaseCheckoutPreload()
        super.invalidate()
    }

    override fun getTypedExportedConstants(): Map<String, Any> = mapOf(
        "version" to ShopifyCheckoutKit.VERSION,
        "dispatchEventTypes" to DispatchEventTypes.ALL,
    )

    @ReactMethod
    override fun addListener(eventName: String) = Unit

    @ReactMethod
    override fun removeListeners(count: Double) = Unit

    @ReactMethod
    override fun present(checkoutURL: String, subscribedMethods: ReadableArray) {
        releaseCheckoutListener()

        val activity = reactApplicationContext.currentActivity as? ComponentActivity ?: return
        val dispatch = DispatchHandle { json -> emitOnDispatch(json) }
        val listener = CustomCheckoutListener(dispatch)
        checkoutListener = listener

        val methods = buildList {
            for (index in 0 until subscribedMethods.size()) {
                subscribedMethods.getString(index)?.let(::add)
            }
        }
        val client = ProtocolRelay.makeClient(methods, dispatch)

        activity.runOnUiThread {
            if (checkoutListener !== listener) return@runOnUiThread
            checkoutSheet = ShopifyCheckoutKit.present(checkoutURL, activity, listener, client)
        }
    }

    @ReactMethod
    override fun dismiss() {
        releaseCheckoutListener()
        checkoutSheet?.dismiss()
        checkoutSheet = null
    }

    @ReactMethod
    override fun preload(checkoutURL: String, requestId: String) {
        releaseCheckoutPreload()

        val activity = reactApplicationContext.currentActivity as? ComponentActivity
        if (activity == null) {
            emitPreloadStateChange(requestId, PreloadState.Idle)
            return
        }

        checkoutPreload = ShopifyCheckoutKit.preload(checkoutURL, activity) { state ->
            emitPreloadStateChange(requestId, state)
        }
        if (checkoutPreload == null) {
            emitPreloadStateChange(requestId, PreloadState.Idle)
        }
    }

    @ReactMethod
    override fun invalidateCache() {
        releaseCheckoutPreload()
        ShopifyCheckoutKit.invalidate()
    }

    private fun emitPreloadStateChange(requestId: String, state: PreloadState) {
        val event = JSONObject().put("requestId", requestId)
        when (state) {
            PreloadState.Idle -> event.put("type", "idle")
            PreloadState.Loading -> event.put("type", "loading")
            PreloadState.Ready -> event.put("type", "ready")
            PreloadState.Expired -> event.put("type", "expired")
            is PreloadState.Failed -> {
                event.put("type", "failed")
                when (val reason = state.reason) {
                    is PreloadState.FailureReason.HttpError -> {
                        event.put("reason", "httpError")
                        event.put("statusCode", reason.statusCode)
                    }
                    PreloadState.FailureReason.NavigationFailed -> event.put("reason", "navigationFailed")
                    PreloadState.FailureReason.WebContentUnavailable ->
                        event.put("reason", "webContentUnavailable")
                    PreloadState.FailureReason.ProtocolError -> event.put("reason", "protocolError")
                    else -> event.put("reason", "unknown")
                }
            }
            else -> return
        }
        emitPreloadStateEvent(event.toString())
    }

    protected open fun emitPreloadStateEvent(event: String) {
        emitOnPreloadStateChange(event)
    }

    private fun releaseCheckoutListener() {
        checkoutListener?.release()
        checkoutListener = null
    }

    private fun releaseCheckoutPreload() {
        checkoutPreload?.listener = null
        checkoutPreload = null
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    override fun getConfig(): WritableMap = Arguments.createMap().apply {
        putString("title", checkoutConfig.title)
        putString("colorScheme", colorSchemeStringFor(checkoutConfig.appearance))
        putString("logLevel", logLevelStringFor(checkoutConfig.logLevel))
        putBoolean("preloading", checkoutConfig.preloading.enabled)
        putArray("allowedMessageOrigins", Arguments.fromList(ArrayList(checkoutConfig.allowedMessageOrigins)))
    }

    @ReactMethod
    override fun setConfig(config: ReadableMap) {
        ShopifyCheckoutKit.configure { configuration ->
            if (config.hasKey("title")) {
                configuration.title = config.getString("title")
            }
            if (config.hasKey("preloading")) {
                configuration.preloading = Preloading(config.getBoolean("preloading"))
            }
            if (config.hasKey("allowedMessageOrigins")) {
                configuration.allowedMessageOrigins = toStringSet(config.getArray("allowedMessageOrigins"))
            }
            if (config.hasKey("logLevel")) {
                logLevelFor(config.getString("logLevel"))?.let { configuration.logLevel = it }
            }
            if (config.hasKey("colorScheme")) {
                val colorScheme = requireNotNull(config.getString("colorScheme"))
                val colorsConfig = if (config.hasKey("colors")) config.getMap("colors") else null
                val androidConfig = colorsConfig?.takeIf { it.hasKey("android") }?.getMap("android")
                appearanceFor(colorScheme, androidConfig)?.let { configuration.appearance = it }
            }
            checkoutConfig = configuration
        }
    }

    private fun toStringSet(array: ReadableArray?): Set<String> = buildSet {
        if (array == null) return@buildSet
        for (index in 0 until array.size()) {
            array.getString(index)?.let(::add)
        }
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    override fun configureAcceleratedCheckouts(
        storefrontDomain: String?,
        storefrontAccessToken: String?,
        customerEmail: String?,
        customerPhoneNumber: String?,
        customerAccessToken: String?,
        applePayMerchantIdentifier: String?,
        applyPayContactFields: ReadableArray?,
        supportedShippingCountries: ReadableArray?,
    ): Boolean = false

    @ReactMethod(isBlockingSynchronousMethod = true)
    override fun isAcceleratedCheckoutAvailable(): Boolean = false

    @ReactMethod(isBlockingSynchronousMethod = true)
    override fun isApplePayAvailable(): Boolean = false

    @ReactMethod
    override fun respondToGeolocationRequest(allow: Boolean) {
        checkoutListener?.invokeGeolocationCallback(allow)
    }

    companion object {
        const val NAME: String = "ShopifyCheckoutKit"
        private const val STOREFRONT_COLOR_SCHEME = "storefront"

        @JvmField
        var checkoutConfig: Configuration = currentConfiguration()

        private fun currentConfiguration(): Configuration {
            var current: Configuration? = null
            ShopifyCheckoutKit.configure { current = it }
            return requireNotNull(current)
        }

        @JvmStatic
        internal fun appearanceFor(colorScheme: String?, androidConfig: ReadableMap?): CheckoutAppearance? {
            if (colorScheme == STOREFRONT_COLOR_SCHEME) {
                return getStorefrontAppearance(androidConfig)
            }

            val scheme = colorSchemeFor(colorScheme) ?: return null
            val schemeWithOverrides = androidConfig
                ?.takeIf(::isValidColorConfig)
                ?.let { getColors(scheme, it) }
            return CheckoutAppearance.App(schemeWithOverrides ?: scheme)
        }

        private fun getStorefrontAppearance(androidConfig: ReadableMap?): CheckoutAppearance {
            val colors = createColorsFromConfig(androidConfig) ?: return CheckoutAppearance.Storefront()
            return CheckoutAppearance.Storefront().customize {
                withWebViewBackground(colors.webViewBackground)
                withHeaderBackground(colors.headerBackground)
                withHeaderFont(colors.headerFont)
                withProgressIndicator(colors.progressIndicator)
                colors.closeIconTint?.let(::withCloseIconTint)
            }
        }

        private fun colorSchemeFor(colorScheme: String?): ColorScheme? = when (colorScheme) {
            ColorScheme.Light().id -> ColorScheme.Light()
            ColorScheme.Dark().id -> ColorScheme.Dark()
            ColorScheme.Automatic().id -> ColorScheme.Automatic()
            else -> null
        }

        @JvmStatic
        internal fun colorSchemeStringFor(appearance: CheckoutAppearance?): String =
            (appearance as? CheckoutAppearance.App)?.colorScheme?.id ?: STOREFRONT_COLOR_SCHEME

        @JvmStatic
        internal fun logLevelFor(logLevel: String?): LogLevel? = try {
            logLevel?.uppercase(Locale.ROOT)?.let(LogLevel::valueOf)
        } catch (_: IllegalArgumentException) {
            null
        }

        @JvmStatic
        internal fun logLevelStringFor(logLevel: LogLevel): String = logLevel.name.lowercase(Locale.ROOT)

        private fun isValidColorConfig(config: ReadableMap?): Boolean {
            if (config == null) return false

            val requiredKeys = listOf(
                "backgroundColor",
                "progressIndicator",
                "headerTextColor",
                "headerBackgroundColor",
            )
            if (requiredKeys.any { !config.hasKey(it) || parseColor(config.getString(it)) == null }) {
                return false
            }

            return !config.hasKey("closeButtonColor") ||
                config.getString("closeButtonColor") == null ||
                parseColor(config.getString("closeButtonColor")) != null
        }

        private fun isValidColorScheme(colorScheme: ColorScheme, colorConfig: ReadableMap?): Boolean {
            if (colorConfig == null) return false
            if (colorScheme is ColorScheme.Automatic) {
                return colorConfig.hasKey("light") &&
                    colorConfig.hasKey("dark") &&
                    isValidColorConfig(colorConfig.getMap("light")) &&
                    isValidColorConfig(colorConfig.getMap("dark"))
            }
            return isValidColorConfig(colorConfig)
        }

        private fun parseColorFromConfig(config: ReadableMap, colorKey: String): Color? =
            if (config.hasKey(colorKey)) parseColor(config.getString(colorKey)) else null

        private fun createColorsFromConfig(config: ReadableMap?): Colors? {
            if (config == null) return null

            val webViewBackground = parseColorFromConfig(config, "backgroundColor") ?: return null
            val headerBackground = parseColorFromConfig(config, "headerBackgroundColor") ?: return null
            val headerFont = parseColorFromConfig(config, "headerTextColor") ?: return null
            val progressIndicator = parseColorFromConfig(config, "progressIndicator") ?: return null
            return Colors(
                webViewBackground = webViewBackground,
                headerBackground = headerBackground,
                headerFont = headerFont,
                progressIndicator = progressIndicator,
                closeIconTint = parseColorFromConfig(config, "closeButtonColor"),
            )
        }

        private fun getColors(colorScheme: ColorScheme, config: ReadableMap): ColorScheme? {
            if (!isValidColorScheme(colorScheme, config)) return null

            if (colorScheme is ColorScheme.Automatic) {
                val lightColors = createColorsFromConfig(config.getMap("light")) ?: return null
                val darkColors = createColorsFromConfig(config.getMap("dark")) ?: return null
                colorScheme.lightColors = lightColors
                colorScheme.darkColors = darkColors
                return colorScheme
            }

            val colors = createColorsFromConfig(config) ?: return null
            when (colorScheme) {
                is ColorScheme.Light -> colorScheme.colors = colors
                is ColorScheme.Dark -> colorScheme.colors = colors
                else -> Unit
            }
            return colorScheme
        }

        private fun parseColor(colorString: String?): Color? = try {
            val hexadecimal = requireNotNull(colorString).replace("#", "")
            var color = hexadecimal.toLong(16)
            if (hexadecimal.length == 6) {
                color = color or 0xFF000000
            }
            Color.SRGB(color.toInt())
        } catch (_: IllegalArgumentException) {
            println("Warning: Invalid color string. Default color will be used.")
            null
        }
    }
}

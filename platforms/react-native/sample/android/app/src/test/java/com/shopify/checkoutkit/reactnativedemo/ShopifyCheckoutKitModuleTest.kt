package com.shopify.checkoutkit.reactnativedemo

import android.webkit.GeolocationPermissions
import androidx.activity.ComponentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReactApplicationContext
import com.shopify.checkoutkit.CheckoutAppearance
import com.shopify.checkoutkit.CheckoutErrorCode
import com.shopify.checkoutkit.CheckoutException
import com.shopify.checkoutkit.CheckoutPreload
import com.shopify.checkoutkit.ColorScheme
import com.shopify.checkoutkit.LogLevel
import com.shopify.checkoutkit.PreloadState
import com.shopify.checkoutkit.PreloadStateListener
import com.shopify.checkoutkit.Preloading
import com.shopify.checkoutkit.ShopifyCheckoutKit
import com.shopify.reactnative.checkoutkit.CustomCheckoutListener
import com.shopify.reactnative.checkoutkit.DispatchCallback
import com.shopify.reactnative.checkoutkit.ShopifyCheckoutKitModule
import java.util.Locale
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.MockedStatic
import org.mockito.Mockito
import org.mockito.ArgumentCaptor
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ShopifyCheckoutKitModuleTest {
    private lateinit var reactContext: ReactApplicationContext
    private lateinit var componentActivity: ComponentActivity
    private lateinit var module: TestShopifyCheckoutKitModule
    private lateinit var mockedArguments: MockedStatic<Arguments>
    private lateinit var initialAppearance: CheckoutAppearance
    private lateinit var initialLogLevel: LogLevel
    private lateinit var initialPreloading: Preloading

    private class TestShopifyCheckoutKitModule(
        reactContext: ReactApplicationContext,
    ) : ShopifyCheckoutKitModule(reactContext) {
        var preloadStateEvent: String? = null

        override fun emitPreloadStateEvent(event: String) {
            preloadStateEvent = event
        }
    }

    @Before
    fun setUp() {
        mockedArguments = Mockito.mockStatic(Arguments::class.java)
        mockedArguments.`when`<JavaOnlyMap>(Arguments::createMap).thenAnswer { JavaOnlyMap() }
        mockedArguments.`when`<JavaOnlyArray> { Arguments.fromList(Mockito.anyList<Any?>()) }
            .thenAnswer { invocation -> JavaOnlyArray.from(invocation.getArgument(0)) }
        reactContext = Mockito.mock(ReactApplicationContext::class.java)
        componentActivity = Mockito.mock(ComponentActivity::class.java)
        Mockito.`when`(reactContext.currentActivity).thenReturn(componentActivity)
        module = TestShopifyCheckoutKitModule(reactContext)
        initialAppearance = ShopifyCheckoutKitModule.checkoutConfig.appearance
        initialLogLevel = ShopifyCheckoutKitModule.checkoutConfig.logLevel
        initialPreloading = ShopifyCheckoutKitModule.checkoutConfig.preloading
    }

    @After
    fun tearDown() {
        if (::mockedArguments.isInitialized) {
            mockedArguments.close()
        }
        if (!::initialAppearance.isInitialized) return
        ShopifyCheckoutKit.configure { configuration ->
            configuration.appearance = initialAppearance
            configuration.logLevel = initialLogLevel
            configuration.preloading = initialPreloading
            ShopifyCheckoutKitModule.checkoutConfig = configuration
        }
    }

    @Test
    fun canPresentCheckout() {
        Mockito.mockStatic(ShopifyCheckoutKit::class.java).use { checkoutKit ->
            Mockito.doAnswer { invocation ->
                invocation.getArgument<Runnable>(0).run()
                null
            }.`when`(componentActivity).runOnUiThread(Mockito.any())
            module.present("https://shopify.com", JavaOnlyArray())
            Mockito.verify(componentActivity).runOnUiThread(Mockito.any())
        }
    }

    @Test
    fun canPreload() {
        Mockito.mockStatic(ShopifyCheckoutKit::class.java).use { checkoutKit ->
            val checkoutPreload = Mockito.mock(CheckoutPreload::class.java)
            checkoutKit.`when`<CheckoutPreload?> {
                ShopifyCheckoutKit.preload(
                    matching("https://shopify.com"),
                    matching(componentActivity),
                    anyPreloadStateListener(),
                )
            }.thenReturn(checkoutPreload)

            module.preload("https://shopify.com", "preload-request")

            checkoutKit.verify {
                ShopifyCheckoutKit.preload(
                    matching("https://shopify.com"),
                    matching(componentActivity),
                    anyPreloadStateListener(),
                )
            }
        }
    }

    @Test
    fun preloadSerializesWebContentUnavailable() {
        Mockito.mockStatic(ShopifyCheckoutKit::class.java).use { checkoutKit ->
            val checkoutPreload = Mockito.mock(CheckoutPreload::class.java)
            val listenerCaptor = ArgumentCaptor.forClass(PreloadStateListener::class.java)
            checkoutKit.`when`<CheckoutPreload?> {
                ShopifyCheckoutKit.preload(
                    matching("https://shopify.com"),
                    matching(componentActivity),
                    anyPreloadStateListener(),
                )
            }.thenReturn(checkoutPreload)

            module.preload("https://shopify.com", "preload-request")

            checkoutKit.verify {
                ShopifyCheckoutKit.preload(
                    matching("https://shopify.com"),
                    matching(componentActivity),
                    capturing(listenerCaptor),
                )
            }
            listenerCaptor.value.onStateChanged(
                PreloadState.Failed(
                    PreloadState.FailureReason.WebContentUnavailable,
                    "Web content process terminated.",
                ),
            )
            assertThat(module.preloadStateEvent)
                .contains("\"requestId\":\"preload-request\"")
                .contains("\"type\":\"failed\"")
                .contains("\"reason\":\"webContentUnavailable\"")
        }
    }

    @Test
    fun preloadEmitsIdleWithoutComponentActivity() {
        Mockito.`when`(reactContext.currentActivity).thenReturn(null)
        Mockito.mockStatic(ShopifyCheckoutKit::class.java).use { checkoutKit ->
            module.preload("https://shopify.com", "preload-request")
            checkoutKit.verifyNoInteractions()
            assertThat(module.preloadStateEvent)
                .contains("\"requestId\":\"preload-request\"")
                .contains("\"type\":\"idle\"")
        }
    }

    @Test
    fun canInvalidatePreloadCache() {
        Mockito.mockStatic(ShopifyCheckoutKit::class.java).use { checkoutKit ->
            val checkoutPreload = mockPreload(checkoutKit)
            module.preload("https://shopify.com", "preload-request")
            module.invalidateCache()

            Mockito.verify(checkoutPreload).listener = null
            checkoutKit.verify(ShopifyCheckoutKit::invalidate)
        }
    }

    @Test
    fun moduleInvalidationDetachesPreloadListener() {
        Mockito.mockStatic(ShopifyCheckoutKit::class.java).use { checkoutKit ->
            val checkoutPreload = mockPreload(checkoutKit)
            module.preload("https://shopify.com", "preload-request")
            module.invalidate()

            Mockito.verify(checkoutPreload).listener = null
        }
    }

    @Test
    fun closeDispatchIsSingleShot() {
        val envelopes = mutableListOf<String>()
        val dispatch = DispatchCallback(envelopes::add)
        val listener = CustomCheckoutListener(dispatch)
        listener.onCheckoutDismissed()
        listener.onCheckoutDismissed()

        assertThat(envelopes).hasSize(1)
        assertThat(envelopes.single()).contains("\"type\":\"close\"")
    }

    @Test
    fun releaseDropsPendingDispatch() {
        val dispatch = Mockito.mock(DispatchCallback::class.java)
        val listener = CustomCheckoutListener(dispatch)
        listener.release()
        listener.onCheckoutDismissed()
        Mockito.verify(dispatch, Mockito.never()).invoke(Mockito.anyString())
    }

    @Test
    fun releaseClearsPendingGeolocationCallback() {
        val dispatch = Mockito.mock(DispatchCallback::class.java)
        val permissions = Mockito.mock(GeolocationPermissions.Callback::class.java)
        val listener = CustomCheckoutListener(dispatch)
        listener.onGeolocationPermissionsShowPrompt("https://shopify.com", permissions)
        listener.release()
        listener.invokeGeolocationCallback(true)
        Mockito.verify(permissions, Mockito.never()).invoke(Mockito.anyString(), Mockito.anyBoolean(), Mockito.anyBoolean())
    }

    @Test
    fun geolocationDispatchesMultipleEnvelopes() {
        val envelopes = mutableListOf<String>()
        val dispatch = DispatchCallback(envelopes::add)
        val permissions = Mockito.mock(GeolocationPermissions.Callback::class.java)
        val listener = CustomCheckoutListener(dispatch)
        listener.onGeolocationPermissionsShowPrompt("https://shopify.com", permissions)
        listener.onGeolocationPermissionsShowPrompt("https://shopify.com", permissions)

        assertThat(envelopes).hasSize(2).allSatisfy {
            assertThat(it).contains("\"type\":\"geolocationRequest\"", "\"origin\":\"https://shopify.com\"")
        }
    }

    @Test
    fun exposesModuleNameAndConstants() {
        assertThat(module.name).isEqualTo("ShopifyCheckoutKit")
        assertThat(module.constants).containsKeys("version", "dispatchEventTypes")
    }

    @Test
    fun hasCorrectDefaultConfiguration() {
        assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.appearance)).isEqualTo("storefront")
        assertThat(ShopifyCheckoutKitModule.checkoutConfig.preloading.enabled).isTrue()
    }

    @Test
    fun allowedMessageOriginsRoundTrip() {
        val origins = JavaOnlyArray().apply {
            pushString("https://example.com")
            pushString("https://*.example.com")
        }
        module.setConfig(JavaOnlyMap().apply { putArray("allowedMessageOrigins", origins) })

        assertThat(ShopifyCheckoutKitModule.checkoutConfig.allowedMessageOrigins)
            .containsExactlyInAnyOrder("https://example.com", "https://*.example.com")
        assertThat(module.config.getArray("allowedMessageOrigins")?.toArrayList())
            .containsExactlyInAnyOrder("https://example.com", "https://*.example.com")
    }

    @Test
    fun configuresEveryColorScheme() {
        listOf("light", "dark", "automatic", "storefront").forEach { colorScheme ->
            module.setConfig(JavaOnlyMap().apply { putString("colorScheme", colorScheme) })
            assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.appearance)).isEqualTo(colorScheme)
        }
    }

    @Test
    fun unknownColorSchemeKeepsCurrentAppearance() {
        module.setConfig(JavaOnlyMap().apply { putString("colorScheme", "dark") })
        module.setConfig(JavaOnlyMap().apply { putString("colorScheme", "sepia") })
        assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.appearance)).isEqualTo("dark")
    }

    @Test
    fun configuresValidLightDarkAndAutomaticColors() {
        listOf(
            configWithAndroidColors("light", validLightColors()),
            configWithAndroidColors("dark", validDarkColors()),
            JavaOnlyMap().apply {
                putString("colorScheme", "automatic")
                putMap("colors", JavaOnlyMap().apply {
                    putMap("android", JavaOnlyMap().apply {
                        putMap("light", validLightColors())
                        putMap("dark", validDarkColors())
                    })
                })
            },
        ).forEach(module::setConfig)
    }

    @Test
    fun invalidOrPartialColorsFallBackToBasicScheme() {
        val invalid = validLightColors().apply { putString("backgroundColor", "invalid") }
        module.setConfig(configWithAndroidColors("light", invalid))
        assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.appearance)).isEqualTo("light")

        val partial = JavaOnlyMap().apply { putString("backgroundColor", BACKGROUND_COLOR) }
        module.setConfig(configWithAndroidColors("dark", partial))
        assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.appearance)).isEqualTo("dark")
    }

    @Test
    fun acceptsOptionalCloseButtonColor() {
        val colors = validLightColors().apply { putString("closeButtonColor", "#123456") }
        module.setConfig(configWithAndroidColors("light", colors))
        assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.appearance)).isEqualTo("light")
    }

    @Test
    fun configuresAndReportsEveryLogLevel() {
        LogLevel.entries.forEach { level ->
            val name = level.name.lowercase(Locale.ROOT)
            module.setConfig(JavaOnlyMap().apply { putString("logLevel", name) })
            assertThat(ShopifyCheckoutKitModule.checkoutConfig.logLevel).isEqualTo(level)
            assertThat(module.config.getString("logLevel")).isEqualTo(name)
        }
    }

    @Test
    fun logLevelsAreCaseInsensitiveAndInvalidValuesAreIgnored() {
        module.setConfig(JavaOnlyMap().apply { putString("logLevel", "DeBuG") })
        assertThat(ShopifyCheckoutKitModule.checkoutConfig.logLevel).isEqualTo(LogLevel.DEBUG)
        module.setConfig(JavaOnlyMap().apply { putString("logLevel", "invalid") })
        assertThat(ShopifyCheckoutKitModule.checkoutConfig.logLevel).isEqualTo(LogLevel.DEBUG)
    }

    @Test
    fun canDisableAndReadPreloading() {
        module.setConfig(JavaOnlyMap().apply { putBoolean("preloading", false) })
        assertThat(ShopifyCheckoutKitModule.checkoutConfig.preloading.enabled).isFalse()
        assertThat(module.config.getBoolean("preloading")).isFalse()
    }

    @Test
    fun serializesCheckoutErrors() {
        val cases = listOf(
            CheckoutException(CheckoutErrorCode.CART_EXPIRED, "Cart has expired") to "cart_expired",
            CheckoutException(CheckoutErrorCode.CUSTOMER_ACCOUNT_REQUIRED, "Customer account required") to
                "customer_account_required",
            CheckoutException(CheckoutErrorCode.HTTP_ERROR, "Not Found", 404) to "http_error",
        )

        cases.forEach { (error, code) ->
            val envelopes = mutableListOf<String>()
            val dispatch = DispatchCallback(envelopes::add)
            CustomCheckoutListener(dispatch).onCheckoutFailed(error)
            assertThat(envelopes.single()).contains("\"type\":\"fail\"", "\"code\":\"$code\"")
            if (error.httpStatusCode != null) assertThat(envelopes.single()).contains("\"statusCode\":404")
        }
    }

    @Test
    fun everyErrorCodeSerializesAsLowerSnakeCase() {
        CheckoutErrorCode.entries.forEach { code ->
            val envelopes = mutableListOf<String>()
            val dispatch = DispatchCallback(envelopes::add)
            val listener = CustomCheckoutListener(dispatch)
            listener.onCheckoutFailed(CheckoutException(code, "failed"))
            assertThat(envelopes.single()).contains("\"code\":\"${code.name.lowercase(Locale.ROOT)}\"")
        }
    }

    private fun colorSchemeIdOf(appearance: CheckoutAppearance): String =
        (appearance as? CheckoutAppearance.App)?.colorScheme?.id ?: "storefront"

    private fun validLightColors(): JavaOnlyMap = JavaOnlyMap().apply {
        putString("backgroundColor", BACKGROUND_COLOR)
        putString("progressIndicator", PROGRESS_INDICATOR)
        putString("headerBackgroundColor", HEADER_BACKGROUND_COLOR)
        putString("headerTextColor", HEADER_TEXT_COLOR)
    }

    private fun validDarkColors(): JavaOnlyMap = JavaOnlyMap().apply {
        putString("backgroundColor", DARK_BACKGROUND_COLOR)
        putString("progressIndicator", DARK_PROGRESS_INDICATOR)
        putString("headerBackgroundColor", DARK_HEADER_BACKGROUND_COLOR)
        putString("headerTextColor", DARK_HEADER_TEXT_COLOR)
    }

    private fun configWithAndroidColors(colorScheme: String, colors: JavaOnlyMap): JavaOnlyMap =
        JavaOnlyMap().apply {
            putString("colorScheme", colorScheme)
            putMap("colors", JavaOnlyMap().apply { putMap("android", colors) })
        }

    private fun mockPreload(checkoutKit: MockedStatic<ShopifyCheckoutKit>): CheckoutPreload {
        val checkoutPreload = Mockito.mock(CheckoutPreload::class.java)
        checkoutKit.`when`<CheckoutPreload?> {
            ShopifyCheckoutKit.preload(
                matching("https://shopify.com"),
                matching(componentActivity),
                anyPreloadStateListener(),
            )
        }.thenReturn(checkoutPreload)
        return checkoutPreload
    }

    private fun <T> matching(value: T): T {
        Mockito.eq(value)
        return value
    }

    private fun anyPreloadStateListener(): PreloadStateListener {
        Mockito.any(PreloadStateListener::class.java)
        return PreloadStateListener {}
    }

    private fun capturing(captor: ArgumentCaptor<PreloadStateListener>): PreloadStateListener {
        captor.capture()
        return PreloadStateListener {}
    }

    private companion object {
        const val BACKGROUND_COLOR = "#FFFFFF"
        const val PROGRESS_INDICATOR = "#000000"
        const val HEADER_BACKGROUND_COLOR = "#FFFFFF"
        const val HEADER_TEXT_COLOR = "#000000"
        const val DARK_BACKGROUND_COLOR = "#000000"
        const val DARK_PROGRESS_INDICATOR = "#FFFFFF"
        const val DARK_HEADER_BACKGROUND_COLOR = "#000000"
        const val DARK_HEADER_TEXT_COLOR = "#FFFFFF"
    }
}

package com.shopify.checkoutkit

import androidx.activity.ComponentActivity
import java.util.concurrent.atomic.AtomicBoolean
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class InteropTest {
    private lateinit var initialConfiguration: Configuration

    @Before
    fun setUp() {
        initialConfiguration = ShopifyCheckoutKit.configuration
    }

    @After
    fun tearDown() {
        ShopifyCheckoutKit.configure { config ->
            config.appearance = initialConfiguration.appearance
            config.sheet = initialConfiguration.sheet
            config.preloading = initialConfiguration.preloading
            config.platform = initialConfiguration.platform
            config.logLevel = initialConfiguration.logLevel
            config.title = initialConfiguration.title
        }
    }

    @Test
    fun canInstantiateCustomListener() {
        val listener = object : DefaultCheckoutListener() {
            override fun onCheckoutFailed(error: CheckoutException) = Unit
            override fun onCheckoutDismissed() = Unit
        }
        assertThat(listener).isNotNull
    }

    @Test
    fun canConstructCheckoutExceptionWithOptionalFields() {
        val withoutOptionalFields = CheckoutException(CheckoutErrorCode.UNKNOWN, "Unknown checkout failure")
        val withHttpStatusCode = CheckoutException(CheckoutErrorCode.HTTP_ERROR, "Checkout request failed", 500)

        assertThat(withoutOptionalFields.code).isEqualTo(CheckoutErrorCode.UNKNOWN)
        assertThat(withoutOptionalFields.httpStatusCode).isNull()
        assertThat(withHttpStatusCode.httpStatusCode).isEqualTo(500)
    }

    @Test
    fun canConfigureCheckoutKit() {
        ShopifyCheckoutKit.configure { it.appearance = CheckoutAppearance.App(ColorScheme.Dark()) }
        assertThat(ShopifyCheckoutKit.configuration.appearance)
            .isEqualTo(CheckoutAppearance.App(ColorScheme.Dark()))
    }

    @Test
    fun canConfigureStorefrontAppearance() {
        ShopifyCheckoutKit.configure { it.appearance = CheckoutAppearance.Storefront() }
        assertThat(ShopifyCheckoutKit.configuration.appearance).isEqualTo(CheckoutAppearance.Storefront())
    }

    @Test
    fun canCustomizeStorefrontAppearance() {
        val appearance = CheckoutAppearance.Storefront().customize {
            headerBackground = Color.SRGB(0xFF008060.toInt())
        }
        assertThat(appearance).isNotEqualTo(CheckoutAppearance.Storefront())
    }

    @Test
    fun canConfigureTitle() {
        ShopifyCheckoutKit.configure { it.title = "Kotlin Title" }
        assertThat(ShopifyCheckoutKit.configuration.title).isEqualTo("Kotlin Title")
    }

    @Test
    fun canConfigurePreloading() {
        ShopifyCheckoutKit.configure { it.preloading = Preloading(false) }
        assertThat(ShopifyCheckoutKit.configuration.preloading.enabled).isFalse()
    }

    @Test
    fun canConfigureSheet() {
        val sheet = CheckoutSheetOptions(
            cornerRadiusDp = 12f,
            titleAlignment = CheckoutSheetTitleAlignment.START,
            toolbarElevationDp = 4f,
            closeIconTint = Color.ResourceId(android.R.color.holo_red_dark),
            scrimColor = Color.SRGB(0x52000000),
            dismissal = CheckoutSheetDismissal(false, false),
            dragHandle = CheckoutSheetDragHandle(true),
            snapPoints = listOf(CheckoutSheetSnapPoint.Expanded(12f)),
            maxWidthDp = 480f,
        )

        ShopifyCheckoutKit.configure { it.sheet = sheet }
        assertThat(ShopifyCheckoutKit.configuration.sheet).isEqualTo(sheet)
    }

    @Test
    fun canConfigureSheetDismissal() {
        val dismissal = CheckoutSheetDismissal(false, false)
        ShopifyCheckoutKit.configure {
            it.sheet = CheckoutSheetOptions(dismissal = dismissal)
        }
        assertThat(ShopifyCheckoutKit.configuration.sheet.dismissal).isEqualTo(dismissal)
    }

    @Test
    fun canPreloadAndInvalidate() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { controller ->
            ShopifyCheckoutKit.preload("https://shopify.dev", controller.get())
            ShopifyCheckoutKit.invalidate()
        }
    }

    @Test
    fun canPreloadWithListener() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { controller ->
            val activity = controller.get()
            Robolectric.buildActivity(ComponentActivity::class.java).use { finishingController ->
                val finishingActivity = finishingController.get().apply { finish() }
                assertThat(ShopifyCheckoutKit.preload("https://shopify.dev", finishingActivity) {}).isNull()
            }

            val states = mutableListOf<PreloadState>()
            val preload = CheckoutWebView.preload(
                "https://shopify.dev",
                activity,
                FakeWebMessageTransport(),
                states::add,
            )

            assertThat(preload).isNotNull
            preload?.listener = PreloadStateListener(states::add)
            assertThat(preload?.state).isNotNull
            assertThat(states).containsExactly(PreloadState.Loading, PreloadState.Loading)
            ShopifyCheckoutKit.invalidate()
        }
    }

    @Test
    fun canCallPresent() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { controller ->
            val activity = controller.get().apply { finish() }
            val checkout = ShopifyCheckoutKit.present(
                "https://shopify.dev",
                activity,
                object : DefaultCheckoutListener() {
                    override fun onCheckoutFailed(error: CheckoutException) = Unit
                    override fun onCheckoutDismissed() = Unit
                },
            )
            assertThat(checkout).isNull()
        }
    }

    @Test
    fun canDismissCheckoutHandle() {
        val dismissed = AtomicBoolean()
        val checkout = CheckoutHandle { dismissed.set(true) }
        checkout.dismiss()
        assertThat(dismissed).isTrue()
    }

    @Test
    fun canCreateAndDestroyShopifyCheckout() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { controller ->
            val checkout = ShopifyCheckout(
                controller.get(),
                "https://shopify.dev",
                object : DefaultCheckoutListener() {
                    override fun onCheckoutFailed(error: CheckoutException) = Unit
                    override fun onCheckoutDismissed() = Unit
                },
            )
            checkout.destroy()
            assertThat(checkout).isNotNull
        }
    }

    @Test
    fun canCustomizeColorSchemeWithSingleBlock() {
        val tintColor = Color.ResourceId(android.R.color.holo_red_dark)
        val customized = ColorScheme.Light().customize { closeIconTint = tintColor }

        assertThat(customized).isInstanceOf(ColorScheme.Light::class.java)
        assertThat((customized as ColorScheme.Light).colors.closeIconTint).isEqualTo(tintColor)
    }

    @Test
    fun canCustomizeColorSchemeWithLightAndDarkBlocks() {
        val lightTint = Color.ResourceId(android.R.color.holo_orange_light)
        val darkTint = Color.ResourceId(android.R.color.holo_blue_dark)
        val lightHandle = Color.ResourceId(android.R.color.holo_green_light)
        val darkHandle = Color.ResourceId(android.R.color.holo_green_dark)
        val customIcon = DrawableResource(android.R.drawable.ic_menu_close_clear_cancel)

        val customized = ColorScheme.Automatic().customize(
            light = {
                closeIconTint = lightTint
                dragHandleColor = lightHandle
            },
            dark = {
                closeIcon = customIcon
                closeIconTint = darkTint
                dragHandleColor = darkHandle
            },
        ) as ColorScheme.Automatic

        assertThat(customized.lightColors.closeIconTint).isEqualTo(lightTint)
        assertThat(customized.lightColors.closeIcon).isNull()
        assertThat(customized.darkColors.closeIconTint).isEqualTo(darkTint)
        assertThat(customized.darkColors.closeIcon).isEqualTo(customIcon)
        assertThat(customized.lightColors.dragHandleColor).isEqualTo(lightHandle)
        assertThat(customized.darkColors.dragHandleColor).isEqualTo(darkHandle)
    }

    @Test
    fun canUseColorsBuilderDirectPropertyAssignment() {
        val headerColor = Color.SRGB(0xFF123456.toInt())
        val tintColor = Color.SRGB(0xFFABCDEF.toInt())
        val customized = ColorScheme.Dark().customize {
            headerBackground = headerColor
            closeIconTint = tintColor
        } as ColorScheme.Dark

        assertThat(customized.colors.headerBackground).isEqualTo(headerColor)
        assertThat(customized.colors.closeIconTint).isEqualTo(tintColor)
    }

    @Test
    fun canChainColorsBuilderMethods() {
        val webViewBackground = Color.ResourceId(android.R.color.white)
        val progressColor = Color.ResourceId(android.R.color.holo_green_dark)
        val dragHandle = Color.ResourceId(android.R.color.holo_blue_light)
        val headerBorder = Color.ResourceId(android.R.color.darker_gray)
        val icon = DrawableResource(android.R.drawable.ic_menu_close_clear_cancel)
        val customized = ColorScheme.Light().customize {
            withWebViewBackground(webViewBackground)
                .withProgressIndicator(progressColor)
                .withDragHandleColor(dragHandle)
                .withHeaderBorderColor(headerBorder)
                .withCloseIcon(icon)
        } as ColorScheme.Light

        assertThat(customized.colors.webViewBackground).isEqualTo(webViewBackground)
        assertThat(customized.colors.progressIndicator).isEqualTo(progressColor)
        assertThat(customized.colors.dragHandleColor).isEqualTo(dragHandle)
        assertThat(customized.colors.headerBorderColor).isEqualTo(headerBorder)
        assertThat(customized.colors.closeIcon).isEqualTo(icon)
    }

    @Test
    fun customizeLeavesDragHandleColorUnsetWhenOnlyHeaderFontChanges() {
        val headerFont = Color.SRGB(0xFF336699.toInt())
        val customized = ColorScheme.Light().customize { this.headerFont = headerFont } as ColorScheme.Light

        assertThat(customized.colors.headerFont).isEqualTo(headerFont)
        assertThat(customized.colors.dragHandleColor).isNull()
    }
}

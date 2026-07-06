package com.shopify.checkoutkit

import androidx.core.net.toUri
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CheckoutUrlDecoratorTest {

    private lateinit var initialConfiguration: Configuration

    @Before
    fun setUp() {
        initialConfiguration = ShopifyCheckoutKit.getConfiguration()
        ShopifyCheckoutKit.configure {
            it.colorScheme = ColorScheme.Automatic()
        }
    }

    @After
    fun tearDown() {
        ShopifyCheckoutKit.configure {
            it.colorScheme = initialConfiguration.colorScheme
            it.preloading = initialConfiguration.preloading
            it.platform = initialConfiguration.platform
            it.logLevel = initialConfiguration.logLevel
        }
    }

    @Test
    fun `decorate adds ec_version and ec_delegate`() {
        val result = CheckoutUrlDecorator.decorate(BASE_URL).toUri()
        assertThat(result.getQueryParameter("ec_version")).isEqualTo(CheckoutProtocol.SPEC_VERSION)
        assertThat(result.getQueryParameter("ec_delegate")).isEqualTo("window.open")
        assertThat(result.getQueryParameter("ec_color_scheme")).isEqualTo("automatic")
        assertThat(result.getQueryParameter("ck_branding")).isEqualTo("app")
    }

    @Test
    fun `decorate is idempotent on re-call`() {
        val once = CheckoutUrlDecorator.decorate(BASE_URL)
        val twice = CheckoutUrlDecorator.decorate(once).toUri()
        assertThat(twice.getQueryParameters("ec_version")).hasSize(1)
        assertThat(twice.getQueryParameters("ec_delegate")).hasSize(1)
        assertThat(twice.getQueryParameters("ec_color_scheme")).hasSize(1)
        assertThat(twice.getQueryParameters("ck_branding")).hasSize(1)
    }

    @Test
    fun `decorate preserves existing query parameters`() {
        val url = "$BASE_URL?key=cart_token&utm_source=email"
        val result = CheckoutUrlDecorator.decorate(url).toUri()
        assertThat(result.getQueryParameter("key")).isEqualTo("cart_token")
        assertThat(result.getQueryParameter("utm_source")).isEqualTo("email")
        assertThat(result.getQueryParameter("ec_version")).isEqualTo(CheckoutProtocol.SPEC_VERSION)
    }

    @Test
    fun `decorate replaces caller-supplied supported ECP params and strips unsupported ECP params`() {
        val url = "$BASE_URL?ec_version=override&ec_delegate=custom&ec_auth=token&ec_color_scheme=dark&ck_branding=app"
        val result = CheckoutUrlDecorator.decorate(url).toUri()
        assertThat(result.getQueryParameters("ec_version")).containsExactly(CheckoutProtocol.SPEC_VERSION)
        assertThat(result.getQueryParameters("ec_delegate")).containsExactly("window.open")
        assertThat(result.getQueryParameters("ec_auth")).isEmpty()
        assertThat(result.getQueryParameters("ec_color_scheme")).containsExactly("automatic")
        assertThat(result.getQueryParameters("ck_branding")).containsExactly("app")
    }

    @Test
    fun `decorate derives app branding for app color schemes`() {
        assertColorSchemeDecoratesWith(ColorScheme.Light(), "light", "app")
        assertColorSchemeDecoratesWith(ColorScheme.Dark(), "dark", "app")
        assertColorSchemeDecoratesWith(ColorScheme.Automatic(), "automatic", "app")
    }

    @Test
    fun `decorate derives shop branding for web color scheme`() {
        assertColorSchemeDecoratesWith(ColorScheme.Web(), "web_default", "shop")
    }

    private fun assertColorSchemeDecoratesWith(
        colorScheme: ColorScheme,
        expectedColorScheme: String,
        expectedBranding: String,
    ) {
        ShopifyCheckoutKit.configure {
            it.colorScheme = colorScheme
        }

        val result = CheckoutUrlDecorator.decorate(BASE_URL).toUri()

        assertThat(result.getQueryParameter("ec_color_scheme")).isEqualTo(expectedColorScheme)
        assertThat(result.getQueryParameter("ck_branding")).isEqualTo(expectedBranding)
    }

    private companion object {
        private const val BASE_URL = "https://shop.com/cart/c/abc"
    }
}

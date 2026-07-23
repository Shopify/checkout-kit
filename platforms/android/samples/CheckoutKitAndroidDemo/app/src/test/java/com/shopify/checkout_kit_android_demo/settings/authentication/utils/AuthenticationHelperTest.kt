package com.shopify.checkout_kit_android_demo.settings.authentication.utils

import android.net.Uri
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AuthenticationHelperTest {
    private val helper = AuthenticationHelper(
        clientId = CLIENT_ID,
        redirectUri = REDIRECT_URI,
        baseUrl = ISSUER,
    )

    @Test
    fun `authorization context binds PKCE state and nonce to request`() {
        val context = helper.createAuthorizationContext("fr-CA")
        val url = context.browserRequest.url

        assertThat(url.scheme).isEqualTo("https")
        assertThat(url.path).isEqualTo("/authentication/123/oauth/authorize")
        assertThat(url.getQueryParameter("client_id")).isEqualTo(CLIENT_ID)
        assertThat(url.getQueryParameter("redirect_uri")).isEqualTo(REDIRECT_URI)
        assertThat(url.getQueryParameter("state")).isEqualTo(context.state)
        assertThat(url.getQueryParameter("nonce")).isEqualTo(context.nonce)
        assertThat(url.getQueryParameter("code_challenge_method")).isEqualTo("S256")
        assertThat(url.getQueryParameter("code_challenge")).isNotEqualTo(context.codeVerifier)
        assertThat(url.getQueryParameter("ui_locales")).isEqualTo("fr")
    }

    @Test
    fun `valid callback returns authorization code`() {
        val context = helper.createAuthorizationContext("en")
        val callback = Uri.parse("$REDIRECT_URI?code=authorization-code&state=${context.state}")

        assertThat(helper.authorizationCode(callback, context.state)).isEqualTo("authorization-code")
    }

    @Test
    fun `callback rejects incorrect state`() {
        val callback = Uri.parse("$REDIRECT_URI?code=authorization-code&state=incorrect")

        assertThatThrownBy { helper.authorizationCode(callback, "expected") }
            .isInstanceOf(AuthenticationException::class.java)
            .hasMessageContaining("state")
    }

    @Test
    fun `callback rejects duplicate parameters`() {
        val callback = Uri.parse("$REDIRECT_URI?code=first&code=second&state=expected")

        assertThatThrownBy { helper.authorizationCode(callback, "expected") }
            .isInstanceOf(AuthenticationException::class.java)
            .hasMessageContaining("Duplicate")
    }

    @Test
    fun `callback rejects redirect with a different path`() {
        val callback = Uri.parse("shop.demo.app://callback/other?code=authorization-code&state=expected")

        assertThatThrownBy { helper.authorizationCode(callback, "expected") }
            .isInstanceOf(AuthenticationException::class.java)
            .hasMessageContaining("callback")
    }

    @Test
    fun `oauth error callback is surfaced after state validation`() {
        val callback = Uri.parse("$REDIRECT_URI?error=access_denied&error_description=Not%20now&state=expected")

        assertThatThrownBy { helper.authorizationCode(callback, "expected") }
            .isInstanceOf(AuthenticationException::class.java)
            .hasMessageContaining("access_denied")
    }

    @Test
    fun `logout request returns through the configured redirect`() {
        val request = helper.logoutRequest("id-token")

        assertThat(request.url.path).isEqualTo("/authentication/123/logout")
        assertThat(request.url.getQueryParameter("id_token_hint")).isEqualTo("id-token")
        assertThat(request.url.getQueryParameter("post_logout_redirect_uri")).isEqualTo(REDIRECT_URI)
        assertThat(request.redirectUri.toString()).isEqualTo(REDIRECT_URI)
    }

    private companion object {
        const val CLIENT_ID = "customer-account-client"
        const val ISSUER = "https://shopify.com/authentication/123"
        const val REDIRECT_URI = "shop.demo.app://callback"
    }
}

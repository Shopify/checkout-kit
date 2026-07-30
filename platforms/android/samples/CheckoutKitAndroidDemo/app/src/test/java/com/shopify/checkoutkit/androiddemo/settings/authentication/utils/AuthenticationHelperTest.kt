package com.shopify.checkoutkit.androiddemo.settings.authentication.utils

import android.net.Uri
import androidx.compose.ui.text.intl.Locale
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AuthenticationHelperTest {
    private val helper = AuthenticationHelper(
        clientId = "client-id",
        redirectUri = "com.example.app://callback",
        baseUrl = "https://accounts.example.com",
    )

    @Test
    fun `builds a PKCE authorization request for a supported locale`() {
        val url = Uri.parse(helper.buildAuthorizationURL("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk", Locale("pt-BR")))

        assertEquals("https", url.scheme)
        assertEquals("accounts.example.com", url.host)
        assertEquals("/oauth/authorize", url.path)
        assertEquals("openid email customer-account-api:full", url.getQueryParameter("scope"))
        assertEquals("client-id", url.getQueryParameter("client_id"))
        assertEquals("code", url.getQueryParameter("response_type"))
        assertEquals("com.example.app://callback", url.getQueryParameter("redirect_uri"))
        assertEquals("S256", url.getQueryParameter("code_challenge_method"))
        assertEquals("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM", url.getQueryParameter("code_challenge"))
        assertEquals("pt-BR", url.getQueryParameter("ui_locales"))
        assertState(url.getQueryParameter("state"))
    }

    @Test
    fun `falls back to English for unsupported locales`() {
        val url = Uri.parse(helper.buildAuthorizationURL("verifier", Locale("xx-YY")))

        assertEquals("en", url.getQueryParameter("ui_locales"))
    }

    @Test
    fun `builds token and logout endpoints`() {
        assertEquals("https://accounts.example.com/oauth/token", helper.buildTokenURL())
        assertEquals(
            "https://accounts.example.com/logout?id_token_hint=id-token",
            helper.buildLogoutURL("id-token"),
        )
    }

    @Test
    fun `creates URL safe PKCE verifiers`() {
        val verifier = helper.createCodeVerifier()

        assertEquals(43, verifier.length)
        assertTrue(verifier.matches(Regex("[A-Za-z0-9_-]+")))
    }

    private fun assertState(state: String?) {
        assertNotNull(state)
        assertEquals(36, state!!.length)
        assertTrue(state.matches(Regex("[A-Za-z0-9]+")))
    }
}

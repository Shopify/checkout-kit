package com.shopify.checkoutkit.androiddemo.settings.authentication.utils

import android.net.Uri
import android.util.Base64
import androidx.core.net.toUri
import com.shopify.checkoutkit.androiddemo.settings.authentication.BrowserAuthenticationRequest
import java.security.MessageDigest
import java.security.SecureRandom

/** Values that must remain bound to one authorization request. */
data class AuthorizationContext(
    val browserRequest: BrowserAuthenticationRequest,
    val codeVerifier: String,
    val state: String,
    val nonce: String,
)

class AuthenticationException(message: String) : Exception(message)

/** Builds and validates the Customer Account API OAuth authorization flow. */
class AuthenticationHelper(
    val clientId: String,
    val redirectUri: String,
    baseUrl: String,
) {
    val issuer: String = baseUrl.trimEnd('/')

    fun createAuthorizationContext(locale: String): AuthorizationContext {
        validateConfiguration()
        val codeVerifier = randomUrlSafeString()
        val state = randomUrlSafeString()
        val nonce = randomUrlSafeString()
        val authorizationUri = "$issuer/oauth/authorize".toUri().buildUpon()
            .appendQueryParameter("scope", "openid email customer-account-api:full")
            .appendQueryParameter("client_id", clientId)
            .appendQueryParameter("response_type", "code")
            .appendQueryParameter("redirect_uri", redirectUri)
            .appendQueryParameter("state", state)
            .appendQueryParameter("nonce", nonce)
            .appendQueryParameter("code_challenge", codeChallenge(codeVerifier))
            .appendQueryParameter("code_challenge_method", "S256")
            .appendQueryParameter("ui_locales", uiLocale(locale))
            .build()

        return AuthorizationContext(
            browserRequest = BrowserAuthenticationRequest(authorizationUri, redirectUri.toUri()),
            codeVerifier = codeVerifier,
            state = state,
            nonce = nonce,
        )
    }

    fun authorizationCode(callbackUri: Uri, expectedState: String): String {
        if (!callbackUri.matchesRedirect(redirectUri.toUri()) || callbackUri.fragment != null) {
            throw AuthenticationException("Invalid authorization callback")
        }

        val parameters = callbackUri.singleValueQueryParameters()
        if (parameters["state"] != expectedState) {
            throw AuthenticationException("Authorization state did not match")
        }

        parameters["error"]?.let { error ->
            val description = parameters["error_description"]?.takeIf(String::isNotBlank)
            throw AuthenticationException(description?.let { "$error: $it" } ?: error)
        }

        return parameters["code"]?.takeIf(String::isNotBlank)
            ?: throw AuthenticationException("Authorization code is missing")
    }

    fun tokenUrl(): String = "$issuer/oauth/token"

    private fun validateConfiguration() {
        val issuerUri = issuer.toUri()
        val callbackUri = redirectUri.toUri()
        val callbackScheme = callbackUri.scheme.orEmpty()
        val callbackHasAuthority = !callbackUri.host.isNullOrBlank()
        if (
            clientId.isBlank() ||
            !issuerUri.scheme.equals("https", ignoreCase = true) ||
            issuerUri.host.isNullOrBlank() ||
            callbackScheme.isBlank() ||
            !callbackHasAuthority ||
            callbackUri.query != null ||
            callbackUri.fragment != null ||
            callbackScheme.equals("http", ignoreCase = true)
        ) {
            throw AuthenticationException("Invalid Customer Account API configuration")
        }
    }

    private fun randomUrlSafeString(): String {
        val bytes = ByteArray(32)
        SecureRandom().nextBytes(bytes)
        return bytes.base64UrlEncode()
    }

    private fun codeChallenge(verifier: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray(Charsets.UTF_8))
        return digest.base64UrlEncode()
    }

    private fun ByteArray.base64UrlEncode(): String {
        return Base64.encodeToString(this, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
    }

    private fun Uri.singleValueQueryParameters(): Map<String, String> {
        return try {
            queryParameterNames.associateWith { name ->
                val values = getQueryParameters(name)
                if (values.size != 1) {
                    throw AuthenticationException("Duplicate authorization parameter")
                }
                values.single()
            }
        } catch (error: AuthenticationException) {
            throw error
        } catch (error: Exception) {
            throw AuthenticationException("Invalid authorization callback")
        }
    }

    private fun Uri.matchesRedirect(expected: Uri): Boolean {
        return scheme.equals(expected.scheme, ignoreCase = true) &&
            host.equals(expected.host, ignoreCase = true) &&
            port == expected.port &&
            path.orEmpty() == expected.path.orEmpty()
    }

    private fun uiLocale(locale: String): String {
        if (SUPPORTED_LOCALES.contains(locale)) return locale
        val language = locale.substringBefore('-').substringBefore('_')
        return language.takeIf(SUPPORTED_LOCALES::contains) ?: DEFAULT_LANGUAGE
    }

    companion object {
        private val SUPPORTED_LOCALES = setOf(
            "en", "fr", "cs", "da", "de", "el", "es", "fi", "hi", "hr", "hu", "id", "it", "ja", "ko", "lt", "ms", "nb",
            "nl", "pl", "pt-BR", "pt-PT", "ro", "ru", "sk", "sl", "sv", "th", "tr", "vi", "zh-CN", "zh-TW",
        )
        private const val DEFAULT_LANGUAGE = "en"
    }
}

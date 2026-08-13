package com.shopify.checkoutkit.androiddemo.settings.authentication.data.source.network

import com.shopify.checkoutkit.androiddemo.settings.authentication.data.AccessToken
import com.shopify.checkoutkit.androiddemo.settings.authentication.utils.AuthenticationHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.FormBody
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import timber.log.Timber
import java.io.IOException

/**
 * Client for interacting with Customer Account API
 * for [Authentication](https://shopify.dev/docs/api/customer#authentication)
 */
class CustomerAccountsApiRestClient(
    private val client: OkHttpClient,
    private val json: Json,
    private val helper: AuthenticationHelper,
    private val clientId: String,
    private val redirectUri: String,
) {

    /**
     * Executes an [access token request](https://shopify.dev/docs/api/customer#step-obtain-access-token)
     */
    suspend fun fetchAccessToken(code: String, codeVerifier: String): OAuthTokenResult {
        Timber.i("Exchanging code for access token")
        val requestBody = FormBody.Builder()
            .add("grant_type", "authorization_code")
            .add("client_id", clientId)
            .add("redirect_uri", redirectUri)
            .add("code", code)
            .add("code_verifier", codeVerifier)
            .build()

        val request = Request.Builder()
            .url(helper.tokenUrl())
            .post(requestBody)
            .addHeader("Content-Type", "application/x-www-form-urlencoded")
            .build()

        return executeOAuthTokenRequest(request)
    }

    /**
     * Executes a [refresh token request](https://shopify.dev/docs/api/customer#step-using-refresh-token)
     */
    suspend fun refreshAccessToken(refreshToken: String): OAuthTokenResult {
        Timber.i("Refreshing access token")
        val requestBody = FormBody.Builder()
            .add("grant_type", "refresh_token")
            .add("client_id", clientId)
            .add("refresh_token", refreshToken)
            .build()

        val request = Request.Builder()
            .url(helper.tokenUrl())
            .post(requestBody)
            .addHeader("Content-Type", "application/x-www-form-urlencoded")
            .build()
        return executeOAuthTokenRequest(request)
    }

    suspend fun logout(idToken: String) {
        val logoutUrl = helper.issuer.toHttpUrl().newBuilder()
            .addPathSegment("logout")
            .addQueryParameter("id_token_hint", idToken)
            .build()
        val request = Request.Builder()
            .url(logoutUrl)
            .get()
            .build()

        withContext(Dispatchers.IO) {
            try {
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        Timber.w("Customer Account logout failed with HTTP ${response.code}")
                    }
                }
            } catch (error: IOException) {
                Timber.w(error, "Customer Account logout request failed")
            }
        }
    }

    private suspend fun executeOAuthTokenRequest(request: Request): OAuthTokenResult {
        return withContext(Dispatchers.IO) {
            try {
                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val token = json.decodeFromString<AccessToken>(response.bodyOrThrow())
                        OAuthTokenResult.Success(token)
                    } else {
                        OAuthTokenResult.Error("HTTP ${response.code}")
                    }
                }
            } catch (e: IOException) {
                Timber.e("Failed to obtain token $e")
                OAuthTokenResult.Error(e.message ?: "Unknown error")
            }
        }
    }
}

sealed class OAuthTokenResult {
    data class Success(
        val token: AccessToken,
    ) : OAuthTokenResult()

    data class Error(
        val message: String
    ) : OAuthTokenResult()
}

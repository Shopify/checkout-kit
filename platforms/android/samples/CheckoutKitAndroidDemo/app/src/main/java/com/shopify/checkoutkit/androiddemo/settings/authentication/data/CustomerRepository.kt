package com.shopify.checkoutkit.androiddemo.settings.authentication.data

import com.shopify.checkoutkit.androiddemo.settings.authentication.data.source.local.CustomerAccessTokenStore
import com.shopify.checkoutkit.androiddemo.settings.authentication.data.source.network.CustomerAccountsApiGraphQLClient
import com.shopify.checkoutkit.androiddemo.settings.authentication.data.source.network.CustomerAccountsApiRestClient
import com.shopify.checkoutkit.androiddemo.settings.authentication.data.source.network.CustomerResponse
import com.shopify.checkoutkit.androiddemo.settings.authentication.data.source.network.OAuthTokenResult
import com.shopify.checkoutkit.androiddemo.settings.authentication.BrowserAuthenticationRequest
import com.shopify.checkoutkit.androiddemo.settings.authentication.BrowserAuthenticationResult
import com.shopify.checkoutkit.androiddemo.settings.authentication.utils.AuthenticationHelper
import com.shopify.checkoutkit.androiddemo.settings.authentication.utils.IDTokenValidator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber

/**
 * Repository for customers and customer access tokens
 */
class CustomerRepository(
    private val restClient: CustomerAccountsApiRestClient,
    private val graphQLClient: CustomerAccountsApiGraphQLClient,
    private val localTokenStore: CustomerAccessTokenStore,
    private val authenticationHelper: AuthenticationHelper,
    private val idTokenValidator: IDTokenValidator,
) {

    private val repositoryScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated.asStateFlow()

    init {
        repositoryScope.launch {
            updateAuthenticationState()
        }
    }

    /**
     * Returns a customer using a Customer Accounts API access token
     *
     * Returns null if user not logged in, and token is not stored
     * First refreshes the token if it has expired
     */
    suspend fun getCustomer(): Customer? {
        val token = getCustomerAccessToken() ?: return null
        when (val result = graphQLClient.getCustomer(token)) {
            is CustomerResponse.Success -> {
                Timber.i("Fetched customer account")
                return result.customer
            }

            is CustomerResponse.Error -> {
                Timber.e("Error when fetching customer, ${result.message}")
                return null
            }
        }
    }

    /**
     * Gets a stored access token, refreshes if expired.
     *
     * returns null if no token stored or if refresh fails, otherwise an
     * unexpired access token
     */
    suspend fun getCustomerAccessToken(): AccessToken? {
        val localToken = localTokenStore.find() ?: return null

        if (!localToken.hasExpired()) {
            return localToken
        }

        val refreshToken = localToken.refreshToken
        if (refreshToken == null) {
            clearSession()
            return null
        }

        return restClient.refreshAccessToken(refreshToken).toToken(
            previousToken = localToken,
            expectedNonce = null,
            clearOnFailure = true,
        )
    }

    /**
     * Creates a new access token and stores it locally
     */
    suspend fun createCustomerAccessToken(code: String, codeVerifier: String, expectedNonce: String): AccessToken? {
        return restClient.fetchAccessToken(code, codeVerifier).toToken(
            previousToken = null,
            expectedNonce = expectedNonce,
            clearOnFailure = false,
        )
    }

    suspend fun prepareLogout(): BrowserAuthenticationRequest? {
        val idToken = localTokenStore.find()?.idToken
        if (idToken == null) {
            clearSession()
            return null
        }
        return authenticationHelper.logoutRequest(idToken)
    }

    suspend fun completeLogout(result: BrowserAuthenticationResult) {
        try {
            if (result is BrowserAuthenticationResult.Redirect) {
                authenticationHelper.validateLogoutCallback(result.uri)
            }
        } catch (error: Exception) {
            Timber.w(error, "Customer Account browser logout did not complete")
        } finally {
            clearSession()
        }
    }

    suspend fun clearSession() {
        localTokenStore.delete()
        updateAuthenticationState()
    }

    private suspend fun OAuthTokenResult.toToken(
        previousToken: AccessToken?,
        expectedNonce: String?,
        clearOnFailure: Boolean,
    ): AccessToken? {
        return when (this) {
            is OAuthTokenResult.Success -> {
                val responseToken = token
                val token = responseToken.copy(
                    refreshToken = responseToken.refreshToken ?: previousToken?.refreshToken,
                    idToken = responseToken.idToken ?: previousToken?.idToken,
                )
                val idToken = token.idToken
                if (idToken == null) {
                    Timber.w("Customer Account token response did not include an ID token")
                    if (clearOnFailure) clearSession()
                    null
                } else {
                    try {
                        if (expectedNonce != null || responseToken.idToken != null) {
                            idTokenValidator.validate(idToken, expectedNonce)
                        }
                        if (!localTokenStore.save(token)) {
                            Timber.w("Customer Account token could not be stored")
                            if (clearOnFailure) clearSession()
                            return null
                        }
                        updateAuthenticationState()
                        Timber.i("Customer Account API token stored")
                        token
                    } catch (error: Exception) {
                        Timber.w(error, "Customer Account ID token validation failed")
                        if (clearOnFailure) clearSession()
                        null
                    }
                }
            }

            is OAuthTokenResult.Error -> {
                Timber.w("Failed to fetch Customer Account API token: ${this.message}")
                if (clearOnFailure) clearSession()
                null
            }
        }
    }

    private suspend fun updateAuthenticationState() {
        val token = localTokenStore.find()
        val isAuthenticated = token != null && !token.hasExpired()
        _isAuthenticated.value = isAuthenticated
    }
}

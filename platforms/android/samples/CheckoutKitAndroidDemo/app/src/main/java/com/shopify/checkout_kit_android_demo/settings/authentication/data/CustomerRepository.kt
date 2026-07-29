package com.shopify.checkout_kit_android_demo.settings.authentication.data

import com.shopify.checkout_kit_android_demo.settings.authentication.data.source.local.CustomerAccessTokenStore
import com.shopify.checkout_kit_android_demo.settings.authentication.data.source.network.CustomerAccountsApiGraphQLClient
import com.shopify.checkout_kit_android_demo.settings.authentication.data.source.network.CustomerAccountsApiRestClient
import com.shopify.checkout_kit_android_demo.settings.authentication.data.source.network.CustomerResponse
import com.shopify.checkout_kit_android_demo.settings.authentication.data.source.network.OAuthTokenResult
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
                Timber.i("Customer Account API customer retrieved")
                return result.customer
            }

            is CustomerResponse.Error -> {
                Timber.e("Error when fetching customer from Customer Account API")
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

        val refreshedToken = restClient.refreshAccessToken(localToken).toToken()
        updateAuthenticationState(refreshedToken)
        return refreshedToken
    }

    /**
     * Creates a new access token and stores it locally
     */
    suspend fun createCustomerAccessToken(code: String, codeVerifier: String): AccessToken? {
        val customerAccessToken = localTokenStore.find()
        if (customerAccessToken != null) {
            Timber.i("Locally stored customer access token found")
            if (!customerAccessToken.hasExpired()) {
                Timber.i("Returning locally stored customer access token")
                return customerAccessToken
            } else {
                Timber.i("Locally stored customer access token expired, refreshing")
                val refreshedToken = restClient.refreshAccessToken(customerAccessToken).toToken()
                updateAuthenticationState(refreshedToken)
                return refreshedToken
            }
        }

        Timber.i("No locally stored token found, fetching remote token")
        val newToken = restClient.fetchAccessToken(code, codeVerifier).toToken()
        updateAuthenticationState(newToken)
        return newToken
    }

    suspend fun logout() {
        val idToken = getCustomerAccessToken()?.idToken ?: ""
        Timber.i("Logging out and deleting stored token")
        restClient.logout(idToken)
        if (!localTokenStore.delete()) {
            Timber.w("Unable to delete stored customer access token")
        }
        updateAuthenticationState()
    }

    private suspend fun OAuthTokenResult.toToken(): AccessToken? {
        return when (this) {
            is OAuthTokenResult.Success -> {
                Timber.i("Customer Account API token retrieved, expires at ${this.token.expiresAt}")
                if (localTokenStore.save(this.token)) {
                    this.token
                } else {
                    Timber.w("Unable to persist Customer Account API token")
                    if (!localTokenStore.delete()) {
                        Timber.w("Unable to delete stored customer access token")
                    }
                    null
                }
            }

            is OAuthTokenResult.Error -> {
                Timber.i("Failed to fetch Customer Account API token")
                null
            }
        }
    }

    private suspend fun updateAuthenticationState() {
        updateAuthenticationState(localTokenStore.find())
    }

    private fun updateAuthenticationState(token: AccessToken?) {
        _isAuthenticated.value = token != null && !token.hasExpired()
    }
}

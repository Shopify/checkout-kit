package com.shopify.checkoutkit.androiddemo.settings.authentication

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shopify.checkoutkit.androiddemo.settings.authentication.data.CustomerRepository
import com.shopify.checkoutkit.androiddemo.settings.authentication.utils.AuthenticationHelper
import com.shopify.checkoutkit.androiddemo.settings.authentication.utils.AuthorizationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber

class LoginViewModel(
    private val authenticationHelper: AuthenticationHelper,
    private val customerRepository: CustomerRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUIState())
    val uiState: StateFlow<LoginUIState> = _uiState.asStateFlow()

    /**
     * Updates state (e.g. from Loading) to LoggedOut if the customer has not yet authenticated
     * or LoggedIn if already authenticated
     */
    fun checkLoginState(locale: String) = viewModelScope.launch {
        Timber.i("Checking logged in state")
        val token = customerRepository.getCustomerAccessToken()
        if (token == null) {
            Timber.i("Not yet logged in")
            _uiState.value = try {
                LoginUIState(Status.LoggedOut(authenticationHelper.createAuthorizationContext(locale)))
            } catch (error: Exception) {
                Timber.w(error, "Unable to create Customer Account authorization request")
                LoginUIState(Status.Error(error.message.orEmpty()))
            }
        } else {
            Timber.i("Logged in")
            _uiState.value = LoginUIState(Status.LoggedIn)
        }
    }

    /**
     * When the customer completes login, an authorization code param is intercepted on the redirect
     * and must be exchanged for an access token along with the code verifier
     */
    fun browserAuthenticationCompleted(result: BrowserAuthenticationResult) = viewModelScope.launch {
        val authorizationContext = (_uiState.value.status as? Status.LoggedOut)?.authorizationContext ?: return@launch
        when (result) {
            BrowserAuthenticationResult.Cancelled -> Unit
            is BrowserAuthenticationResult.Failed -> {
                _uiState.value = LoginUIState(Status.Error(result.reason))
            }

            is BrowserAuthenticationResult.Redirect -> {
                _uiState.value = LoginUIState(Status.Loading)
                try {
                    val code = authenticationHelper.authorizationCode(result.uri, authorizationContext.state)
                    val token = customerRepository.createCustomerAccessToken(
                        code = code,
                        codeVerifier = authorizationContext.codeVerifier,
                        expectedNonce = authorizationContext.nonce,
                    )
                    _uiState.value = if (token != null) {
                        LoginUIState(Status.LoggedIn)
                    } else {
                        LoginUIState(Status.Error("Failed to create token"))
                    }
                } catch (error: Exception) {
                    Timber.w(error, "Customer Account authorization failed")
                    _uiState.value = LoginUIState(Status.Error(error.message.orEmpty()))
                }
            }
        }
    }
}

data class LoginUIState(
    val status: Status = Status.Loading,
)

sealed class Status {
    data object Loading : Status()
    data object LoggedIn : Status()
    data class LoggedOut(val authorizationContext: AuthorizationContext) : Status()

    data class Error(val message: String) : Status()
}

package com.shopify.checkoutkit.androiddemo.settings.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shopify.checkoutkit.androiddemo.settings.authentication.data.Customer
import com.shopify.checkoutkit.androiddemo.settings.authentication.data.CustomerRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AccountViewModel(
    private val customerRepository: CustomerRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<UIState>(UIState.Loading)
    val uiState: StateFlow<UIState> = _uiState.asStateFlow()

    /**
     * Loads customer if they have logged in and a token is stored
     */
    fun loadCustomer() = viewModelScope.launch {
        val customer = customerRepository.getCustomer()
        if (customer != null) {
            _uiState.value = UIState.Loaded(customer)
        } else {
            _uiState.value = UIState.Error
        }
    }
}

sealed class UIState {
    data object Loading : UIState()
    data object Error : UIState()
    data class Loaded(val customer: Customer) : UIState()
}

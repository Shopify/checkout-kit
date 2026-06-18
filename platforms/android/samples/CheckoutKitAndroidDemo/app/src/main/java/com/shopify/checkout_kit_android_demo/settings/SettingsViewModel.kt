package com.shopify.checkout_kit_android_demo.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shopify.checkout_kit_android_demo.BuildConfig
import com.shopify.checkout_kit_android_demo.common.withCustomCloseIcon
import com.shopify.checkout_kit_android_demo.settings.authentication.data.CustomerRepository
import com.shopify.checkout_kit_android_demo.settings.data.Settings
import com.shopify.checkout_kit_android_demo.settings.data.SettingsRepository
import com.shopify.checkout_kit_android_demo.settings.data.WindowOpenHandler
import com.shopify.checkoutkit.ColorScheme
import com.shopify.checkoutkit.Preloading
import com.shopify.checkoutkit.ShopifyCheckoutKit
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

class SettingsViewModel(
    private val settingsRepository: SettingsRepository,
    private val customerRepository: CustomerRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow<SettingsUiState>(SettingsUiState.Loading)
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                settingsRepository.observeSettings(),
                customerRepository.isAuthenticated
            ) { settings, isAuthenticated ->
                SettingsUiState.Loaded(
                    settings = settings,
                    sdkVersion = ShopifyCheckoutKit.VERSION,
                    sampleAppVersion = BuildConfig.VERSION_NAME,
                    isAuthenticated = isAuthenticated
                )
            }.collect { uiState ->
                _uiState.value = uiState
            }
        }
    }

    fun setColorScheme(colorScheme: ColorScheme) = viewModelScope.launch {
        ShopifyCheckoutKit.configure {
            it.colorScheme = colorScheme.withCustomCloseIcon()
        }
        settingsRepository.setColorScheme(colorScheme)
    }

    fun setBuyerIdentityDemoEnabled(enabled: Boolean) = viewModelScope.launch {
        settingsRepository.setBuyerIdentityDemoEnabled(enabled)
    }

    fun setCheckoutPreloadingEnabled(enabled: Boolean) = viewModelScope.launch {
        ShopifyCheckoutKit.configure {
            it.preloading = Preloading(enabled = enabled)
        }
        settingsRepository.setCheckoutPreloadingEnabled(enabled)
    }

    fun setWindowOpenHandler(handler: WindowOpenHandler) = viewModelScope.launch {
        settingsRepository.setWindowOpenHandler(handler)
    }

    fun logout() = viewModelScope.launch {
        customerRepository.logout()
    }
}

sealed class SettingsUiState {
    data object Loading : SettingsUiState()
    data class Loaded(
        val settings: Settings,
        val sdkVersion: String,
        val sampleAppVersion: String,
        val isAuthenticated: Boolean,
    ) : SettingsUiState()
}

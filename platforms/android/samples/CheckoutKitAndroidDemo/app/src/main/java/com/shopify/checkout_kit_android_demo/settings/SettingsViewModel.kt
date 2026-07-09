package com.shopify.checkout_kit_android_demo.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shopify.checkout_kit_android_demo.BuildConfig
import com.shopify.checkout_kit_android_demo.common.withCustomCloseIcon
import com.shopify.checkout_kit_android_demo.settings.authentication.data.CustomerRepository
import com.shopify.checkout_kit_android_demo.settings.data.CheckoutSheetPreset
import com.shopify.checkout_kit_android_demo.settings.data.Settings
import com.shopify.checkout_kit_android_demo.settings.data.SettingsRepository
import com.shopify.checkout_kit_android_demo.settings.data.WindowOpenHandler
import com.shopify.checkout_kit_android_demo.settings.data.toCheckoutSheetOptions
import com.shopify.checkoutkit.CheckoutAppearance
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

    fun setAppearance(appearance: CheckoutAppearance) = viewModelScope.launch {
        ShopifyCheckoutKit.configure {
            it.appearance = appearance.withCustomCloseIcon()
        }
        settingsRepository.setAppearance(appearance)
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

    fun setTapAwayToDismissEnabled(enabled: Boolean) = viewModelScope.launch {
        val settings = currentSettings()
        val checkoutSheetPreset = settings?.checkoutSheetPreset ?: CheckoutSheetPreset.NewDefaults
        val dragToDismissEnabled = settings?.dragToDismissEnabled ?: true
        ShopifyCheckoutKit.configure {
            it.sheet = checkoutSheetPreset.toCheckoutSheetOptions(
                dragToDismissEnabled = dragToDismissEnabled,
                tapAwayToDismissEnabled = enabled,
            )
        }
        settingsRepository.setTapAwayToDismissEnabled(enabled)
    }

    fun setWindowOpenHandler(handler: WindowOpenHandler) = viewModelScope.launch {
        settingsRepository.setWindowOpenHandler(handler)
    }

    fun setCheckoutSheetPreset(preset: CheckoutSheetPreset) = viewModelScope.launch {
        val settings = currentSettings()
        val dragToDismissEnabled = settings?.dragToDismissEnabled ?: true
        val tapAwayToDismissEnabled = settings?.tapAwayToDismissEnabled ?: true
        ShopifyCheckoutKit.configure {
            it.sheet = preset.toCheckoutSheetOptions(
                dragToDismissEnabled = dragToDismissEnabled,
                tapAwayToDismissEnabled = tapAwayToDismissEnabled,
            )
        }
        settingsRepository.setCheckoutSheetPreset(preset)
    }

    fun setDragToDismissEnabled(enabled: Boolean) = viewModelScope.launch {
        val settings = currentSettings()
        val checkoutSheetPreset = settings?.checkoutSheetPreset ?: CheckoutSheetPreset.NewDefaults
        val tapAwayToDismissEnabled = settings?.tapAwayToDismissEnabled ?: true
        ShopifyCheckoutKit.configure {
            it.sheet = checkoutSheetPreset.toCheckoutSheetOptions(
                dragToDismissEnabled = enabled,
                tapAwayToDismissEnabled = tapAwayToDismissEnabled,
            )
        }
        settingsRepository.setDragToDismissEnabled(enabled)
    }

    fun logout() = viewModelScope.launch {
        customerRepository.logout()
    }

    private fun currentSettings(): Settings? =
        (_uiState.value as? SettingsUiState.Loaded)?.settings
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

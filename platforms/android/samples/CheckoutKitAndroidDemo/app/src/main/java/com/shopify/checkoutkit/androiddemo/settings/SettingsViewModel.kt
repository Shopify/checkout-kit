package com.shopify.checkoutkit.androiddemo.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shopify.checkoutkit.CheckoutAppearance
import com.shopify.checkoutkit.Preloading
import com.shopify.checkoutkit.ShopifyCheckoutKit
import com.shopify.checkoutkit.androiddemo.BuildConfig
import com.shopify.checkoutkit.androiddemo.common.withCustomCloseIcon
import com.shopify.checkoutkit.androiddemo.settings.authentication.data.AuthenticationState
import com.shopify.checkoutkit.androiddemo.settings.authentication.data.CustomerRepository
import com.shopify.checkoutkit.androiddemo.settings.data.CheckoutPresentationMode
import com.shopify.checkoutkit.androiddemo.settings.data.CheckoutSheetPreset
import com.shopify.checkoutkit.androiddemo.settings.data.Settings
import com.shopify.checkoutkit.androiddemo.settings.data.SettingsRepository
import com.shopify.checkoutkit.androiddemo.settings.data.WindowOpenHandler
import com.shopify.checkoutkit.androiddemo.settings.data.toCheckoutSheetOptions
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
                customerRepository.authenticationState
            ) { settings, authenticationState ->
                when (authenticationState) {
                    AuthenticationState.Loading -> SettingsUiState.Loading
                    AuthenticationState.Authenticated,
                    AuthenticationState.Unauthenticated -> SettingsUiState.Loaded(
                        settings = settings,
                        sdkVersion = ShopifyCheckoutKit.VERSION,
                        sampleAppVersion = BuildConfig.VERSION_NAME,
                        isAuthenticated = authenticationState == AuthenticationState.Authenticated
                    )
                }
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

    fun setCheckoutPresentationMode(mode: CheckoutPresentationMode) = viewModelScope.launch {
        val settings = currentSettings()
        ShopifyCheckoutKit.configure {
            it.sheet = mode.toCheckoutSheetOptions(
                preset = settings?.checkoutSheetPreset ?: CheckoutSheetPreset.NewDefaults,
                dragToDismissEnabled = settings?.dragToDismissEnabled ?: true,
                tapAwayToDismissEnabled = settings?.tapAwayToDismissEnabled ?: true,
            )
        }
        settingsRepository.setCheckoutPresentationMode(mode)
    }

    fun setTapAwayToDismissEnabled(enabled: Boolean) = viewModelScope.launch {
        val settings = currentSettings()
        val checkoutSheetPreset = settings?.checkoutSheetPreset ?: CheckoutSheetPreset.NewDefaults
        val checkoutPresentationMode = settings?.checkoutPresentationMode ?: CheckoutPresentationMode.CheckoutKitSheet
        val dragToDismissEnabled = settings?.dragToDismissEnabled ?: true
        ShopifyCheckoutKit.configure {
            it.sheet = checkoutPresentationMode.toCheckoutSheetOptions(
                preset = checkoutSheetPreset,
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
        val checkoutPresentationMode = settings?.checkoutPresentationMode ?: CheckoutPresentationMode.CheckoutKitSheet
        val dragToDismissEnabled = settings?.dragToDismissEnabled ?: true
        val tapAwayToDismissEnabled = settings?.tapAwayToDismissEnabled ?: true
        ShopifyCheckoutKit.configure {
            it.sheet = checkoutPresentationMode.toCheckoutSheetOptions(
                preset = preset,
                dragToDismissEnabled = dragToDismissEnabled,
                tapAwayToDismissEnabled = tapAwayToDismissEnabled,
            )
        }
        settingsRepository.setCheckoutSheetPreset(preset)
    }

    fun setDragToDismissEnabled(enabled: Boolean) = viewModelScope.launch {
        val settings = currentSettings()
        val checkoutSheetPreset = settings?.checkoutSheetPreset ?: CheckoutSheetPreset.NewDefaults
        val checkoutPresentationMode = settings?.checkoutPresentationMode ?: CheckoutPresentationMode.CheckoutKitSheet
        val tapAwayToDismissEnabled = settings?.tapAwayToDismissEnabled ?: true
        ShopifyCheckoutKit.configure {
            it.sheet = checkoutPresentationMode.toCheckoutSheetOptions(
                preset = checkoutSheetPreset,
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

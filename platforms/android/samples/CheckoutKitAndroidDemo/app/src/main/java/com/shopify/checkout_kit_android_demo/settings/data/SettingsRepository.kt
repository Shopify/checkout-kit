package com.shopify.checkout_kit_android_demo.settings.data

import com.shopify.checkout_kit_android_demo.settings.PreferencesManager
import com.shopify.checkoutkit.ColorScheme
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class SettingsRepository(
    private val preferencesManager: PreferencesManager
) {

    /**
     * Observe changes to settings
     */
    fun observeSettings(): Flow<Settings> {
        return preferencesManager.userPreferencesFlow.map { preferences ->
            Settings(
                colorScheme = preferences.colorScheme,
                buyerIdentityDemoEnabled = preferences.buyerIdentityDemoEnabled,
                checkoutPreloadingEnabled = preferences.checkoutPreloadingEnabled,
                dragToDismissEnabled = preferences.dragToDismissEnabled,
                tapAwayToDismissEnabled = preferences.tapAwayToDismissEnabled,
                windowOpenHandler = preferences.windowOpenHandler,
                checkoutSheetPreset = preferences.checkoutSheetPreset,
            )
        }
    }

    /**
     * Update the [colorScheme](https://github.com/Shopify/checkout-kit-android/?tab=readme-ov-file#color-scheme) setting
     */
    suspend fun setColorScheme(colorScheme: ColorScheme) {
        preferencesManager.setColorScheme(colorScheme)
    }

    /**
     * Update the buyerIdentity setting, which sets some pre-known customer details
     * in Cart buyerIdentityInput, prefilling checkout
     */
    suspend fun setBuyerIdentityDemoEnabled(enabled: Boolean) {
        preferencesManager.setBuyerIdentityDemoEnabled(enabled)
    }

    suspend fun setCheckoutPreloadingEnabled(enabled: Boolean) {
        preferencesManager.setCheckoutPreloadingEnabled(enabled)
    }

    suspend fun setDragToDismissEnabled(enabled: Boolean) {
        preferencesManager.setDragToDismissEnabled(enabled)
    }

    suspend fun setTapAwayToDismissEnabled(enabled: Boolean) {
        preferencesManager.setTapAwayToDismissEnabled(enabled)
    }

    suspend fun setWindowOpenHandler(handler: WindowOpenHandler) {
        preferencesManager.setWindowOpenHandler(handler)
    }

    suspend fun setCheckoutSheetPreset(preset: CheckoutSheetPreset) {
        preferencesManager.setCheckoutSheetPreset(preset)
    }
}

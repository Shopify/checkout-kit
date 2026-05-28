package com.shopify.checkout_kit_mobile_buy_integration_sample.settings.data

import com.shopify.checkout_kit_mobile_buy_integration_sample.settings.PreferencesManager
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
                windowOpenHandler = preferences.windowOpenHandler,
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

    suspend fun setWindowOpenHandler(handler: WindowOpenHandler) {
        preferencesManager.setWindowOpenHandler(handler)
    }
}

package com.shopify.checkout_kit_mobile_buy_integration_sample.settings.data

import com.shopify.checkoutkit.ColorScheme

data class Settings(
    val colorScheme: ColorScheme,
    val buyerIdentityDemoEnabled: Boolean,
    val windowOpenHandler: WindowOpenHandler,
)

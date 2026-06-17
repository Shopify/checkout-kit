package com.shopify.checkout_kit_android_demo.settings.data

import com.shopify.checkoutkit.ColorScheme

data class Settings(
    val colorScheme: ColorScheme,
    val buyerIdentityDemoEnabled: Boolean,
    val checkoutPreloadingEnabled: Boolean,
    val windowOpenHandler: WindowOpenHandler,
)

package com.shopify.checkout_kit_android_demo.common

import com.shopify.checkout_kit_android_demo.R
import com.shopify.checkoutkit.Color
import com.shopify.checkoutkit.ColorScheme

fun ColorScheme.withCustomCloseIcon(): ColorScheme {
    return when (this) {
        is ColorScheme.Automatic -> {
            this.customize(
                light = { closeIconTint = Color.ResourceId(R.color.light_theme_close_icon) },
                dark = { closeIconTint = Color.ResourceId(R.color.dark_theme_close_icon) }
            )
        }

        else -> {
            this.customize {
                closeIconTint = Color.ResourceId(R.color.light_theme_close_icon)
            }
        }
    }
}

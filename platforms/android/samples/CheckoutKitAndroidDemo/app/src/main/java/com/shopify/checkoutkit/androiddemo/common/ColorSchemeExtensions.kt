package com.shopify.checkoutkit.androiddemo.common

import com.shopify.checkoutkit.CheckoutAppearance
import com.shopify.checkoutkit.Color
import com.shopify.checkoutkit.ColorScheme
import com.shopify.checkoutkit.androiddemo.R

fun sampleStorefrontAppearance(): CheckoutAppearance.Storefront {
    return CheckoutAppearance.Storefront().customize {
        headerBackground = Color.ResourceId(R.color.header_bg)
        headerFont = Color.ResourceId(R.color.header_font)
        webViewBackground = Color.ResourceId(R.color.web_view_bg)
        progressIndicator = Color.ResourceId(R.color.bright_progress_indicator)
    }
}

fun CheckoutAppearance.withCustomCloseIcon(): CheckoutAppearance {
    return when (this) {
        is CheckoutAppearance.App -> copy(colorScheme = colorScheme.withCustomCloseIcon())
        is CheckoutAppearance.Storefront -> customize {
            closeIconTint = Color.ResourceId(R.color.light_theme_close_icon)
        }
    }
}

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

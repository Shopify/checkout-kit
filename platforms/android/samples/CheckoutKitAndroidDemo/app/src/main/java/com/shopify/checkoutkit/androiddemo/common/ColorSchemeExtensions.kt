package com.shopify.checkoutkit.androiddemo.common

import com.shopify.checkoutkit.androiddemo.R
import com.shopify.checkoutkit.checkout.CheckoutAppearance
import com.shopify.checkoutkit.checkout.Color
import com.shopify.checkoutkit.checkout.ColorScheme

fun sampleStorefrontAppearance(): CheckoutAppearance.Storefront {
    return CheckoutAppearance.Storefront().customize {
        headerBackgroundColor = Color.ResourceId(R.color.header_bg)
        headerTitleColor = Color.ResourceId(R.color.header_title)
        webViewBackgroundColor = Color.ResourceId(R.color.web_view_bg)
        progressIndicatorColor = Color.ResourceId(R.color.bright_progress_indicator)
    }
}

fun CheckoutAppearance.withCustomCloseIcon(): CheckoutAppearance {
    return when (this) {
        is CheckoutAppearance.App -> copy(colorScheme = colorScheme.withCustomCloseIcon())
        is CheckoutAppearance.Storefront -> customize {
            closeIconTintColor = Color.ResourceId(R.color.light_theme_close_icon)
        }
    }
}

fun ColorScheme.withCustomCloseIcon(): ColorScheme {
    return when (this) {
        is ColorScheme.Automatic -> {
            this.customize(
                light = { closeIconTintColor = Color.ResourceId(R.color.light_theme_close_icon) },
                dark = { closeIconTintColor = Color.ResourceId(R.color.dark_theme_close_icon) }
            )
        }

        else -> {
            this.customize {
                closeIconTintColor = Color.ResourceId(R.color.light_theme_close_icon)
            }
        }
    }
}

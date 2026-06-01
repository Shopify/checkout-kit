package com.shopify.checkout_kit_android_demo.cart.data

import com.apollographql.apollo.api.Optional
import com.shopify.checkout_kit_android_demo.BuildConfig
import com.shopify.checkout_kit_android_demo.graphql.type.CartBuyerIdentityInput
import com.shopify.checkout_kit_android_demo.graphql.type.CountryCode

object DemoBuyerIdentity {
    internal val value = CartBuyerIdentityInput(
        email = Optional.present(BuildConfig.prefillEmail),
        countryCode = Optional.present(CountryCode.CA),
        phone = Optional.present(BuildConfig.prefillPhone),
    )
}

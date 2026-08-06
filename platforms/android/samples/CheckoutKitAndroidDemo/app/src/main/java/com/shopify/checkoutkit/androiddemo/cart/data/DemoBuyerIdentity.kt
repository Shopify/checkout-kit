package com.shopify.checkoutkit.androiddemo.cart.data

import com.apollographql.apollo.api.Optional
import com.shopify.checkoutkit.androiddemo.BuildConfig
import com.shopify.checkoutkit.androiddemo.graphql.type.CartBuyerIdentityInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CountryCode

object DemoBuyerIdentity {
    internal val value = CartBuyerIdentityInput(
        email = Optional.present(BuildConfig.prefillEmail),
        countryCode = Optional.present(CountryCode.CA),
        phone = Optional.present(BuildConfig.prefillPhone),
    )
}

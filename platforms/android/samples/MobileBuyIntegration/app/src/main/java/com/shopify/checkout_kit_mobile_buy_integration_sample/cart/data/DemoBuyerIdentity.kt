package com.shopify.checkout_kit_mobile_buy_integration_sample.cart.data

import com.apollographql.apollo.api.Optional
import com.shopify.checkout_kit_mobile_buy_integration_sample.BuildConfig
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.type.CartBuyerIdentityInput
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.type.CountryCode

object DemoBuyerIdentity {
    internal val value = CartBuyerIdentityInput(
        email = Optional.present(BuildConfig.prefillEmail),
        countryCode = Optional.present(CountryCode.CA),
        phone = Optional.present(BuildConfig.prefillPhone),
    )
}

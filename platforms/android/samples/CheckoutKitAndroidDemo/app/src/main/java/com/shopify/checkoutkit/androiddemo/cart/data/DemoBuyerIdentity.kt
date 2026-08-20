package com.shopify.checkoutkit.androiddemo.cart.data

import com.apollographql.apollo.api.Optional
import com.shopify.checkoutkit.androiddemo.BuildConfig
import com.shopify.checkoutkit.androiddemo.graphql.type.CartAddressInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CartBuyerIdentityInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CartDeliveryAddressInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CartDeliveryInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CartSelectableAddressInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CountryCode

object DemoBuyerIdentity {
    private val countryCode = CountryCode.safeValueOf(BuildConfig.prefillCountry)

    internal val value = CartBuyerIdentityInput(
        email = Optional.present(BuildConfig.prefillEmail),
        countryCode = Optional.present(countryCode),
        phone = Optional.present(BuildConfig.prefillPhone),
    )

    internal val delivery = CartDeliveryInput(
        addresses = Optional.present(
            listOf(
                CartSelectableAddressInput(
                    address = CartAddressInput(
                        deliveryAddress = Optional.present(
                            CartDeliveryAddressInput(
                                address1 = Optional.present(BuildConfig.prefillAddress1),
                                address2 = Optional.present(BuildConfig.prefillAddress2),
                                city = Optional.present(BuildConfig.prefillCity),
                                company = Optional.present(BuildConfig.prefillCompany),
                                countryCode = Optional.present(countryCode),
                                firstName = Optional.present(BuildConfig.prefillFirstName),
                                lastName = Optional.present(BuildConfig.prefillLastName),
                                phone = Optional.present(BuildConfig.prefillPhone),
                                provinceCode = Optional.present(BuildConfig.prefillProvince),
                                zip = Optional.present(BuildConfig.prefillZip),
                            )
                        )
                    ),
                    selected = Optional.present(true),
                )
            )
        )
    )
}

package com.shopify.checkout_kit_android_demo.cart.data

import com.shopify.checkout_kit_android_demo.BuildConfig
import com.shopify.checkout_kit_android_demo.graphql.type.CountryCode
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class DemoBuyerIdentityTest {

    @Test
    fun `buyer identity carries the contact details`() {
        val identity = DemoBuyerIdentity.value

        assertThat(identity.email.getOrThrow()).isEqualTo(BuildConfig.prefillEmail)
        assertThat(identity.phone.getOrThrow()).isEqualTo(BuildConfig.prefillPhone)
        assertThat(identity.countryCode.getOrThrow()).isEqualTo(CountryCode.safeValueOf(BuildConfig.prefillCountry))
    }

    @Test
    fun `delivery carries one pre-selected one-time address`() {
        val addresses = DemoBuyerIdentity.delivery.addresses.getOrThrow()!!

        assertThat(addresses).hasSize(1)
        assertThat(addresses.first().selected.getOrThrow()).isTrue()
        assertThat(addresses.first().oneTimeUse.getOrThrow()).isTrue()
    }

    @Test
    fun `delivery address carries every field checkout asks a guest for`() {
        val address = DemoBuyerIdentity.delivery.addresses.getOrThrow()!!
            .first().address.deliveryAddress.getOrThrow()!!

        assertThat(address.firstName.getOrThrow()).isEqualTo(BuildConfig.prefillFirstName)
        assertThat(address.lastName.getOrThrow()).isEqualTo(BuildConfig.prefillLastName)
        assertThat(address.address1.getOrThrow()).isEqualTo(BuildConfig.prefillAddress1)
        assertThat(address.address2.getOrThrow()).isEqualTo(BuildConfig.prefillAddress2)
        assertThat(address.company.getOrThrow()).isEqualTo(BuildConfig.prefillCompany)
        assertThat(address.city.getOrThrow()).isEqualTo(BuildConfig.prefillCity)
        assertThat(address.provinceCode.getOrThrow()).isEqualTo(BuildConfig.prefillProvince)
        assertThat(address.zip.getOrThrow()).isEqualTo(BuildConfig.prefillZip)
        assertThat(address.phone.getOrThrow()).isEqualTo(BuildConfig.prefillPhone)
        assertThat(address.countryCode.getOrThrow()).isEqualTo(CountryCode.safeValueOf(BuildConfig.prefillCountry))
    }
}

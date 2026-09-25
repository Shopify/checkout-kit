package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class ProtocolPayloadTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun `decodes shipping checkout preserving extensions`() {
        assertCheckoutRoundTrips("checkout-shipping", customFulfillment = false)
    }

    @Test
    fun `decodes custom fulfillment checkout preserving extensions`() {
        assertCheckoutRoundTrips("checkout-custom-fulfillment", customFulfillment = true)
    }

    private fun assertCheckoutRoundTrips(name: String, customFulfillment: Boolean) {
        val wire = fixture(name)["params"]!!.jsonObject["checkout"]!!.jsonObject
        val checkout = json.decodeFromJsonElement(Checkout.serializer(), wire)
        assertThat(checkout.ucp.version).isEqualTo(EmbeddedCheckoutProtocol.SPEC_VERSION)
        assertThat(checkout.fulfillment?.methods?.first()?.type)
            .isEqualTo(if (customFulfillment) "drone_delivery" else "shipping")
        val option = requireNotNull(checkout.fulfillment?.methods?.first()?.groups?.first()?.options?.first())
        assertThat(option.description?.plain).isEqualTo("Arrives in 3-5 business days")
        assertThat(option.description?.markdown)
            .isEqualTo(if (customFulfillment) "Arrives in **3-5 business days**" else null)
        assertThat(option.description?.html)
            .isEqualTo(if (customFulfillment) "<p>Arrives in <strong>3-5 business days</strong></p>" else null)
        val location = requireNotNull(checkout.fulfillment?.methods?.get(1)?.destinations?.first())
        assertThat(location.id).isEqualTo("location-1")
        assertThat(location.name).isEqualTo("Example Pickup Store")
        assertThat(location.type).isEqualTo("business_location")
        val address = requireNotNull(location.address)
        assertThat(address.streetAddress).isEqualTo("456 Example Avenue")
        assertThat(address.extendedAddress).isEqualTo("Suite 2")
        assertThat(address.addressLocality).isEqualTo("Example City")
        assertThat(address.addressRegion).isEqualTo("NY")
        assertThat(address.addressCountry).isEqualTo("US")
        assertThat(address.postalCode).isEqualTo("10002")
        assertThat(checkout.fulfillment?.methods?.first()?.destinations?.first()?.type).isEqualTo("shipping_address")
        assertThat(checkout.ucp.mapOrder)
            .isEqualTo(if (customFulfillment) mapOf("payment_handlers" to listOf("com.example.wallet")) else null)
        assertThat(checkout.fulfillment?.availableMethods?.first()?.type)
            .isEqualTo(if (customFulfillment) "drone_delivery" else "shipping")
        val encoded = json.encodeToJsonElement(Checkout.serializer(), checkout)
        // Native UCP metadata ignores unknown members; Checkout and signals
        // retain the extension fields promised by their serializers.
        val withoutUnknownMetadata = JsonObject(
            wire + ("ucp" to JsonObject(wire["ucp"]!!.jsonObject - "future_metadata")),
        )
        assertThat(encoded).isEqualTo(withoutUnknownMetadata)
    }

    @Test
    fun `decodes error payload`() {
        val wire = fixture("error")["params"]!!.jsonObject["error"]!!
        val error = json.decodeFromJsonElement(ErrorResponse.serializer(), wire)
        assertThat(error.ucp.version).isEqualTo(EmbeddedCheckoutProtocol.SPEC_VERSION)
        assertThat(error.messages.first().content).isEqualTo("Try again.")
        assertThat(error.messages.first().severity).isEqualTo(Severity.Unrecoverable)
    }

    private fun fixture(name: String) = json.parseToJsonElement(
        requireNotNull(javaClass.getResource("/$name.json")).readText()
            .replace("{{SPEC_VERSION}}", EmbeddedCheckoutProtocol.SPEC_VERSION),
    ).jsonObject
}

package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class VersionCompatibilityTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun `decodes August checkout preserving extensions`() {
        assertCheckoutRoundTrips("2026-08-25")
    }

    @Test
    fun `decodes April checkout preserving extensions`() {
        assertCheckoutRoundTrips("2026-04-08")
    }

    private fun assertCheckoutRoundTrips(version: String) {
        val wire = fixture("checkout-$version")["params"]!!.jsonObject["checkout"]!!.jsonObject
        val checkout = json.decodeFromJsonElement(Checkout.serializer(), wire)
        assertThat(checkout.ucp.version).isEqualTo(version)
        assertThat(checkout.fulfillment?.methods?.first()?.type)
            .isEqualTo(if (version == "2026-08-25") "drone_delivery" else "shipping")
        val option = requireNotNull(checkout.fulfillment?.methods?.first()?.groups?.first()?.options?.first())
        assertThat(option.description?.plain).isEqualTo("Arrives in 3-5 business days")
        assertThat(option.description?.markdown)
            .isEqualTo(if (version == "2026-08-25") "Arrives in **3-5 business days**" else null)
        assertThat(option.description?.html)
            .isEqualTo(if (version == "2026-08-25") "<p>Arrives in <strong>3-5 business days</strong></p>" else null)
        val location = requireNotNull(checkout.fulfillment?.methods?.get(1)?.destinations?.first())
        assertThat(location.id).isEqualTo("location-1")
        assertThat(location.name).isEqualTo("Example Pickup Store")
        // April retail locations predate the August destination discriminator.
        assertThat(location.type).isEqualTo(if (version == "2026-08-25") "business_location" else null)
        val address = requireNotNull(location.address)
        assertThat(address.streetAddress).isEqualTo("456 Example Avenue")
        assertThat(address.extendedAddress).isEqualTo("Suite 2")
        assertThat(address.addressLocality).isEqualTo("Example City")
        assertThat(address.addressRegion).isEqualTo("NY")
        assertThat(address.addressCountry).isEqualTo("US")
        assertThat(address.postalCode).isEqualTo("10002")
        if (version == "2026-08-25") {
            assertThat(checkout.ucp.mapOrder).isEqualTo(mapOf("payment_handlers" to listOf("com.example.wallet")))
            assertThat(checkout.fulfillment?.availableMethods?.first()?.type).isEqualTo("drone_delivery")
        }
        val encoded = json.encodeToJsonElement(Checkout.serializer(), checkout)
        // Native UCP metadata ignores unknown members; Checkout and signals
        // retain the extension fields promised by their serializers.
        val withoutUnknownMetadata = JsonObject(
            wire + ("ucp" to JsonObject(wire["ucp"]!!.jsonObject - "future_metadata")),
        )
        val expected = canonicalizedLegacyDescription(withoutUnknownMetadata)
        assertThat(encoded).isEqualTo(expected)
    }

    @Test
    fun `retains April error payload compatibility`() {
        val wire = fixture("error-2026-04-08")["params"]!!.jsonObject["error"]!!
        val error = json.decodeFromJsonElement(ErrorResponse.serializer(), wire)
        assertThat(error.ucp.version).isEqualTo("2026-04-08")
        assertThat(error.messages.first().content).isEqualTo("Try again.")
    }

    private fun fixture(name: String) = json.parseToJsonElement(
        requireNotNull(javaClass.getResource("/$name.json")).readText(),
    ).jsonObject

    private fun canonicalizedLegacyDescription(checkout: JsonObject): JsonObject {
        val fulfillment = checkout["fulfillment"]!!.jsonObject
        val methods = fulfillment["methods"]!!.jsonArray.toMutableList()
        val method = methods.first().jsonObject
        val groups = method["groups"]!!.jsonArray.toMutableList()
        val group = groups.first().jsonObject
        val options = group["options"]!!.jsonArray.toMutableList()
        val option = options.first().jsonObject
        val description = option["description"]
        if (description !is JsonPrimitive || !description.isString) return checkout

        options[0] = JsonObject(option + ("description" to JsonObject(mapOf("plain" to description))))
        groups[0] = JsonObject(group + ("options" to JsonArray(options)))
        methods[0] = JsonObject(method + ("groups" to JsonArray(groups)))
        return JsonObject(
            checkout + ("fulfillment" to JsonObject(fulfillment + ("methods" to JsonArray(methods)))),
        )
    }
}

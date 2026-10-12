package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.jsonObject
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.Test

class ModelContractTest {
    private val json = Json { ignoreUnknownKeys = true }
    private val fixtures = json.parseToJsonElement(
        requireNotNull(javaClass.getResource("/model-contracts.json")).readText(),
    ).jsonObject

    @Test
    fun `buyer preserves names and extensions`() {
        val buyer = roundTrip(Buyer.serializer(), "buyer", emptySet()) {
            it.copy(additionalProperties = it.additionalProperties + ("email" to JsonPrimitive("forged")))
        }
        assertThat(buyer.email).isEqualTo("buyer@example.com")
        assertThat(buyer.firstName).isEqualTo("Ada")
        assertThat(buyer.lastName).isEqualTo("Example")
        assertThat(buyer.phoneNumber).isEqualTo("+12025550123")
        assertThat(buyer.additionalProperties.keys).containsExactly("com.example.extension")
    }

    @Test
    fun `context preserves localization and payment preferences`() {
        val context = roundTrip(Context.serializer(), "context", emptySet()) {
            it.copy(additionalProperties = it.additionalProperties + ("currency" to JsonPrimitive("forged")))
        }
        assertThat(context.addressCountry).isEqualTo("IE")
        assertThat(context.addressRegion).isEqualTo("Dublin")
        assertThat(context.postalCode).isEqualTo("D02 TEST")
        assertThat(context.currency).isEqualTo("EUR")
        assertThat(context.eligibility).containsExactly("com.example.member")
        assertThat(context.intent).isEqualTo("gift")
        assertThat(context.language).isEqualTo("en-IE")
        assertThat(context.location).isEqualTo("Dublin")
        assertThat(context.payment?.first()?.handler).isEqualTo("com.example.payment")
        assertThat(context.payment?.first()?.types).containsExactly("card")
        assertThat(context.additionalProperties.keys).containsExactly("com.example.extension")
    }

    @Test
    fun `credential preserves opaque handler data`() {
        val credential = roundTrip(PaymentCredential.serializer(), "credential", setOf("type")) {
            it.copy(additionalProperties = it.additionalProperties + ("type" to JsonPrimitive("forged")))
        }
        assertThat(credential.type).isEqualTo("token")
        assertThat(
            credential.additionalProperties["com.example.token"]
        ).isEqualTo(JsonPrimitive("synthetic-test-token"))
        assertThat(credential.additionalProperties).doesNotContainKey("type")
    }

    @Test
    fun `instrument preserves nested credential and billing address`() {
        val instrument =
            roundTrip(SelectedPaymentInstrument.serializer(), "instrument", setOf("handler_id", "id", "type")) {
                it.copy(additionalProperties = it.additionalProperties + ("handler_id" to JsonPrimitive("forged")))
            }
        assertThat(instrument.handlerID).isEqualTo("example-handler")
        assertThat(instrument.id).isEqualTo("example-instrument")
        assertThat(instrument.type).isEqualTo("card")
        assertThat(instrument.selected).isTrue()
        assertThat(instrument.billingAddress?.streetAddress).isEqualTo("1 Example Street")
        assertThat(instrument.credential?.type).isEqualTo("token")
        assertThat(instrument.credential?.additionalProperties).containsKey("com.example.extension")
        assertThat(instrument.display?.get("last_digits")).isEqualTo(JsonPrimitive("1234"))
    }

    @Test
    fun `policy preserves description formats and open type`() {
        val policy = roundTrip(Policy.serializer(), "policy", setOf("description", "type")) {
            it.copy(additionalProperties = it.additionalProperties + ("type" to JsonPrimitive("forged")))
        }
        assertThat(policy.type).isEqualTo("com.example.return")
        assertThat(policy.appliesTo).containsExactly("$.line_items[0]")
        assertThat(policy.description.plain).isEqualTo("Return within 30 days")
        assertThat(policy.description.markdown).isEqualTo("Return within **30 days**")
        assertThat(policy.description.html).isEqualTo("Return within <b>30 days</b>")
        assertThat(policy.url).isEqualTo("https://example.com/returns")
    }

    private fun <T> roundTrip(
        serializer: KSerializer<T>,
        fixture: String,
        required: Set<String>,
        injectCollision: (T) -> T,
    ): T {
        val full = fixtures.getValue(fixture).jsonObject
        val decoded = json.decodeFromJsonElement(serializer, full)
        assertThat(json.encodeToJsonElement(serializer, decoded)).isEqualTo(full)
        // Extension keys cannot replace known fields when encoded.
        assertThat(json.encodeToJsonElement(serializer, injectCollision(decoded))).isEqualTo(full)

        val minimal = JsonObject(full.filterKeys { it in required })
        val minimalModel = json.decodeFromJsonElement(serializer, minimal)
        assertThat(json.encodeToJsonElement(serializer, minimalModel)).isEqualTo(minimal)
        required.forEach { key ->
            assertThatThrownBy { json.decodeFromJsonElement(serializer, JsonObject(full - key)) }
                .describedAs("Missing required field %s in %s", key, fixture)
                .isInstanceOf(SerializationException::class.java)
        }
        return decoded
    }
}

package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.SerializationException
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.Test

/**
 * Consumer-facing contract for generated string values: named constants, `when` with an `else`
 * branch, and lossless pass-through of unknown strings.
 */
class EvolvableModelShapeTest {
    private val json = Json

    @Test
    fun `decodes known values to named constants`() {
        val status = json.decodeFromString(CheckoutStatus.serializer(), "\"ready_for_complete\"")

        assertThat(status).isSameAs(CheckoutStatus.ReadyForComplete)
        assertThat(status.value).isEqualTo("ready_for_complete")
    }

    @Test
    fun `supports when with an else branch`() {
        fun describe(status: CheckoutStatus): String = when (status) {
            CheckoutStatus.Completed -> "completed"
            CheckoutStatus.Canceled -> "canceled"
            else -> "in progress"
        }

        assertThat(describe(CheckoutStatus.Completed)).isEqualTo("completed")
        assertThat(describe(CheckoutStatus.Incomplete)).isEqualTo("in progress")
    }

    @Test
    fun `round trips values the pinned version does not define`() {
        val status = json.decodeFromString(CheckoutStatus.serializer(), "\"on_hold\"")
        val encoded = json.encodeToString(CheckoutStatus.serializer(), status)

        assertThat(status.value).isEqualTo("on_hold")
        assertThat(status).isNotEqualTo(CheckoutStatus.Completed)
        assertThat(encoded).isEqualTo("\"on_hold\"")
        val decoded = json.decodeFromString(CheckoutStatus.serializer(), encoded)
        assertThat(setOf(status, decoded)).hasSize(1)
    }

    @Test
    fun `rejects non string values`() {
        listOf("null", "42", "true", "{}", "[]").forEach { wire ->
            assertThatThrownBy { json.decodeFromString(CheckoutStatus.serializer(), wire) }
                .isInstanceOf(SerializationException::class.java)
        }
    }

    @Test
    fun `encodes the raw value`() {
        val encoded = json.encodeToString(
            ListSerializer(CheckoutStatus.serializer()),
            listOf(CheckoutStatus.CompleteInProgress)
        )

        assertThat(encoded).isEqualTo("[\"complete_in_progress\"]")
    }

    @Test
    fun `values have value equality`() {
        val statuses = setOf(CheckoutStatus.Completed, CheckoutStatus.Completed, CheckoutStatus.Canceled)

        assertThat(statuses).hasSize(2)
    }

    @Test
    fun `outbound models build through the DSL and the Java-style builder`() {
        val ucp = InstrumentsChangeResultUcp(status = UCPCheckoutResponseSchemaStatus.Success, version = "2026-08-25")
        val dsl = FulfillmentDestination(id = "dest-1") {
            streetAddress = "1 Main St"
            postalCode = "K1A 0B1"
        }
        val builder = FulfillmentDestination.Builder("dest-1")
            .streetAddress("1 Main St")
            .postalCode("K1A 0B1")
            .build()
        val result = AddressChangeResult(ucp = ucp) {
            continueURL = "https://example.com/checkout"
        }

        assertThat(dsl).isEqualTo(builder)
        assertThat(dsl.addressCountry).isNull()
        assertThat(result.ucp).isEqualTo(ucp)
        assertThat(result.continueURL).isEqualTo("https://example.com/checkout")
        assertThat(result.checkout).isNull()
    }

    @Test
    fun `toBuilder preserves fields while editing required and optional values`() {
        val original = FulfillmentDestination(id = "dest-1") {
            streetAddress = "1 Main St"
            postalCode = "K1A 0B1"
        }
        val builder = original.toBuilder()
        assertThat(builder.build()).isEqualTo(original).isNotSameAs(original)

        val updated = builder.id("dest-2").postalCode(null).build()
        assertThat(updated.id).isEqualTo("dest-2")
        assertThat(updated.streetAddress).isEqualTo("1 Main St")
        assertThat(updated.postalCode).isNull()
        assertThat(original.id).isEqualTo("dest-1")
        assertThat(original.postalCode).isEqualTo("K1A 0B1")
    }

    @Test
    fun `toBuilder supports models with only optional or only required fields`() {
        val buyer = Buyer { email = "buyer@example.com" }
        assertThat(buyer.toBuilder().build()).isEqualTo(buyer)
        assertThat(buyer.toBuilder().email(null).build().email).isNull()

        val request = WindowOpenRequest(url = "https://example.com/original")
        assertThat(request.toBuilder().build()).isEqualTo(request)
        val updated = request.toBuilder().apply { url = "https://example.com/updated" }.build()
        assertThat(updated.url).isEqualTo("https://example.com/updated")
        assertThat(request.url).isEqualTo("https://example.com/original")
    }
}

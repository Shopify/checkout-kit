package com.shopify.checkoutkit

import kotlinx.serialization.SerializationException
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.Test

class CheckoutSerializerTest {
    @Test
    fun nonObjectCheckoutJsonThrowsSerializationExceptions() {
        listOf("[]", "null", "1", "true", "\"checkout\"").forEach { input ->
            assertThatThrownBy {
                Json.decodeFromString<Checkout>(input)
            }.describedAs("Checkout payload %s", input)
                .isInstanceOf(SerializationException::class.java)
                .hasMessageContaining("JSON object")
        }
    }
}

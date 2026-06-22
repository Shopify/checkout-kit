package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.Test

class ExtendsSerializerTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun `deserializes a single string into StringValue`() {
        val result = json.decodeFromString(ExtendsSerializer, "\"dev.ucp.shopping.checkout\"")
        assertThat(result).isInstanceOf(Extends.StringValue::class.java)
        assertThat((result as Extends.StringValue).value).isEqualTo("dev.ucp.shopping.checkout")
    }

    @Test
    fun `deserializes a JSON array of strings into StringArrayValue`() {
        val result = json.decodeFromString(ExtendsSerializer, """["a", "b", "c"]""")
        assertThat(result).isInstanceOf(Extends.StringArrayValue::class.java)
        assertThat((result as Extends.StringArrayValue).value).containsExactly("a", "b", "c")
    }

    @Test
    fun `deserializes an empty array into an empty StringArrayValue`() {
        val result = json.decodeFromString(ExtendsSerializer, "[]")
        assertThat(result).isInstanceOf(Extends.StringArrayValue::class.java)
        assertThat((result as Extends.StringArrayValue).value).isEmpty()
    }

    @Test
    fun `throws SerializationException when array contains a non-primitive element`() {
        assertThatThrownBy {
            json.decodeFromString(ExtendsSerializer, """["a", {"nested": "object"}]""")
        }.isInstanceOf(SerializationException::class.java)
            .hasMessageContaining("Extends array element not a primitive")
    }

    @Test
    fun `throws SerializationException for an unexpected shape (object)`() {
        assertThatThrownBy {
            json.decodeFromString(ExtendsSerializer, """{"foo": "bar"}""")
        }.isInstanceOf(SerializationException::class.java)
            .hasMessageContaining("Unexpected Extends shape")
    }

    @Test
    fun `serializes StringValue back to a JSON string`() {
        val encoded = json.encodeToString(ExtendsSerializer, Extends.StringValue("dev.ucp.shopping.checkout"))
        assertThat(encoded).isEqualTo("\"dev.ucp.shopping.checkout\"")
    }

    @Test
    fun `serializes StringArrayValue back to a JSON array`() {
        val encoded = json.encodeToString(ExtendsSerializer, Extends.StringArrayValue(listOf("a", "b")))
        assertThat(encoded).isEqualTo("""["a","b"]""")
    }

    @Test
    fun `roundtrips StringValue`() {
        val original = Extends.StringValue("dev.ucp.shopping.checkout")
        val encoded = json.encodeToString(ExtendsSerializer, original)
        val decoded = json.decodeFromString(ExtendsSerializer, encoded) as Extends.StringValue
        assertThat(decoded.value).isEqualTo(original.value)
    }

    @Test
    fun `roundtrips StringArrayValue`() {
        val original = Extends.StringArrayValue(listOf("a", "b", "c"))
        val encoded = json.encodeToString(ExtendsSerializer, original)
        val decoded = json.decodeFromString(ExtendsSerializer, encoded) as Extends.StringArrayValue
        assertThat(decoded.value).containsExactlyElementsOf(original.value)
    }
}

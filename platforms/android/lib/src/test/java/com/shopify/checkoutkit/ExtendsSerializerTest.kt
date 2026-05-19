/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
package com.shopify.checkoutkit

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

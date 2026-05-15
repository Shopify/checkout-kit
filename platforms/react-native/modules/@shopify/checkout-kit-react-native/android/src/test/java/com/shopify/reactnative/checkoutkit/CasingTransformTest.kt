/*
 * MIT License
 *
 * Copyright 2023-present, Shopify Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
package com.shopify.reactnative.checkoutkit

import com.shopify.checkoutkit.Checkout
import com.shopify.checkoutkit.CheckoutLineItem
import com.shopify.checkoutkit.CheckoutStatus
import com.shopify.checkoutkit.ItemClass
import com.shopify.checkoutkit.UCPCheckoutResponseSchema
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class CasingTransformTest {

    // region snakeToCamel

    @Test
    fun `snakeToCamel converts continue_url to lower camel`() {
        assertThat(CasingTransform.snakeToCamel("continue_url")).isEqualTo("continueUrl")
    }

    @Test
    fun `snakeToCamel converts line_items to lower camel`() {
        assertThat(CasingTransform.snakeToCamel("line_items")).isEqualTo("lineItems")
    }

    @Test
    fun `snakeToCamel leaves single-word keys unchanged`() {
        assertThat(CasingTransform.snakeToCamel("foo")).isEqualTo("foo")
    }

    @Test
    fun `snakeToCamel returns empty string unchanged`() {
        assertThat(CasingTransform.snakeToCamel("")).isEqualTo("")
    }

    @Test
    fun `snakeToCamel converts oauth_2_0_access_token`() {
        assertThat(CasingTransform.snakeToCamel("oauth_2_0_access_token")).isEqualTo("oauth20AccessToken")
    }

    @Test
    fun `snakeToCamel converts http_request_finish`() {
        assertThat(CasingTransform.snakeToCamel("http_request_finish")).isEqualTo("httpRequestFinish")
    }

    @Test
    fun `snakeToCamel converts accelerated_checkouts_apple_pay_configuration`() {
        assertThat(CasingTransform.snakeToCamel("accelerated_checkouts_apple_pay_configuration"))
            .isEqualTo("acceleratedCheckoutsApplePayConfiguration")
    }

    @Test
    fun `snakeToCamel converts iso_8601_timestamp`() {
        assertThat(CasingTransform.snakeToCamel("iso_8601_timestamp")).isEqualTo("iso8601Timestamp")
    }

    @Test
    fun `snakeToCamel converts x_forwarded_for_header`() {
        assertThat(CasingTransform.snakeToCamel("x_forwarded_for_header")).isEqualTo("xForwardedForHeader")
    }

    @Test
    fun `snakeToCamel passes through already-camel input unchanged`() {
        assertThat(CasingTransform.snakeToCamel("alreadyCamel")).isEqualTo("alreadyCamel")
    }

    @Test
    fun `snakeToCamel preserves embedded digits as non-letter characters`() {
        assertThat(CasingTransform.snakeToCamel("field_v2")).isEqualTo("fieldV2")
    }

    // endregion

    // region camelToSnake

    @Test
    fun `camelToSnake converts continueUrl to snake`() {
        assertThat(CasingTransform.camelToSnake("continueUrl")).isEqualTo("continue_url")
    }

    @Test
    fun `camelToSnake converts lineItems to snake`() {
        assertThat(CasingTransform.camelToSnake("lineItems")).isEqualTo("line_items")
    }

    @Test
    fun `camelToSnake leaves single-word keys unchanged`() {
        assertThat(CasingTransform.camelToSnake("foo")).isEqualTo("foo")
    }

    @Test
    fun `camelToSnake converts acceleratedCheckoutsApplePayConfiguration`() {
        assertThat(CasingTransform.camelToSnake("acceleratedCheckoutsApplePayConfiguration"))
            .isEqualTo("accelerated_checkouts_apple_pay_configuration")
    }

    @Test
    fun `camelToSnake converts httpRequestFinish`() {
        assertThat(CasingTransform.camelToSnake("httpRequestFinish")).isEqualTo("http_request_finish")
    }

    @Test
    fun `camelToSnake splits each uppercase letter in consecutive-uppercase runs`() {
        assertThat(CasingTransform.camelToSnake("imageURL")).isEqualTo("image_u_r_l")
    }

    // endregion

    // region round-trip

    @Test
    fun `snakeToCamel round-trips typical wire keys through camelToSnake`() {
        val keys = listOf(
            "continue_url",
            "line_items",
            "http_request_finish",
            "x_forwarded_for_header",
            "accelerated_checkouts_apple_pay_configuration",
        )
        keys.forEach { key ->
            val camel = CasingTransform.snakeToCamel(key)
            assertThat(CasingTransform.camelToSnake(camel)).isEqualTo(key)
        }
    }

    // endregion

    // region transformKeys

    @Test
    fun `transformKeys recursively transforms keys in nested objects and arrays`() {
        val input = buildJsonObject {
            put("outer_key", JsonPrimitive("v"))
            put(
                "nested_object",
                buildJsonObject {
                    put("inner_key", JsonPrimitive(1))
                }
            )
            put(
                "list_of_objects",
                buildJsonArray {
                    add(
                        buildJsonObject {
                            put("array_item_key", JsonPrimitive("a"))
                        }
                    )
                    add(
                        buildJsonObject {
                            put("array_item_key", JsonPrimitive("b"))
                        }
                    )
                }
            )
        }

        val transformed = CasingTransform.transformKeys(input, CasingTransform::snakeToCamel) as JsonObject

        assertThat(transformed.keys).containsExactlyInAnyOrder("outerKey", "nestedObject", "listOfObjects")
        val nested = transformed["nestedObject"] as JsonObject
        assertThat(nested.keys).containsExactly("innerKey")
        val list = transformed["listOfObjects"] as JsonArray
        assertThat(list).hasSize(2)
        list.forEach { element ->
            assertThat((element as JsonObject).keys).containsExactly("arrayItemKey")
        }
    }

    @Test
    fun `transformKeys passes through JsonPrimitive unchanged`() {
        val primitive = JsonPrimitive("hello_there")
        val result = CasingTransform.transformKeys(primitive, CasingTransform::snakeToCamel)
        assertThat(result).isSameAs(primitive)
        assertThat((result as JsonPrimitive).content).isEqualTo("hello_there")
    }

    @Test
    fun `transformKeys passes through JsonNull unchanged`() {
        val result = CasingTransform.transformKeys(JsonNull, CasingTransform::snakeToCamel)
        assertThat(result).isEqualTo(JsonNull)
    }

    // endregion

    // region encodeForJS round-trip

    @Test
    fun `encodeForJS produces camelCase keys for a Checkout payload`() {
        val checkout = sampleCheckout()

        val jsonString = CasingTransform.encodeForJS(checkout)
        val parsed = Json.parseToJsonElement(jsonString).jsonObject

        assertThat(parsed.keys).contains("continueUrl", "lineItems", "expiresAt")
        assertThat(parsed.keys).doesNotContain("continue_url", "line_items", "expires_at")

        val ucp = parsed["ucp"]!!.jsonObject
        assertThat(ucp.keys).contains("paymentHandlers")
        assertThat(ucp.keys).doesNotContain("payment_handlers")
    }

    @Test
    fun `encodeForJS transforms keys inside list elements`() {
        val checkout = sampleCheckout(
            lineItems = listOf(
                CheckoutLineItem(
                    id = "li1",
                    item = ItemClass(
                        id = "i1",
                        title = "Widget",
                        price = 100,
                        imageURL = "https://example.com/img.png",
                    ),
                    quantity = 1,
                    totals = emptyList(),
                )
            )
        )

        val jsonString = CasingTransform.encodeForJS(checkout)
        val parsed = Json.parseToJsonElement(jsonString).jsonObject
        val lineItem = parsed["lineItems"]!!.jsonArray[0].jsonObject
        val item = lineItem["item"]!!.jsonObject

        assertThat(item.keys).contains("imageUrl")
        assertThat(item.keys).doesNotContain("image_url")
    }

    // endregion

    // region decodeFromJS reverse round-trip

    @Test
    fun `decodeFromJS decodes camelCase JSON back into a Checkout`() {
        val camelJson = """
            {
              "id":"chk1",
              "currency":"USD",
              "status":"incomplete",
              "continueUrl":"https://example.com/continue",
              "expiresAt":"2026-12-31T23:59:59Z",
              "lineItems":[
                {"id":"li1","item":{"id":"i1","title":"Widget","price":100,"imageUrl":"https://example.com/img.png"},"quantity":1,"totals":[]}
              ],
              "links":[],
              "totals":[],
              "ucp":{"paymentHandlers":{},"version":"1.0"}
            }
        """.trimIndent()

        val checkout = CasingTransform.decodeFromJS<Checkout>(camelJson)

        assertThat(checkout.id).isEqualTo("chk1")
        assertThat(checkout.currency).isEqualTo("USD")
        assertThat(checkout.continueURL).isEqualTo("https://example.com/continue")
        assertThat(checkout.expiresAt).isEqualTo("2026-12-31T23:59:59Z")
        assertThat(checkout.lineItems).hasSize(1)
        assertThat(checkout.lineItems[0].item.imageURL).isEqualTo("https://example.com/img.png")
        assertThat(checkout.ucp.paymentHandlers).isEmpty()
    }

    @Test
    fun `encode then decode round-trips Checkout instance`() {
        val original = sampleCheckout()
        val encoded = CasingTransform.encodeForJS(original)
        val decoded = CasingTransform.decodeFromJS<Checkout>(encoded)

        assertThat(decoded.id).isEqualTo(original.id)
        assertThat(decoded.currency).isEqualTo(original.currency)
        assertThat(decoded.continueURL).isEqualTo(original.continueURL)
        assertThat(decoded.expiresAt).isEqualTo(original.expiresAt)
    }

    // endregion

    // region helpers

    private fun sampleCheckout(
        id: String = "chk1",
        currency: String = "USD",
        lineItems: List<CheckoutLineItem> = emptyList(),
    ): Checkout = Checkout(
        id = id,
        currency = currency,
        status = CheckoutStatus.Incomplete,
        continueURL = "https://example.com/continue",
        expiresAt = "2026-12-31T23:59:59Z",
        lineItems = lineItems,
        links = emptyList(),
        totals = emptyList(),
        ucp = UCPCheckoutResponseSchema(
            paymentHandlers = emptyMap(),
            version = "1.0",
        ),
    )

    // endregion
}

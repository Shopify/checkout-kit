package com.shopify.reactnative.checkoutkit

import com.shopify.checkoutkit.CheckoutErrorCode
import com.shopify.checkoutkit.CheckoutException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CustomCheckoutListenerTest {

    @Test
    fun `fail envelope carries the flattened error fields`() {
        val captured = mutableListOf<String>()
        val listener = CustomCheckoutListener(DispatchCallback { json -> captured.add(json) })

        listener.onCheckoutFailed(CheckoutException(CheckoutErrorCode.CART_EXPIRED, "expired"))

        val envelope = Json.parseToJsonElement(captured.single()).jsonObject
        assertThat(envelope["type"]?.jsonPrimitive?.content).isEqualTo("fail")

        val payload = payloadOf(envelope)
        assertThat(payload["code"]?.jsonPrimitive?.content).isEqualTo("cart_expired")
        assertThat(payload["message"]?.jsonPrimitive?.content).isEqualTo("expired")
        assertThat(payload).doesNotContainKey("__typename")
        assertThat(payload).doesNotContainKey("statusCode")
    }

    @Test
    fun `fail envelope adds statusCode when the failure carries an http status`() {
        val captured = mutableListOf<String>()
        val listener = CustomCheckoutListener(DispatchCallback { json -> captured.add(json) })

        listener.onCheckoutFailed(
            CheckoutException(CheckoutErrorCode.HTTP_ERROR, "unprocessable entity", 422),
        )

        val payload = payloadOf(Json.parseToJsonElement(captured.single()).jsonObject)
        assertThat(payload["code"]?.jsonPrimitive?.content).isEqualTo("http_error")
        assertThat(payload["statusCode"]?.jsonPrimitive?.int).isEqualTo(422)
    }

    @Test
    fun `every error code serialises as the lower snake case wire name`() {
        CheckoutErrorCode.values().forEach { code ->
            val captured = mutableListOf<String>()
            val listener = CustomCheckoutListener(DispatchCallback { json -> captured.add(json) })

            listener.onCheckoutFailed(CheckoutException(code, "boom"))

            val payload = payloadOf(Json.parseToJsonElement(captured.single()).jsonObject)
            assertThat(payload["code"]?.jsonPrimitive?.content)
                .isEqualTo(code.name.lowercase())
        }
    }

    @Test
    fun `dismiss emits a close envelope without a payload`() {
        val captured = mutableListOf<String>()
        val listener = CustomCheckoutListener(DispatchCallback { json -> captured.add(json) })

        listener.onCheckoutDismissed()

        val envelope = Json.parseToJsonElement(captured.single()).jsonObject
        assertThat(envelope["type"]?.jsonPrimitive?.content).isEqualTo("close")
        assertThat(envelope).doesNotContainKey("payload")
    }

    @Test
    fun `a terminal event releases the dispatcher`() {
        val captured = mutableListOf<String>()
        val listener = CustomCheckoutListener(DispatchCallback { json -> captured.add(json) })

        listener.onCheckoutDismissed()
        listener.onCheckoutFailed(CheckoutException(CheckoutErrorCode.SDK_ERROR, "late"))

        assertThat(captured).hasSize(1)
    }

    private fun payloadOf(envelope: JsonObject): JsonObject =
        envelope["payload"]?.jsonObject ?: JsonObject(emptyMap())
}

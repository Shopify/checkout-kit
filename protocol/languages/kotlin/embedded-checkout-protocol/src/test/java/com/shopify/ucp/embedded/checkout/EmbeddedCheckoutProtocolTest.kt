package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.Test

class EmbeddedCheckoutProtocolTest {
    @Test
    fun `SPEC_VERSION is non-empty`() {
        assertThat(EmbeddedCheckoutProtocol.SPEC_VERSION).isNotEmpty()
    }

    @Test
    fun `event catalog exposes embedded checkout methods`() {
        assertThat(EmbeddedCheckoutProtocol.Event.all).containsExactlyInAnyOrder(
            "ec.ready",
            "ec.auth",
            "ec.error",
            "ec.start",
            "ec.complete",
            "ec.messages.change",
            "ec.line_items.change",
            "ec.buyer.change",
            "ec.totals.change",
            "ec.payment.change",
            "ec.payment.instruments_change_request",
            "ec.payment.credential_request",
            "ec.window.open_request",
            "ec.fulfillment.change",
            "ec.fulfillment.address_change_request",
        )
    }

    @Test
    fun `event catalog methods are unique`() {
        assertThat(EmbeddedCheckoutProtocol.Event.all).hasSameSizeAs(EmbeddedCheckoutProtocol.Event.all.toSet())
    }

    @Test
    fun `event catalog excludes sibling capabilities`() {
        assertThat(EmbeddedCheckoutProtocol.Event.all).doesNotContain("ep.cart.ready")
    }

    @Test
    fun `notification descriptor exposes method identity`() {
        val descriptor = NotificationDescriptor<Checkout>(EmbeddedCheckoutProtocol.Event.start)

        assertThat(descriptor.method).isEqualTo("ec.start")
    }

    @Test
    fun `notification descriptor decodes params with serializer helper`() {
        val descriptor = notificationDescriptor(
            method = EmbeddedCheckoutProtocol.Event.ready,
            paramsSerializer = ReadyParams.serializer(),
            decode = { it.delegate },
        )

        val payload = descriptor.decode(Json.parseToJsonElement("""{"delegate":["window.open"]}"""))

        assertThat(payload).containsExactly("window.open")
    }

    @Test
    fun `notification descriptor throws when params cannot be decoded`() {
        val descriptor = notificationDescriptor(
            method = EmbeddedCheckoutProtocol.Event.ready,
            paramsSerializer = ReadyParams.serializer(),
            decode = { it.delegate },
        )

        assertThatThrownBy {
            descriptor.decode(Json.parseToJsonElement("""{"delegate":[{}]}"""))
        }.isInstanceOf(SerializationException::class.java)
    }

    @Test
    fun `delegation descriptor exposes method and delegation identity`() {
        val descriptor = DelegationDescriptor<Checkout, Checkout>(
            method = EmbeddedCheckoutProtocol.Event.windowOpenRequest,
            delegation = "window.open",
        )

        assertThat(descriptor.method).isEqualTo("ec.window.open_request")
        assertThat(descriptor.delegation).isEqualTo("window.open")
    }

    @Test
    fun `delegation descriptor decodes and encodes with serializer helper`() {
        val descriptor: DelegationDescriptor<String, Boolean> = delegationDescriptor(
            method = EmbeddedCheckoutProtocol.Event.windowOpenRequest,
            delegation = "window.open",
            requestSerializer = TestRequestParams.serializer(),
            responseSerializer = TestResponseParams.serializer(),
            decode = { it.url },
            encode = { TestResponseParams(opened = it) },
        )

        val payload = descriptor.decode(Json.parseToJsonElement("""{"url":"https://example.com"}"""))
        val response = descriptor.encode(true)

        assertThat(payload).isEqualTo("https://example.com")
        assertThat(response.toString()).isEqualTo("""{"opened":true}""")
    }

    @Test
    fun `delegation descriptor throws when params cannot be decoded`() {
        val descriptor: DelegationDescriptor<String, Boolean> = delegationDescriptor(
            method = EmbeddedCheckoutProtocol.Event.windowOpenRequest,
            delegation = "window.open",
            requestSerializer = TestRequestParams.serializer(),
            responseSerializer = TestResponseParams.serializer(),
            decode = { it.url },
            encode = { TestResponseParams(opened = it) },
        )

        assertThatThrownBy {
            descriptor.decode(Json.parseToJsonElement("""{"url":{}}"""))
        }.isInstanceOf(SerializationException::class.java)
    }

    @Test
    fun `embedded checkout descriptors decode checkout notifications`() {
        val payload = EmbeddedCheckoutProtocol.start.decode(Json.parseToJsonElement(checkoutParamsFixture))

        assertThat(payload?.id).isEqualTo("checkout-123")
        assertThat(payload?.currency).isEqualTo("USD")
    }

    @Test
    fun `embedded checkout descriptors decode error notifications`() {
        val payload = EmbeddedCheckoutProtocol.error.decode(Json.parseToJsonElement(errorParamsFixture))

        assertThat(payload?.messages?.single()?.content).isEqualTo("Something went wrong")
        assertThat(payload?.ucp?.status).isEqualTo(StatusEnum.Error)
    }

    @Test
    fun `embedded checkout window open descriptor decodes and encodes`() {
        val payload = EmbeddedCheckoutProtocol.windowOpen.decode(
            Json.parseToJsonElement("""{"url":"https://example.com"}"""),
        )
        val success = EmbeddedCheckoutProtocol.windowOpen.encode(WindowOpenResult.Success)
        val rejected = EmbeddedCheckoutProtocol.windowOpen.encode(WindowOpenResult.Rejected("Blocked"))

        assertThat(payload?.url.toString()).isEqualTo("https://example.com")
        assertThat(success.toString()).isEqualTo("""{"ucp":{"version":"2026-04-08","status":"success"}}""")
        assertThat(rejected.toString()).contains("window_open_rejected_error")
        assertThat(rejected.toString()).contains("Blocked")
    }

    @Test
    fun `embedded checkout window open descriptor rejects invalid urls`() {
        val blank = EmbeddedCheckoutProtocol.windowOpen.decode(Json.parseToJsonElement("""{"url":""}"""))
        val malformed = EmbeddedCheckoutProtocol.windowOpen.decode(
            Json.parseToJsonElement("""{"url":"https://exa mple.com"}"""),
        )

        assertThat(blank).isNull()
        assertThat(malformed).isNull()
    }

    @Test
    fun `delegation descriptor map transforms payload and result`() {
        val descriptor = EmbeddedCheckoutProtocol.windowOpen.map(
            decode = { request -> request.url },
            encode = { reason: String -> WindowOpenResult.Rejected(reason) },
        )

        val payload = descriptor.decode(Json.parseToJsonElement("""{"url":"https://example.com"}"""))
        val response = descriptor.encode("No handler")

        assertThat(payload.toString()).isEqualTo("https://example.com")
        assertThat(response.toString()).contains("No handler")
    }

    @Test
    fun `decode protocol request preserves null and numeric ids`() {
        val nullId = decodeProtocolRequest("""{"jsonrpc":"2.0","method":"ec.ready","id":null,"params":{}}""")
        val numericId = decodeProtocolRequest("""{"jsonrpc":"2.0","method":"ec.ready","id":7,"params":{}}""")

        assertThat(nullId.id).isEqualTo(JsonNull)
        assertThat(numericId.id).isEqualTo(JsonPrimitive(7))
    }

    @Test
    fun `decode protocol request rejects malformed messages`() {
        assertThatThrownBy {
            decodeProtocolRequest("not json")
        }.isInstanceOf(SerializationException::class.java)
    }

    @Test
    fun `json rpc request id accepts string integer and null ids`() {
        assertThat(jsonRpcRequestId(JsonPrimitive("id-1"))).isEqualTo(JsonPrimitive("id-1"))
        assertThat(jsonRpcRequestId(JsonPrimitive(7))).isEqualTo(JsonPrimitive(7))
        assertThat(jsonRpcRequestId(JsonNull)).isEqualTo(JsonNull)
    }

    @Test
    fun `json rpc request id rejects unsupported id shapes`() {
        assertThat(jsonRpcRequestId(JsonPrimitive(1.5))).isNull()
        assertThat(jsonRpcRequestId(JsonPrimitive(true))).isNull()
    }

    @Serializable
    private data class TestRequestParams(val url: String)

    @Serializable
    private data class TestResponseParams(val opened: Boolean)
}

private val checkoutParamsFixture = """
{
  "checkout": {
    "ucp": {
      "version": "2026-04-08",
      "payment_handlers": {}
    },
    "id": "checkout-123",
    "status": "incomplete",
    "currency": "USD",
    "line_items": [],
    "links": [],
    "totals": []
  }
}
""".trimIndent()

private val errorParamsFixture = """
{
  "error": {
    "ucp": {
      "version": "2026-04-08",
      "status": "error"
    },
    "messages": [
      {
        "type": "error",
        "code": "checkout_error",
        "content": "Something went wrong",
        "severity": "unrecoverable"
      }
    ]
  }
}
""".trimIndent()

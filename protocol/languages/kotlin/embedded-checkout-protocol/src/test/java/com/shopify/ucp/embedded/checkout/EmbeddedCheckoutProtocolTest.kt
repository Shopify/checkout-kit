package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.Test
import java.net.URI
import java.net.URLDecoder
import java.nio.charset.StandardCharsets

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
    fun `delegation catalog exposes embedded checkout delegations`() {
        assertThat(EmbeddedCheckoutProtocol.Delegation.all).containsExactlyInAnyOrder(
            EmbeddedCheckoutProtocol.Delegation("payment.instruments_change"),
            EmbeddedCheckoutProtocol.Delegation("payment.credential"),
            EmbeddedCheckoutProtocol.Delegation("fulfillment.address_change"),
            EmbeddedCheckoutProtocol.Delegation("window.open"),
        )
        assertThat(EmbeddedCheckoutProtocol.Delegation.windowOpen.rawValue).isEqualTo("window.open")
    }

    @Test
    fun `delegation can represent unknown values`() {
        val delegation = EmbeddedCheckoutProtocol.Delegation("custom.delegation")

        assertThat(delegation.rawValue).isEqualTo("custom.delegation")
    }

    @Test
    fun `url appends ec version and omits delegation by default`() {
        val result = EmbeddedCheckoutProtocol.url(BASE_URL)
        val params = queryParams(result)

        assertThat(params["ec_version"]).containsExactly(EmbeddedCheckoutProtocol.SPEC_VERSION)
        assertThat(params).doesNotContainKey("ec_delegate")
        assertThat(params).doesNotContainKey("ec_auth")
        assertThat(params).doesNotContainKey("ec_color_scheme")
    }

    @Test
    fun `url appends supplied delegations`() {
        val result = EmbeddedCheckoutProtocol.url(
            BASE_URL,
            options = EmbeddedCheckoutProtocol.Options(
                delegations = listOf(
                    EmbeddedCheckoutProtocol.Delegation.windowOpen,
                    EmbeddedCheckoutProtocol.Delegation.paymentCredential,
                ),
            ),
        )
        val params = queryParams(result)

        assertThat(params["ec_version"]).containsExactly(EmbeddedCheckoutProtocol.SPEC_VERSION)
        assertThat(params["ec_delegate"]).containsExactly("window.open,payment.credential")
    }

    @Test
    fun `url appends supplied auth and color scheme`() {
        val result = EmbeddedCheckoutProtocol.url(
            BASE_URL,
            options = EmbeddedCheckoutProtocol.Options(
                auth = "token",
                colorScheme = "dark",
            ),
        )
        val params = queryParams(result)

        assertThat(params["ec_auth"]).containsExactly("token")
        assertThat(params["ec_color_scheme"]).containsExactly("dark")
    }

    @Test
    fun `url preserves existing query parameters`() {
        val result = EmbeddedCheckoutProtocol.url("$BASE_URL?key=cart_token&utm_source=email")
        val params = queryParams(result)

        assertThat(params["key"]).containsExactly("cart_token")
        assertThat(params["utm_source"]).containsExactly("email")
        assertThat(params["ec_version"]).containsExactly(EmbeddedCheckoutProtocol.SPEC_VERSION)
    }

    @Test
    fun `url replaces caller supplied protocol parameters and is idempotent`() {
        val callerSupplied = "$BASE_URL?ec_version=override&ec_delegate=custom&ec_auth=stale&ec_color_scheme=light"
        val options = EmbeddedCheckoutProtocol.Options(
            delegations = listOf(EmbeddedCheckoutProtocol.Delegation.windowOpen),
            auth = "token",
            colorScheme = "dark",
        )
        val once = EmbeddedCheckoutProtocol.url(callerSupplied, options = options)
        val twice = EmbeddedCheckoutProtocol.url(once, options = options)
        val params = queryParams(twice)

        assertThat(params["ec_version"]).containsExactly(EmbeddedCheckoutProtocol.SPEC_VERSION)
        assertThat(params["ec_delegate"]).containsExactly("window.open")
        assertThat(params["ec_auth"]).containsExactly("token")
        assertThat(params["ec_color_scheme"]).containsExactly("dark")
    }

    @Test
    fun `url removes caller supplied optional protocol params when options omit them`() {
        val result = EmbeddedCheckoutProtocol.url(
            "$BASE_URL?ec_delegate=custom&ec_auth=stale&ec_color_scheme=dark",
            options = EmbeddedCheckoutProtocol.Options(delegations = emptyList()),
        )
        val params = queryParams(result)

        assertThat(params["ec_version"]).containsExactly(EmbeddedCheckoutProtocol.SPEC_VERSION)
        assertThat(params).doesNotContainKey("ec_delegate")
        assertThat(params).doesNotContainKey("ec_auth")
        assertThat(params).doesNotContainKey("ec_color_scheme")
    }

    @Test
    fun `notification descriptor exposes method identity`() {
        val descriptor = NotificationDescriptor<Checkout>(EmbeddedCheckoutProtocol.Event.start)

        assertThat(descriptor.method).isEqualTo("ec.start")
    }

    @Test
    fun `request descriptor exposes method and delegation identity`() {
        val descriptor = RequestDescriptor<Checkout, Checkout>(
            method = EmbeddedCheckoutProtocol.Event.paymentInstrumentsChangeRequest,
            delegation = "payment.instruments_change",
        )

        assertThat(descriptor.method).isEqualTo("ec.payment.instruments_change_request")
        assertThat(descriptor.delegation).isEqualTo("payment.instruments_change")
    }

    @Test
    fun `request descriptor decodes and encodes with serializer helper`() {
        val descriptor: RequestDescriptor<String, Boolean> = requestDescriptor(
            method = EmbeddedCheckoutProtocol.Event.paymentInstrumentsChangeRequest,
            delegation = "payment.instruments_change",
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
    fun `request descriptor throws when params cannot be decoded`() {
        val descriptor: RequestDescriptor<String, Boolean> = requestDescriptor(
            method = EmbeddedCheckoutProtocol.Event.paymentInstrumentsChangeRequest,
            delegation = "payment.instruments_change",
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
    fun `embedded checkout fulfillment change descriptor decodes checkout notifications`() {
        val payload = EmbeddedCheckoutProtocol.fulfillmentChange.decode(Json.parseToJsonElement(checkoutParamsFixture))

        assertThat(payload?.id).isEqualTo("checkout-123")
        assertThat(payload?.currency).isEqualTo("USD")
    }

    @Test
    fun `embedded checkout descriptors decode error notifications`() {
        val payload = EmbeddedCheckoutProtocol.error.decode(Json.parseToJsonElement(errorParamsFixture))

        assertThat(payload?.messages?.single()?.content).isEqualTo("Something went wrong")
        assertThat(payload?.ucp?.status).isEqualTo(ErrorStatus.Error)
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

    @Test
    fun `ready descriptor is a core request with no delegation`() {
        assertThat(EmbeddedCheckoutProtocol.ready.method).isEqualTo("ec.ready")
        assertThat(EmbeddedCheckoutProtocol.ready.delegation).isNull()
    }

    @Test
    fun `payment instruments change descriptor binds to its delegation`() {
        assertThat(EmbeddedCheckoutProtocol.paymentInstrumentsChange.method)
            .isEqualTo("ec.payment.instruments_change_request")
        assertThat(EmbeddedCheckoutProtocol.paymentInstrumentsChange.delegation)
            .isEqualTo("payment.instruments_change")
    }

    private fun queryParams(url: String): Map<String, List<String>> =
        URI(url).rawQuery
            ?.split("&")
            ?.filter { it.isNotEmpty() }
            ?.map { it.substringBefore("=") to it.substringAfter("=", "") }
            ?.groupBy(
                keySelector = { it.first.decodeQueryComponent() },
                valueTransform = { it.second.decodeQueryComponent() },
            )
            .orEmpty()

    private fun String.decodeQueryComponent(): String =
        URLDecoder.decode(this, StandardCharsets.UTF_8.name())

    private companion object {
        private const val BASE_URL = "https://shop.com/cart/c/abc"
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

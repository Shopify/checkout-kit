package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class ClientTest {
    @Test
    fun `completion preserves unknown strings`() {
        listOf("completed", "on_hold").forEach { status ->
            val message = requireNotNull(javaClass.getResource("/checkout-unknown-values.json")).readText()
                .replace("{{SPEC_VERSION}}", EmbeddedCheckoutProtocol.SPEC_VERSION)
                .replace("\"status\": \"completed\"", "\"status\": \"$status\"")
            var received: Checkout? = null
            val errors = mutableListOf<Throwable>()
            val client = Client()
                .onDecodeError { _, error, _ -> errors.add(error) }
                .on(EmbeddedCheckoutProtocol.complete) { received = it.checkout }

            client.process(message)

            assertThat(errors).isEmpty()
            val checkout = requireNotNull(received)
            assertThat(checkout.status.value).isEqualTo(status)
            assertThat(checkout.discounts?.applied?.first()?.method?.value).isEqualTo("future_method")
            val copy = checkout.toBuilder().id("checkout-copy").build()
            val encoded = Json.encodeToString(Checkout.serializer(), copy)
            val decoded = Json.decodeFromString(Checkout.serializer(), encoded)
            assertThat(decoded.id).isEqualTo("checkout-copy")
            assertThat(decoded.status).isEqualTo(checkout.status)
            assertThat(decoded.discounts?.applied?.first()?.method?.value).isEqualTo("future_method")
        }
    }

    @Test
    fun `process dispatches decoded notification payload to handler`() {
        var received: Ping? = null
        val client = Client().on(ping) { received = it }

        val response = client.process(
            """{"jsonrpc":"2.0","method":"ec.test.ping","params":{"value":"hi"}}""",
        )

        assertThat(received).isEqualTo(Ping("hi"))
        assertThat(response).isNull()
    }

    @Test
    fun `process returns encoded result for request handler`() {
        val client = Client().on(echo) { true }

        val response = client.process(
            """{"jsonrpc":"2.0","id":"1","method":"ec.test.echo","params":{"value":"hi"}}""",
        )

        assertThat(response).contains("\"result\"").contains("\"ok\":true")
    }

    @Test
    fun `process invokes onDecodeError for malformed notification params`() {
        var captured: Triple<String, Throwable, JsonElement?>? = null
        val client = Client()
            .onDecodeError { method, error, params -> captured = Triple(method, error, params) }
            .on(ping) { throw AssertionError("handler should not run for undecodable params") }

        val response = client.process(
            """{"jsonrpc":"2.0","method":"ec.test.ping","params":{}}""",
        )

        assertThat(response).isNull()
        assertThat(captured?.first).isEqualTo("ec.test.ping")
        assertThat(captured?.second).isInstanceOf(SerializationException::class.java)
        assertThat(captured?.third).isEqualTo(buildJsonObject {})
    }

    @Test
    fun `process invokes onDecodeError and returns invalid params error for malformed request params`() {
        var captured: Triple<String, Throwable, JsonElement?>? = null
        val client = Client()
            .onDecodeError { method, error, params -> captured = Triple(method, error, params) }
            .on(echo) { throw AssertionError("handler should not run for undecodable params") }

        val response = client.process(
            """{"jsonrpc":"2.0","id":"1","method":"ec.test.echo","params":{}}""",
        )

        assertThat(captured?.first).isEqualTo("ec.test.echo")
        assertThat(captured?.second).isInstanceOf(SerializationException::class.java)
        assertThat(response).contains("-32602")
    }

    @Test
    fun `process returns null for unregistered method`() {
        val response = Client().process(
            """{"jsonrpc":"2.0","method":"ec.unregistered","params":{}}""",
        )

        assertThat(response).isNull()
    }

    @Test
    fun `process returns null for malformed envelope`() {
        val response = Client().on(ping) { throw AssertionError("should not run") }.process("not json")

        assertThat(response).isNull()
    }

    private companion object {
        private val ping: NotificationDescriptor<Ping> = notificationDescriptor(
            method = "ec.test.ping",
            paramsSerializer = Ping.serializer(),
            decode = { it },
        )

        private val echo: RequestDescriptor<Ping, Boolean> = requestDescriptor(
            method = "ec.test.echo",
            delegation = "test.echo",
            requestSerializer = Ping.serializer(),
            responseSerializer = Pong.serializer(),
            decode = { it },
            encode = { Pong(ok = it) },
        )
    }

    @Serializable
    private data class Ping(val value: String)

    @Serializable
    private data class Pong(val ok: Boolean)
}

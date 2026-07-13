package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class ClientTest {
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
        var captured: Pair<String, Throwable>? = null
        val client = Client()
            .onDecodeError { method, error -> captured = method to error }
            .on(ping) { throw AssertionError("handler should not run for undecodable params") }

        val response = client.process(
            """{"jsonrpc":"2.0","method":"ec.test.ping","params":{}}""",
        )

        assertThat(response).isNull()
        assertThat(captured?.first).isEqualTo("ec.test.ping")
        assertThat(captured?.second).isInstanceOf(SerializationException::class.java)
    }

    @Test
    fun `process invokes onDecodeError and returns invalid params error for malformed request params`() {
        var captured: Pair<String, Throwable>? = null
        val client = Client()
            .onDecodeError { method, error -> captured = method to error }
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

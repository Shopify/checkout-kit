package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.Test

class DescriptorsTest {
    @Serializable
    private data class FixtureParams(val name: String)

    @Serializable
    private data class OptionalFixtureParams(val name: String? = null)

    @Serializable
    private data class FixtureResult(val ok: Boolean)

    @Test
    fun `requestDescriptor decodes params and encodes result`() {
        val descriptor: RequestDescriptor<String, Boolean> = requestDescriptor(
            method = "ec.fixture",
            delegation = "fixture.delegation",
            requestSerializer = FixtureParams.serializer(),
            responseSerializer = FixtureResult.serializer(),
            decode = { it.name },
            encode = { FixtureResult(ok = it) },
        )

        val params: JsonElement = JsonObject(mapOf("name" to JsonPrimitive("totes")))

        assertThat(descriptor.method).isEqualTo("ec.fixture")
        assertThat(descriptor.delegation).isEqualTo("fixture.delegation")
        assertThat(descriptor.decode(params)).isEqualTo("totes")
        assertThat(descriptor.encode(true)).isEqualTo(
            JsonObject(mapOf("ok" to JsonPrimitive(true))),
        )
    }

    @Test
    fun `requestDescriptor decodes missing params to an all-optional payload`() {
        val descriptor: RequestDescriptor<OptionalFixtureParams, Boolean> = requestDescriptor(
            method = "ec.auth",
            delegation = null,
            requestSerializer = OptionalFixtureParams.serializer(),
            responseSerializer = FixtureResult.serializer(),
            decode = { it },
            encode = { FixtureResult(ok = it) },
        )

        assertThat(descriptor.decode(null)).isEqualTo(OptionalFixtureParams(name = null))
    }

    @Test
    fun `requestDescriptor supports a null delegation`() {
        val descriptor: RequestDescriptor<String, Boolean> = requestDescriptor(
            method = "ec.ready",
            delegation = null,
            requestSerializer = FixtureParams.serializer(),
            responseSerializer = FixtureResult.serializer(),
            decode = { it.name },
            encode = { FixtureResult(ok = it) },
        )

        assertThat(descriptor.delegation).isNull()
    }

    @Test
    fun `notification mappings compose and preserve wire decoding failures`() {
        val descriptor = notificationDescriptor(
            method = "ec.fixture",
            paramsSerializer = FixtureParams.serializer(),
            decode = { it.name },
        ).map { "Hello, $it!" }.map { it.length }

        assertThat(descriptor.method).isEqualTo("ec.fixture")
        assertThat(descriptor.decode(JsonObject(mapOf("name" to JsonPrimitive("Ada"))))).isEqualTo(11)
        assertThatThrownBy { descriptor.decode(JsonObject(emptyMap())) }
            .isInstanceOf(SerializationException::class.java)
    }

    @Test
    fun `notification mapping skips missing payload and preserves mapping rejection`() {
        val untyped = NotificationDescriptor<String>("ec.fixture").map<String> {
            throw AssertionError("Mapping must not run without a decoded payload")
        }
        assertThat(untyped.decode(null)).isNull()

        val rejected = notificationDescriptor(
            method = "ec.fixture",
            paramsSerializer = FixtureParams.serializer(),
            decode = { it.name },
        ).map<String> { null }.map<String> { throw AssertionError("Rejected payload reached next mapping") }
        assertThat(rejected.decode(JsonObject(mapOf("name" to JsonPrimitive("Ada"))))).isNull()
    }

    @Test
    fun `request mappings compose in opposite directions for payload and result`() {
        val descriptor: RequestDescriptor<String, Boolean> = requestDescriptor(
            method = "ec.fixture",
            delegation = "fixture.delegation",
            requestSerializer = FixtureParams.serializer(),
            responseSerializer = FixtureResult.serializer(),
            decode = { it.name },
            encode = { FixtureResult(ok = it) },
        )
        val mapped = descriptor.map(
            decode = { name -> name.length },
            encode = { count: Int -> count > 0 },
        ).map(
            decode = { length -> "length=$length" },
            encode = { value: String -> value.toInt() },
        )
        assertThat(mapped.method).isEqualTo(descriptor.method)
        assertThat(mapped.delegation).isEqualTo(descriptor.delegation)
        assertThat(mapped.decode(JsonObject(mapOf("name" to JsonPrimitive("Ada"))))).isEqualTo("length=3")
        assertThat(mapped.encode("1")).isEqualTo(JsonObject(mapOf("ok" to JsonPrimitive(true))))
        assertThat(mapped.encode("0")).isEqualTo(JsonObject(mapOf("ok" to JsonPrimitive(false))))
        assertThatThrownBy { mapped.decode(JsonObject(emptyMap())) }
            .isInstanceOf(SerializationException::class.java)
    }

    @Test
    fun `request mapping preserves null delegation and skips missing payload`() {
        val mapped = RequestDescriptor<String, Boolean>("ec.fixture", null).map<String, Boolean>(
            decode = { _: String -> throw AssertionError("No payload to map") },
            encode = { value: Boolean -> value },
        )
        assertThat(mapped.delegation).isNull()
        assertThat(mapped.decode(null)).isNull()
    }
}

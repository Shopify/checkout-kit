package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import org.assertj.core.api.Assertions.assertThat
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
}

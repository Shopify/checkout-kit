package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class ConstraintExpressionTest {
    @Test
    fun `preserves null constants and missing constants`() {
        val wire = Json.parseToJsonElement(
            """
            {
              "type": "card",
              "constraints": {
                "required": ["billing_address"],
                "properties": {
                  "billing_address": {"const": null},
                  "network": {"enum": [null, "visa"]},
                  "metadata": {"const": {"optional": null}},
                  "values": {"const": [null, false, 0, ""]}
                },
                "anyOf": [{"properties": {"token": {"const": null}}}]
              }
            }
            """.trimIndent(),
        )
        val instrument = Json.decodeFromJsonElement(PaymentHandlerResponseSchemaAvailableInstrument.serializer(), wire)
        val constraints = requireNotNull(instrument.constraints)
        val properties = requireNotNull(constraints.properties)
        assertThat(properties["billing_address"]?.const).isSameAs(JsonNull)
        assertThat(properties["network"]?.const).isNull()
        assertThat(constraints.anyOf?.first()?.properties?.get("token")?.const).isSameAs(JsonNull)
        assertThat(Json.encodeToJsonElement(PaymentHandlerResponseSchemaAvailableInstrument.serializer(), instrument))
            .isEqualTo(wire)
    }
}

@file:kotlin.jvm.JvmName("EmbeddedCheckoutProtocolKt")

package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject

internal val embeddedProtocolJson: Json = Json { ignoreUnknownKeys = true }

public fun decodeProtocolRequest(message: String): EcpRequest {
    val requestObject = embeddedProtocolJson.decodeFromString<JsonObject>(message)
    return embeddedProtocolJson.decodeFromJsonElement<EcpRequest>(requestObject).copy(id = requestObject["id"])
}

public fun jsonRpcRequestId(id: JsonElement?): JsonElement? =
    when (id) {
        JsonNull -> JsonNull
        is JsonPrimitive -> id.takeIf {
            it.isString ||
                (!it.isString && JSON_RPC_INTEGER.matches(it.content) && it.content.toLongOrNull() != null)
        }
        else -> null
    }

public fun encodeJsonRpcResult(id: JsonElement?, result: JsonElement): String =
    embeddedProtocolJson.encodeToString(
        JsonObject.serializer(),
        buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", id ?: JsonNull)
            put("result", result)
        }
    )

public fun encodeJsonRpcError(id: JsonElement?, code: Int, message: String): String =
    embeddedProtocolJson.encodeToString(
        JsonObject.serializer(),
        buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", id ?: JsonNull)
            putJsonObject("error") {
                put("code", code)
                put("message", message)
            }
        }
    )

private val JSON_RPC_INTEGER: Regex = Regex("-?(0|[1-9]\\d*)")

@Serializable
public data class EcpRequest(
    public val jsonrpc: String = "2.0",
    public val method: String,
    public val id: JsonElement? = null,
    public val params: JsonElement? = null,
)

@Serializable
public data class ReadyParams(
    public val delegate: List<String> = emptyList(),
)

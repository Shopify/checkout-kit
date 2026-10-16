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
    val request = embeddedProtocolJson.decodeFromJsonElement<EcpRequest>(requestObject)
    // Keep the raw id element, including an explicit null, which JSON-RPC distinguishes from an absent id.
    return EcpRequest(
        jsonrpc = request.jsonrpc,
        method = request.method,
        id = requestObject["id"],
        params = request.params
    )
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

public fun EcpRequest.hasValidJsonRpcRequestId(): Boolean =
    id == null || jsonRpcRequestId(id) != null

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

/** A decoded JSON-RPC request or notification. Produced by [decodeProtocolRequest]. */
@Serializable
public class EcpRequest internal constructor(
    public val jsonrpc: String = "2.0",
    public val method: String,
    public val id: JsonElement? = null,
    public val params: JsonElement? = null,
) {
    override fun equals(other: Any?): Boolean =
        this === other ||
            (
                other is EcpRequest &&
                    jsonrpc == other.jsonrpc &&
                    method == other.method &&
                    id == other.id &&
                    params == other.params
                )

    override fun hashCode(): Int = java.util.Objects.hash(jsonrpc, method, id, params)

    override fun toString(): String = "EcpRequest(jsonrpc=$jsonrpc, method=$method, id=$id, params=$params)"
}

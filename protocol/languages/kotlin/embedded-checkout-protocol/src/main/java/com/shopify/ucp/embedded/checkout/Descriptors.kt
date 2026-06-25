package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement

/**
 * Describes a typed protocol notification.
 *
 * Protocol modules own descriptor primitives and spec-level codecs. Host SDKs
 * decide which descriptors they expose and can adapt payloads for their platform.
 */
public class NotificationDescriptor<P : Any> internal constructor(
    public val method: String,
    private val decodePayload: (JsonElement?) -> P?,
) {
    public constructor(method: String) : this(method, decodePayload = { null })

    public fun decode(params: JsonElement?): P? = decodePayload(params)

    public fun <MappedPayload : Any> map(
        decode: (P) -> MappedPayload?,
    ): NotificationDescriptor<MappedPayload> =
        NotificationDescriptor(
            method = method,
            decodePayload = { params ->
                decodePayload(params)?.let(decode)
            },
        )
}

/**
 * Describes a typed protocol request/response delegation.
 *
 * [method] is the JSON-RPC method name. [delegation] is the capability token used
 * during protocol negotiation, such as `window.open`.
 */
public class DelegationDescriptor<P : Any, R : Any> internal constructor(
    public val method: String,
    public val delegation: String,
    private val decodePayload: (JsonElement?) -> P?,
    private val encodeResult: (R) -> JsonElement,
) {
    public constructor(
        method: String,
        delegation: String,
    ) : this(method, delegation, decodePayload = { null }, encodeResult = { JsonNull })

    public fun decode(params: JsonElement?): P? = decodePayload(params)

    public fun encode(result: R): JsonElement = encodeResult(result)

    public fun <MappedPayload : Any, MappedResult : Any> map(
        decode: (P) -> MappedPayload?,
        encode: (MappedResult) -> R,
    ): DelegationDescriptor<MappedPayload, MappedResult> =
        DelegationDescriptor(
            method = method,
            delegation = delegation,
            decodePayload = { params ->
                decodePayload(params)?.let(decode)
            },
            encodeResult = { result ->
                encodeResult(encode(result))
            },
        )
}

public fun <Params : Any, P : Any> notificationDescriptor(
    method: String,
    paramsSerializer: KSerializer<Params>,
    decode: (Params) -> P?,
): NotificationDescriptor<P> =
    NotificationDescriptor(
        method = method,
        decodePayload = { params ->
            decodeDescriptorParams(paramsSerializer, params).let(decode)
        },
    )

@Suppress("LongParameterList")
public fun <RequestParams : Any, P : Any, ResponsePayload : Any, R : Any> delegationDescriptor(
    method: String,
    delegation: String,
    requestSerializer: KSerializer<RequestParams>,
    responseSerializer: KSerializer<ResponsePayload>,
    decode: (RequestParams) -> P?,
    encode: (R) -> ResponsePayload,
): DelegationDescriptor<P, R> =
    DelegationDescriptor(
        method = method,
        delegation = delegation,
        decodePayload = { params ->
            decodeDescriptorParams(requestSerializer, params).let(decode)
        },
        encodeResult = { result ->
            embeddedProtocolJson.encodeToJsonElement(responseSerializer, encode(result))
        },
    )

private fun <Params : Any> decodeDescriptorParams(
    serializer: KSerializer<Params>,
    params: JsonElement?,
): Params =
    embeddedProtocolJson.decodeFromJsonElement(serializer, params ?: JsonNull)

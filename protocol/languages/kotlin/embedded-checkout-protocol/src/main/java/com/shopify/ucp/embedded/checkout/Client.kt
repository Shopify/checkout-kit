package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.JsonElement

/**
 * A typed, fluent dispatcher for Embedded Checkout Protocol messages.
 *
 * Host SDKs register handlers against descriptors and feed raw JSON-RPC messages to
 * [process]. The client decodes params, routes notifications and requests, and encodes
 * responses. It is thread-agnostic: handlers run synchronously on the calling thread, so
 * hosts that need to hop threads (for example onto a UI thread) wrap their handlers
 * accordingly before registering them.
 *
 * Each [on] call returns a new [Client] instance, making it safe to share a base
 * configuration across multiple presentations.
 */
public class Client private constructor(
    private val notificationHandlers: Map<String, NotificationEntry>,
    private val requestHandlers: Map<String, RequestEntry>,
    private val decodeErrorHandler: DecodeErrorHandler?,
) {
    public constructor() : this(emptyMap(), emptyMap(), null)

    /**
     * Registers a callback invoked whenever a notification or request payload fails to
     * decode. The dropped message still short-circuits (notifications are skipped,
     * requests answer with an invalid-params error), but the host gets a chance to
     * observe and log the failure instead of it being swallowed silently.
     */
    public fun onDecodeError(handler: DecodeErrorHandler): Client =
        Client(notificationHandlers, requestHandlers, handler)

    public fun <P : Any> on(descriptor: NotificationDescriptor<P>, handler: (P) -> Unit): Client {
        val entry = NotificationEntry(
            decode = { descriptor.decode(it) },
            invoke = { payload ->
                @Suppress("UNCHECKED_CAST")
                handler(payload as P)
            },
        )
        return Client(notificationHandlers + (descriptor.method to entry), requestHandlers, decodeErrorHandler)
    }

    public fun <P : Any, R : Any> on(descriptor: RequestDescriptor<P, R>, handler: (P) -> R): Client {
        val entry = RequestEntry(
            decode = { descriptor.decode(it) },
            invokeAndEncode = { payload ->
                @Suppress("UNCHECKED_CAST")
                descriptor.encode(handler(payload as P))
            },
        )
        return Client(notificationHandlers, requestHandlers + (descriptor.method to entry), decodeErrorHandler)
    }

    public fun process(message: String): String? {
        val request = decodeEnvelope(message) ?: return null
        val requestEntry = requestHandlers[request.method]
        return if (requestEntry != null) {
            request.id?.let { jsonRpcRequestId(it) }?.let { dispatchRequest(requestEntry, request) }
        } else {
            dispatchNotification(request)
            null
        }
    }

    private fun decodeEnvelope(message: String): EcpRequest? = try {
        decodeProtocolRequest(message).takeIf { it.hasValidJsonRpcRequestId() }
    } catch (_: SerializationException) {
        null
    }

    private fun dispatchNotification(request: EcpRequest) {
        val entry = notificationHandlers[request.method] ?: return
        val payload = try {
            entry.decode(request.params)
        } catch (e: SerializationException) {
            decodeErrorHandler?.invoke(request.method, e)
            return
        }
        payload?.let { entry.invoke(it) }
    }

    private fun dispatchRequest(entry: RequestEntry, request: EcpRequest): String {
        val payload = try {
            entry.decode(request.params)
        } catch (e: SerializationException) {
            decodeErrorHandler?.invoke(request.method, e)
            null
        } ?: return encodeJsonRpcError(request.id, CODE_INVALID_PARAMS, "Invalid params for ${request.method}")
        return encodeJsonRpcResult(request.id, entry.invokeAndEncode(payload))
    }

    private class NotificationEntry(
        val decode: (JsonElement?) -> Any?,
        val invoke: (Any) -> Unit,
    )

    private class RequestEntry(
        val decode: (JsonElement?) -> Any?,
        val invokeAndEncode: (Any) -> JsonElement,
    )

    private companion object {
        private const val CODE_INVALID_PARAMS: Int = -32602
    }
}

public typealias DecodeErrorHandler = (method: String, error: Throwable) -> Unit

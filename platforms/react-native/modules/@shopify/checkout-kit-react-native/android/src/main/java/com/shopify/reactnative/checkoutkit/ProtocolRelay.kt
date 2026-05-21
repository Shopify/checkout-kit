package com.shopify.reactnative.checkoutkit

import android.util.Log
import com.shopify.checkoutkit.CheckoutProtocol
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private const val TAG = "ShopifyCheckoutKit"

fun interface DispatchCallback {
    fun invoke(json: String)
}

@Serializable
internal data class DispatchEnvelope<P>(
    val type: String,
    val payload: P,
)

/**
 * Bridges native CheckoutProtocol notifications to the React Native onDispatch
 * event stream. Payloads are emitted in protocol wire casing; JS performs the
 * schema-aware conversion to the public camelCase shape with QuickType.
 */
object ProtocolRelay {

    private val json: Json = Json { ignoreUnknownKeys = true }

    @JvmStatic
    fun makeClient(
        subscribedMethods: List<String>,
        dispatch: DispatchCallback,
    ): CheckoutProtocol.Client {
        var client = CheckoutProtocol.Client()
        for (method in subscribedMethods) {
            when (method) {
                CheckoutProtocol.complete.method -> {
                    client = client.on(CheckoutProtocol.complete) { checkout ->
                        forwardEnvelope(method, checkout, dispatch)
                    }
                }
                CheckoutProtocol.error.method -> {
                    client = client.on(CheckoutProtocol.error) { error ->
                        forwardEnvelope(method, error, dispatch)
                    }
                }
                CheckoutProtocol.lineItemsChange.method -> {
                    client = client.on(CheckoutProtocol.lineItemsChange) { checkout ->
                        forwardEnvelope(method, checkout, dispatch)
                    }
                }
                CheckoutProtocol.messagesChange.method -> {
                    client = client.on(CheckoutProtocol.messagesChange) { checkout ->
                        forwardEnvelope(method, checkout, dispatch)
                    }
                }
                CheckoutProtocol.start.method -> {
                    client = client.on(CheckoutProtocol.start) { checkout ->
                        forwardEnvelope(method, checkout, dispatch)
                    }
                }
                CheckoutProtocol.totalsChange.method -> {
                    client = client.on(CheckoutProtocol.totalsChange) { checkout ->
                        forwardEnvelope(method, checkout, dispatch)
                    }
                }
            }
        }
        return client
    }

    private inline fun <reified P> forwardEnvelope(
        type: String,
        payload: P,
        dispatch: DispatchCallback,
    ) {
        try {
            val envelopeJson = json.encodeToString(DispatchEnvelope(type, payload))
            dispatch.invoke(envelopeJson)
        } catch (e: Exception) {
            Log.e(TAG, "Error dispatching protocol event \"$type\"", e)
        }
    }
}

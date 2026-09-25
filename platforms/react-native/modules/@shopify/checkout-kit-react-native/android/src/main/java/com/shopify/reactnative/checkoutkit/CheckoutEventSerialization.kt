package com.shopify.reactnative.checkoutkit

import com.shopify.checkoutkit.Checkout
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.put

fun interface DispatchCallback {
    fun invoke(json: String)
}

/** Uses the native snapshot serializer to retain wire names and extension fields. */
object CheckoutEventSerialization {
    @JvmStatic
    fun checkout(type: String, requestId: String, checkout: Checkout): String =
        Json.encodeToString(buildJsonObject {
            put("type", type)
            put("requestId", requestId)
            put("payload", buildJsonObject {
                put("checkout", Json.encodeToJsonElement(checkout))
            })
        })
}

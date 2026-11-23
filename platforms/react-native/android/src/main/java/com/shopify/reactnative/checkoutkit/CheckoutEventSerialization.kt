package com.shopify.reactnative.checkoutkit

import com.shopify.checkoutkit.checkout.Checkout
import com.shopify.checkoutkit.checkout.CheckoutException
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject

fun interface DispatchCallback {
    fun invoke(json: String)
}

object CheckoutEventSerialization {
    /** Uses the native snapshot serializer to retain wire names and extension fields. */
    @JvmStatic
    fun checkout(type: String, checkout: Checkout): String =
        envelope(type, buildJsonObject { put("checkout", Json.encodeToJsonElement(checkout)) })

    @JvmStatic
    fun geolocationRequest(origin: String): String =
        envelope(DispatchEventTypes.GEOLOCATION_REQUEST, buildJsonObject { put("origin", origin) })

    @JvmStatic
    fun linkClick(url: String): String =
        envelope(DispatchEventTypes.LINK_CLICK, buildJsonObject { put("url", url) })

    @JvmStatic
    fun fail(error: CheckoutException): String = envelope(DispatchEventTypes.FAIL, buildJsonObject {
        putJsonObject("error") {
            put("message", error.message)
            put("code", error.code.name.lowercase())
            error.httpStatusCode?.let { put("statusCode", it) }
        }
    })

    @JvmStatic
    fun dismiss(): String = envelope(DispatchEventTypes.DISMISS)

    private fun envelope(type: String, payload: JsonObject? = null): String =
        Json.encodeToString(buildJsonObject {
            put("type", type)
            if (payload != null) put("payload", payload)
        })
}

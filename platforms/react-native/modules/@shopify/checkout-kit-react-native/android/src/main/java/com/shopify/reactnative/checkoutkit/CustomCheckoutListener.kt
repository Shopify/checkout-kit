package com.shopify.reactnative.checkoutkit

import android.util.Log
import android.webkit.GeolocationPermissions
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.JsonNode
import com.shopify.checkoutkit.CheckoutException
import com.shopify.checkoutkit.DefaultCheckoutListener
import java.io.IOException
import java.util.Locale

class CustomCheckoutListener(
    private val dispatch: DispatchHandle,
) : DefaultCheckoutListener() {
    constructor(dispatch: DispatchCallback) : this(DispatchHandle(dispatch))

    private val mapper = ObjectMapper()
    private var geolocationOrigin: String? = null
    private var geolocationCallback: GeolocationPermissions.Callback? = null

    fun invokeGeolocationCallback(allow: Boolean) {
        geolocationCallback?.invoke(geolocationOrigin, allow, false)
        geolocationCallback = null
    }

    fun release() {
        dispatch.release()
        geolocationCallback = null
        geolocationOrigin = null
    }

    /**
     * Called when the checkout sheet's webpage requests geolocation permissions. The platform
     * callback is stored in memory; the dispatcher is invoked with a `geolocationRequest` envelope
     * so JS can either route to a per-call handler or run the default permission flow.
     *
     * Multi-shot — the same checkout sheet may request geolocation multiple times during a single
     * `present()` call, so the dispatcher is not nulled after invocation.
     */
    override fun onGeolocationPermissionsShowPrompt(
        origin: String,
        callback: GeolocationPermissions.Callback,
    ) {
        if (dispatch.isReleased()) {
            Log.w(TAG, "Dropping geolocationRequest — dispatcher already released.")
            return
        }

        geolocationCallback = callback
        geolocationOrigin = origin

        try {
            dispatch.invoke(buildEnvelope(DispatchEventTypes.GEOLOCATION_REQUEST, mapOf("origin" to origin)))
        } catch (error: IOException) {
            Log.e(TAG, "Error emitting \"geolocationRequest\" event", error)
        }
    }

    override fun onGeolocationPermissionsHidePrompt() {
        super.onGeolocationPermissionsHidePrompt()
        geolocationCallback = null
        geolocationOrigin = null
    }

    override fun onCheckoutFailed(error: CheckoutException) {
        if (dispatch.isReleased()) return

        try {
            dispatch.invoke(buildEnvelope(DispatchEventTypes.FAIL, populateErrorDetails(error)))
        } catch (serializationError: IOException) {
            Log.e(TAG, "Error processing checkout failed event", serializationError)
        } finally {
            release()
        }
    }

    override fun onCheckoutDismissed() {
        if (dispatch.isReleased()) return

        try {
            dispatch.invoke(buildEnvelope(DispatchEventTypes.CLOSE, null))
        } catch (error: IOException) {
            Log.e(TAG, "Error processing checkout dismissed event", error)
        } finally {
            release()
        }
    }

    @Throws(IOException::class)
    private fun buildEnvelope(type: String, payload: Any?): String {
        val envelope = mapper.createObjectNode().put("type", type)
        if (payload != null) {
            envelope.set<JsonNode>("payload", mapper.valueToTree(payload))
        }
        return mapper.writeValueAsString(envelope)
    }

    private fun populateErrorDetails(error: CheckoutException): Map<String, Any> = buildMap {
        put("message", error.message.orEmpty())
        put("code", error.code.name.lowercase(Locale.ROOT))
        error.httpStatusCode?.let { put("statusCode", it) }
    }

    private companion object {
        const val TAG = "ShopifyCheckoutKit"
    }
}

package com.shopify.checkoutkit.lifecycleevents

import com.shopify.checkoutkit.LogWrapper
import com.shopify.checkoutkit.WebToSdkEvent
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
public data class CheckoutCompletedEvent(
    public val orderDetails: OrderDetails
)

internal class CheckoutCompletedEventDecoder @JvmOverloads constructor(
    private val decoder: Json,
    private val log: LogWrapper = LogWrapper()
) {
    fun decode(decodedMsg: WebToSdkEvent): CheckoutCompletedEvent {
        return try {
            decoder.decodeFromString<CheckoutCompletedEvent>(decodedMsg.body)
        } catch (e: Exception) {
            log.e("CheckoutBridge", "Failed to decode CheckoutCompleted event", e)
            emptyCompletedEvent()
        }
    }
}

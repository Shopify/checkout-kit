package com.shopify.checkoutkit.androiddemo.logs

import com.shopify.checkoutkit.androiddemo.common.logs.LogLine
import com.shopify.checkoutkit.androiddemo.common.logs.LogSource
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import java.util.UUID

internal data class CheckoutLogContext(
    val checkoutId: String,
    val previousCheckoutPayload: String? = null,
)

/** Derives checkout ownership and payload history from logs ordered oldest to newest. */
internal fun List<LogLine>.checkoutContextsByLogId(): Map<UUID, CheckoutLogContext> {
    val latestPayloadByCheckoutId = mutableMapOf<String, String>()
    var activeCheckoutId: String? = null
    var completedCheckoutIdForFollowUpDismissal: String? = null

    return buildMap {
        for (logLine in this@checkoutContextsByLogId) {
            val recentlyCompletedCheckoutId = completedCheckoutIdForFollowUpDismissal
            completedCheckoutIdForFollowUpDismissal = null
            val checkoutPayload = logLine.checkoutPayload()
            if (checkoutPayload != null) activeCheckoutId = checkoutPayload.checkoutId

            val checkoutId = checkoutPayload?.checkoutId
                ?: activeCheckoutId
                ?: recentlyCompletedCheckoutId?.takeIf { logLine.isCheckoutDismissal() }
            if (checkoutId != null) {
                put(
                    logLine.id,
                    CheckoutLogContext(
                        checkoutId = checkoutId,
                        previousCheckoutPayload = checkoutPayload?.let {
                            latestPayloadByCheckoutId[checkoutId]
                        },
                    ),
                )
            }

            if (checkoutPayload != null) {
                latestPayloadByCheckoutId[checkoutPayload.checkoutId] = checkoutPayload.payload
            }
            when {
                logLine.isCheckoutCompletion() -> {
                    activeCheckoutId = null
                    completedCheckoutIdForFollowUpDismissal = checkoutId
                }
                logLine.isTerminalSdkEvent() -> activeCheckoutId = null
            }
        }
    }
}

private fun LogLine.checkoutPayload(): CheckoutPayload? {
    val isCheckoutEvent = source == LogSource.SDK && message in checkoutSnapshotMessages
    if (!isCheckoutEvent && source != LogSource.PROTOCOL) return null
    val serializedPayload = payload ?: return null
    val payloadObject = runCatching {
        Json.parseToJsonElement(serializedPayload).jsonObject
    }.getOrNull() ?: return null
    val checkoutId = (payloadObject["id"] as? JsonPrimitive)?.contentOrNull ?: return null

    // Recognize saved protocol logs from earlier sample versions without using the protocol API.
    if (!isCheckoutEvent) {
        runCatching {
            payloadObject.getValue("line_items").jsonArray
            payloadObject.getValue("totals").jsonArray
        }.getOrNull() ?: return null
    }

    return CheckoutPayload(checkoutId, serializedPayload)
}

private fun LogLine.isCheckoutCompletion(): Boolean =
    (source == LogSource.SDK && message == "Checkout completed") ||
        (source == LogSource.PROTOCOL && message == "Received: ec.complete")

private fun LogLine.isCheckoutDismissal(): Boolean =
    source == LogSource.SDK && message == "Checkout dismissed"

private fun LogLine.isTerminalSdkEvent(): Boolean =
    source == LogSource.SDK && message in terminalSdkMessages

private data class CheckoutPayload(
    val checkoutId: String,
    val payload: String,
)

private val terminalSdkMessages = setOf("Checkout dismissed", "Checkout failed")
private val checkoutSnapshotMessages = setOf("Checkout started", "Checkout updated", "Checkout completed")

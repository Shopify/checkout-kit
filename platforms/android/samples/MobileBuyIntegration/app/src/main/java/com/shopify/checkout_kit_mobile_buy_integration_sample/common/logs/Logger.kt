package com.shopify.checkout_kit_mobile_buy_integration_sample.common.logs

import com.shopify.checkoutkit.Checkout
import com.shopify.checkoutkit.CheckoutException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.Date
import java.util.UUID

class Logger(
    private val logDb: LogDatabase,
    private val coroutineScope: CoroutineScope,
) {
    fun log(message: String) {
        insert(
            LogLine(
                type = LogType.STANDARD,
                message = message,
            )
        )
    }

    fun log(checkout: Checkout) {
        insert(
            LogLine(
                type = LogType.CHECKOUT_COMPLETED,
                message = "Checkout completed: ${checkout.order?.id ?: "unknown"}",
                checkoutCompletedPayload = Json.encodeToString(checkout),
            )
        )
    }

    fun log(message: String, e: CheckoutException) {
        insert(
            LogLine(
                id = UUID.randomUUID(),
                type = LogType.ERROR,
                createdAt = Date().time,
                message = message,
                errorDetails = ErrorDetails(
                    message = e.message ?: "No message on error",
                    type = "${e::class.java}"
                ),
            )
        )
    }

    private fun insert(logLine: LogLine) = coroutineScope.launch {
        logDb.logDao().insert(logLine)
    }
}

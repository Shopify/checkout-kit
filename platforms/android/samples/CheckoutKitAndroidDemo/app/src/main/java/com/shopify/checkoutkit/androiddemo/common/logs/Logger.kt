package com.shopify.checkoutkit.androiddemo.common.logs

import com.shopify.checkoutkit.CheckoutException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class Logger(
    private val logDb: LogDatabase,
    private val coroutineScope: CoroutineScope,
) {
    fun logSdkEvent(message: String) {
        log(LogSource.SDK, LogLevel.INFO, message)
    }

    fun logSdkError(message: String, error: CheckoutException) {
        val payload = Json.encodeToString(
            mapOf(
                "code" to error.code.name,
                "message" to error.message,
                "httpStatusCode" to error.httpStatusCode?.toString(),
            )
        )
        log(LogSource.SDK, LogLevel.ERROR, message, payload)
    }

    fun logProtocolMessage(message: String, payload: String, level: LogLevel) {
        log(LogSource.PROTOCOL, level, message, payload)
    }

    private fun log(
        source: LogSource,
        level: LogLevel,
        message: String,
        payload: String? = null,
    ) {
        insert(
            LogLine(
                source = source,
                level = level,
                message = message,
                payload = payload,
            )
        )
    }

    private fun insert(logLine: LogLine) = coroutineScope.launch {
        logDb.logDao().insert(logLine)
    }
}

package com.shopify.checkout_kit_android_demo.logs

import android.text.format.DateFormat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shopify.checkout_kit_android_demo.common.logs.LogDatabase
import com.shopify.checkout_kit_android_demo.common.logs.LogLine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Date

class LogsViewModel(private val logDb: LogDatabase): ViewModel() {

    private val _logState = MutableStateFlow<LogState>(LogState.Loading)
    val logState: StateFlow<LogState> = _logState.asStateFlow()

    fun readLogs(last: Int) {
        viewModelScope.launch(Dispatchers.IO) {
            val logLines = logDb.logDao().getLast(last)
            val checkoutContexts = logLines.asReversed().checkoutContextsByLogId()
            val logs = logLines.map { logLine ->
                logLine.toPrettyLog(checkoutContexts[logLine.id])
            }
            _logState.value = LogState.Populated(
                groups = logs.groupByCheckout(),
            )
        }
    }

    fun clear() {
        viewModelScope.launch(Dispatchers.IO) {
            logDb.logDao().clear()
            _logState.value = LogState.Populated(emptyList())
        }
    }

    private fun LogLine.toPrettyLog(checkoutContext: CheckoutLogContext?) = PrettyLog(
        formattedDate = DateFormat.format(Logs.DATE_FORMAT, Date(createdAt)).toString(),
        message = message,
        data = this,
        checkoutId = checkoutContext?.checkoutId,
        previousCheckoutPayload = checkoutContext?.previousCheckoutPayload,
    )

}

sealed class LogState {
    data object Loading: LogState()
    data class Populated(
        val groups: List<CheckoutLogGroup>
    ): LogState()
}

data class CheckoutLogGroup(
    val checkoutId: String?,
    val logs: List<PrettyLog>,
)

data class PrettyLog(
    val formattedDate: String,
    val message: String,
    val data: LogLine,
    val checkoutId: String?,
    val previousCheckoutPayload: String?,
)

/** Groups newest-first logs by checkout, then restores chronological order within each group. */
internal fun List<PrettyLog>.groupByCheckout(): List<CheckoutLogGroup> =
    groupBy(PrettyLog::checkoutId).map { (checkoutId, logs) ->
        CheckoutLogGroup(checkoutId, logs.asReversed())
    }

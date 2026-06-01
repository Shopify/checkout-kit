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
            _logState.value = LogState.Populated(
                logs = logDb.logDao().getLast(last).map { it.toPrettyLog() }
            )
        }
    }

    fun clear() {
        viewModelScope.launch(Dispatchers.IO) {
            logDb.logDao().clear()
            _logState.value = LogState.Populated(emptyList())
        }
    }

    private fun LogLine.toPrettyLog() = PrettyLog(
        formattedDate = DateFormat.format(Logs.DATE_FORMAT, Date(createdAt)).toString(),
        message = message,
        data = this,
    )

}

sealed class LogState {
    data object Loading: LogState()
    data class Populated(
        val logs: List<PrettyLog>
    ): LogState()
}

data class PrettyLog(
    val formattedDate: String,
    val message: String,
    val data: LogLine,
)

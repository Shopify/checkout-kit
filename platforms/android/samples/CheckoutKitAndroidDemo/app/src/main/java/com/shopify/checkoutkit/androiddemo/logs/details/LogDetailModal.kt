package com.shopify.checkoutkit.androiddemo.logs.details

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.window.Dialog
import com.shopify.checkoutkit.androiddemo.common.logs.LogLine
import kotlinx.serialization.json.Json

@Composable
fun LogDetailModal(
    logLine: LogLine?,
    previousCheckoutPayload: String?,
    onDismissRequest: () -> Unit,
    prettyJson: Json = Json {
        prettyPrint = true
        prettyPrintIndent = "  "
    }
) {
    Dialog(onDismissRequest = { onDismissRequest() }) {
        Card(
            modifier = Modifier
                .wrapContentHeight()
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface)
        ) {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                if (logLine == null) {
                    Text("Unknown log")
                } else {
                    LogDetails("Source", logLine.source.name, Modifier.fillMaxWidth())
                    LogDetails("Level", logLine.level.name, Modifier.fillMaxWidth())
                    LogDetails("Event", logLine.message, Modifier.fillMaxWidth())
                    logLine.payload?.let { payload ->
                        val payloadDiff = prettyJson.diffPayload(
                            payload = payload,
                            previousPayload = previousCheckoutPayload,
                            changedStyle = SpanStyle(
                                color = MaterialTheme.colorScheme.tertiary,
                                fontWeight = FontWeight.W900,
                            ),
                        )
                        val payloadHeader = when (payloadDiff.comparison) {
                            PayloadComparison.NOT_COMPARED -> "Payload"
                            PayloadComparison.UNCHANGED -> "Payload (unchanged)"
                            PayloadComparison.CHANGED -> "Payload (changes in accent color)"
                        }
                        LogDetails(payloadHeader, payloadDiff.payload, Modifier.fillMaxWidth())
                        if (payloadDiff.removedPaths.isNotEmpty()) {
                            LogDetails(
                                "Removed since previous payload",
                                payloadDiff.removedPaths.joinToString("\n"),
                                Modifier.fillMaxWidth(),
                            )
                        }
                    }
                }
            }
        }
    }
}

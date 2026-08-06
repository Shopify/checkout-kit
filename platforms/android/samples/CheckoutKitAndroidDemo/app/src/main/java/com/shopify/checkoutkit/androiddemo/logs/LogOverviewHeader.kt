package com.shopify.checkoutkit.androiddemo.logs

import androidx.compose.foundation.layout.Row
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.shopify.checkoutkit.androiddemo.common.components.Header3

@Composable
fun LogOverviewHeader(modifier: Modifier) {
    Row(modifier) {
        Header3(
            text = "Date",
            fontSize = MaterialTheme.typography.bodyMedium.fontSize,
            modifier = Modifier.weight(Logs.DATE_COLUMN_WEIGHT),
        )
        Header3(
            text = "Event",
            fontSize = MaterialTheme.typography.bodyMedium.fontSize,
            modifier = Modifier.weight(Logs.MESSAGE_COLUMN_WEIGHT),
        )
    }
}

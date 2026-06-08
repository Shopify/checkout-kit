package com.shopify.checkout_kit_android_demo.logs

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.shopify.checkout_kit_android_demo.common.components.BodySmall

@Composable
fun LogOverview(log: PrettyLog, onClick: () -> Unit, modifier: Modifier) {
    Row(modifier) {
        BodySmall(
            text = log.formattedDate,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier
                .weight(Logs.DATE_COLUMN_WEIGHT)
                .fillMaxHeight()
                .align(Alignment.CenterVertically)
        )

        TextButton(
            onClick,
            contentPadding = PaddingValues(0.dp),
            modifier = Modifier
                .weight(Logs.MESSAGE_COLUMN_WEIGHT)
                .fillMaxWidth()
                .height(28.dp)
        ) {
            BodySmall(
                text = log.message,
                textDecoration = TextDecoration.Underline,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

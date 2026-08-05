package com.shopify.checkoutkit.androiddemo.logs.details

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shopify.checkoutkit.androiddemo.common.components.BodyMedium

@Composable
fun LogDetails(header: String, message: String, modifier: Modifier) {
    LogDetails(header, AnnotatedString(message), modifier)
}

@Composable
fun LogDetails(header: String, message: AnnotatedString, modifier: Modifier) {
    Row(modifier) {
        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
            BodyMedium(text = header)
            Text(message, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
        }
    }
}

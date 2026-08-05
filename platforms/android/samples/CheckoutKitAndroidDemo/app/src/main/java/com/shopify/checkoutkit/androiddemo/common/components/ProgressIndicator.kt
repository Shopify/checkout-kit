package com.shopify.checkoutkit.androiddemo.common.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun ProgressIndicator() {
    Column(modifier = Modifier.fillMaxSize()) {
        LinearProgressIndicator(
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

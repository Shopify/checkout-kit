package com.shopify.checkout_kit_android_demo.logs

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun CheckoutLogGroupHeader(checkoutId: String?, modifier: Modifier = Modifier) {
    Text(
        text = checkoutId?.let { "Checkout ${it.abbreviated()}" } ?: "No checkout ID",
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = modifier,
    )
}

private fun String.abbreviated(): String =
    if (length <= MAX_CHECKOUT_ID_LENGTH) this else "${take(ID_SECTION_LENGTH)}…${takeLast(ID_SECTION_LENGTH)}"

private const val MAX_CHECKOUT_ID_LENGTH = 25
private const val ID_SECTION_LENGTH = 12

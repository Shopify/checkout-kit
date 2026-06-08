package com.shopify.checkout_kit_android_demo.logs.details

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.Json

@Composable
fun CheckoutCompletedDetails(
    payload: String?,
    prettyJson: Json,
) {
    LogDetails(
        header = "Details",
        message = prettyJson.prettyPrintedPayload(payload),
        modifier = Modifier
            .fillMaxWidth()
            .background(color = MaterialTheme.colorScheme.surface)
    )
}

private fun Json.prettyPrintedPayload(payload: String?, default: String = "n/a"): String {
    if (payload == null) return default
    return runCatching {
        val jsonElement: JsonElement = decodeFromString(payload)
        encodeToString(JsonElement.serializer(), jsonElement)
    }.getOrDefault(payload)
}

package com.shopify.checkout_kit_mobile_buy_integration_sample.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.shopify.checkout_kit_mobile_buy_integration_sample.common.components.BodyMedium

@Composable
fun Version(
    title: String,
    version: String,
    modifier: Modifier
) {
    Row(modifier = modifier, horizontalArrangement = Arrangement.SpaceBetween) {
        BodyMedium(text = title)
        BodyMedium(
            version,
            color = MaterialTheme.colorScheme.onBackground,
        )
    }
}

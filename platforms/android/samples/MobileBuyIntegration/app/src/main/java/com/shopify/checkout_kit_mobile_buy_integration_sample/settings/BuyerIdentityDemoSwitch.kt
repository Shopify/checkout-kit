package com.shopify.checkout_kit_mobile_buy_integration_sample.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Switch
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.shopify.checkout_kit_mobile_buy_integration_sample.common.components.BodyMedium

@Composable
fun BuyerIdentityDemoSwitch(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier,
) {
    Row(
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
    ) {
        BodyMedium("Prefill buyer information")
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
    }
}

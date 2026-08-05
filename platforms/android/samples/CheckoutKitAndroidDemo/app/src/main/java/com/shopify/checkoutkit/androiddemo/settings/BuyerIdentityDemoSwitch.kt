package com.shopify.checkoutkit.androiddemo.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Switch
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.shopify.checkoutkit.androiddemo.common.components.BodyMedium

@Composable
fun BuyerIdentityDemoSwitch(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier,
) {
    SettingsSwitch(
        label = "Prefill buyer information",
        checked = checked,
        onCheckedChange = onCheckedChange,
        modifier = modifier,
    )
}

@Composable
fun SettingsSwitch(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier,
) {
    Row(
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
    ) {
        BodyMedium(label)
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
    }
}

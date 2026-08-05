package com.shopify.checkoutkit.androiddemo.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.shopify.checkoutkit.androiddemo.R
import com.shopify.checkoutkit.androiddemo.common.components.BodyMedium
import com.shopify.checkoutkit.androiddemo.common.ui.theme.verticalPadding
import com.shopify.checkoutkit.androiddemo.settings.data.CheckoutSheetPreset

@Composable
fun CheckoutSheetPresetSection(
    selected: CheckoutSheetPreset,
    setSelected: (CheckoutSheetPreset) -> Unit,
) {
    Column {
        BodyMedium(
            text = stringResource(id = R.string.checkout_sheet_style),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Column(
            modifier = Modifier
                .selectableGroup()
                .padding(vertical = verticalPadding),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            val optionModifier = Modifier
                .background(color = MaterialTheme.colorScheme.background)
                .fillMaxWidth()

            CheckoutSheetPresetOption(
                preset = CheckoutSheetPreset.NewDefaults,
                description = stringResource(id = R.string.checkout_sheet_style_default_description),
                selected = selected,
                setSelected = setSelected,
                modifier = optionModifier,
            )

            CheckoutSheetPresetOption(
                preset = CheckoutSheetPreset.LegacyDialog,
                description = stringResource(id = R.string.checkout_sheet_style_legacy_dialog_description),
                selected = selected,
                setSelected = setSelected,
                modifier = optionModifier,
            )
        }
    }
}

@Composable
fun CheckoutSheetPresetOption(
    preset: CheckoutSheetPreset,
    setSelected: (CheckoutSheetPreset) -> Unit,
    description: String,
    selected: CheckoutSheetPreset,
    modifier: Modifier,
) {
    SettingsRadioOption(
        label = stringResource(id = preset.title),
        description = description,
        selected = selected == preset,
        onClick = { setSelected(preset) },
        modifier = modifier,
    )
}

private val CheckoutSheetPreset.title: Int
    get() = when (this) {
        CheckoutSheetPreset.NewDefaults -> R.string.checkout_sheet_style_default
        CheckoutSheetPreset.LegacyDialog -> R.string.checkout_sheet_style_legacy_dialog
    }

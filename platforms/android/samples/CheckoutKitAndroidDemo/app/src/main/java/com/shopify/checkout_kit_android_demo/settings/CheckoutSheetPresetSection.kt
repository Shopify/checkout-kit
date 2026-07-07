package com.shopify.checkout_kit_android_demo.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.shopify.checkout_kit_android_demo.R
import com.shopify.checkout_kit_android_demo.common.components.BodyMedium
import com.shopify.checkout_kit_android_demo.common.components.Header3
import com.shopify.checkout_kit_android_demo.common.ui.theme.verticalPadding
import com.shopify.checkout_kit_android_demo.settings.data.CheckoutSheetPreset

@Composable
fun CheckoutSheetPresetSection(
    selected: CheckoutSheetPreset,
    setSelected: (CheckoutSheetPreset) -> Unit,
) {
    Column {
        Header3(text = stringResource(id = R.string.checkout_sheet_preset))

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
                description = stringResource(id = R.string.checkout_sheet_preset_new_defaults_description),
                selected = selected,
                setSelected = setSelected,
                modifier = optionModifier,
            )

            CheckoutSheetPresetOption(
                preset = CheckoutSheetPreset.LegacyDialog,
                description = stringResource(id = R.string.checkout_sheet_preset_legacy_dialog_description),
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
    val isSelected = selected == preset

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier.selectable(
            selected = isSelected,
            role = Role.RadioButton,
            onClick = { setSelected(preset) }
        ),
    ) {
        RadioButton(
            selected = isSelected,
            onClick = null,
            modifier = Modifier.semantics { contentDescription = description }
        )
        BodyMedium(
            stringResource(id = preset.title),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp)
        )
    }
}

private val CheckoutSheetPreset.title: Int
    get() = when (this) {
        CheckoutSheetPreset.NewDefaults -> R.string.checkout_sheet_preset_new_defaults
        CheckoutSheetPreset.LegacyDialog -> R.string.checkout_sheet_preset_legacy_dialog
    }

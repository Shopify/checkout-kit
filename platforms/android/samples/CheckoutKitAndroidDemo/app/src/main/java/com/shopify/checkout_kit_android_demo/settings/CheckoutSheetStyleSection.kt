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
import com.shopify.checkout_kit_android_demo.settings.data.CheckoutSheetStylePreset

@Composable
fun CheckoutSheetStyleSection(
    selected: CheckoutSheetStylePreset,
    setSelected: (CheckoutSheetStylePreset) -> Unit,
) {
    Column {
        Header3(text = stringResource(id = R.string.checkout_sheet_style))

        Column(
            modifier = Modifier
                .selectableGroup()
                .padding(vertical = verticalPadding),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            val optionModifier = Modifier
                .background(color = MaterialTheme.colorScheme.background)
                .fillMaxWidth()

            CheckoutSheetStyleOption(
                style = CheckoutSheetStylePreset.NewDefaults,
                description = stringResource(id = R.string.checkout_sheet_style_new_defaults_description),
                selected = selected,
                setSelected = setSelected,
                modifier = optionModifier,
            )

            CheckoutSheetStyleOption(
                style = CheckoutSheetStylePreset.LegacyDialog,
                description = stringResource(id = R.string.checkout_sheet_style_legacy_dialog_description),
                selected = selected,
                setSelected = setSelected,
                modifier = optionModifier,
            )
        }
    }
}

@Composable
fun CheckoutSheetStyleOption(
    style: CheckoutSheetStylePreset,
    setSelected: (CheckoutSheetStylePreset) -> Unit,
    description: String,
    selected: CheckoutSheetStylePreset,
    modifier: Modifier,
) {
    val isSelected = selected == style

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier.selectable(
            selected = isSelected,
            role = Role.RadioButton,
            onClick = { setSelected(style) }
        ),
    ) {
        RadioButton(
            selected = isSelected,
            onClick = null,
            modifier = Modifier.semantics { contentDescription = description }
        )
        BodyMedium(
            stringResource(id = style.title),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp)
        )
    }
}

private val CheckoutSheetStylePreset.title: Int
    get() = when (this) {
        CheckoutSheetStylePreset.NewDefaults -> R.string.checkout_sheet_style_new_defaults
        CheckoutSheetStylePreset.LegacyDialog -> R.string.checkout_sheet_style_legacy_dialog
    }

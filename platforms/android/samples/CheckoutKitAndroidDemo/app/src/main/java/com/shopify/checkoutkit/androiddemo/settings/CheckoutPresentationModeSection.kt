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
import com.shopify.checkoutkit.androiddemo.common.components.BodySmall
import com.shopify.checkoutkit.androiddemo.common.components.Header3
import com.shopify.checkoutkit.androiddemo.common.ui.theme.verticalPadding
import com.shopify.checkoutkit.androiddemo.settings.data.CheckoutPresentationMode
import com.shopify.checkoutkit.androiddemo.settings.data.CheckoutSheetPreset

@Composable
fun CheckoutPresentationModeSection(
    selected: CheckoutPresentationMode,
    checkoutSheetPreset: CheckoutSheetPreset,
    dragToDismissEnabled: Boolean,
    tapAwayToDismissEnabled: Boolean,
    setSelected: (CheckoutPresentationMode) -> Unit,
    setCheckoutSheetPreset: (CheckoutSheetPreset) -> Unit,
    setDragToDismissEnabled: (Boolean) -> Unit,
    setTapAwayToDismissEnabled: (Boolean) -> Unit,
) {
    Column {
        Header3(text = stringResource(id = R.string.checkout_presentation))

        Column(
            modifier = Modifier
                .selectableGroup()
                .padding(vertical = verticalPadding),
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            val optionModifier = Modifier
                .background(color = MaterialTheme.colorScheme.background)
                .fillMaxWidth()

            CheckoutPresentationModeOption(
                mode = CheckoutPresentationMode.CheckoutKitSheet,
                description = stringResource(id = R.string.checkout_presentation_checkout_kit_sheet_description),
                selected = selected,
                setSelected = setSelected,
                modifier = optionModifier,
            )

            if (selected == CheckoutPresentationMode.CheckoutKitSheet) {
                Column(
                    modifier = Modifier.padding(start = 48.dp, bottom = 8.dp),
                ) {
                    CheckoutSheetPresetSection(
                        selected = checkoutSheetPreset,
                        setSelected = setCheckoutSheetPreset,
                    )

                    SettingsSwitch(
                        label = stringResource(id = R.string.checkout_drag_to_dismiss),
                        checked = dragToDismissEnabled,
                        onCheckedChange = setDragToDismissEnabled,
                        modifier = optionModifier,
                    )

                    SettingsSwitch(
                        label = stringResource(id = R.string.checkout_tap_away_to_dismiss),
                        checked = tapAwayToDismissEnabled,
                        onCheckedChange = setTapAwayToDismissEnabled,
                        modifier = optionModifier,
                    )
                }
            }

            CheckoutPresentationModeOption(
                mode = CheckoutPresentationMode.AppOwnedComposeSheet,
                description = stringResource(id = R.string.checkout_presentation_app_owned_compose_sheet_description),
                selected = selected,
                setSelected = setSelected,
                modifier = optionModifier,
            )

            if (selected == CheckoutPresentationMode.AppOwnedComposeSheet) {
                BodySmall(
                    text = stringResource(id = R.string.checkout_presentation_app_owned_compose_sheet_note),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 48.dp, end = 4.dp, bottom = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun CheckoutPresentationModeOption(
    mode: CheckoutPresentationMode,
    setSelected: (CheckoutPresentationMode) -> Unit,
    description: String,
    selected: CheckoutPresentationMode,
    modifier: Modifier,
) {
    SettingsRadioOption(
        label = stringResource(id = mode.title),
        description = description,
        selected = selected == mode,
        onClick = { setSelected(mode) },
        modifier = modifier,
    )
}

private val CheckoutPresentationMode.title: Int
    get() = when (this) {
        CheckoutPresentationMode.CheckoutKitSheet -> R.string.checkout_presentation_checkout_kit_sheet
        CheckoutPresentationMode.AppOwnedComposeSheet -> R.string.checkout_presentation_app_owned_compose_sheet
    }

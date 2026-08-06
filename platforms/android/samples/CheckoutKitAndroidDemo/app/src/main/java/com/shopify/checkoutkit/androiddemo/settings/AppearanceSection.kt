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
import com.shopify.checkoutkit.CheckoutAppearance
import com.shopify.checkoutkit.ColorScheme
import com.shopify.checkoutkit.androiddemo.R
import com.shopify.checkoutkit.androiddemo.common.components.Header3
import com.shopify.checkoutkit.androiddemo.common.sampleStorefrontAppearance
import com.shopify.checkoutkit.androiddemo.common.ui.theme.verticalPadding

@Composable
fun AppearanceSection(
    selected: CheckoutAppearance,
    setSelected: (CheckoutAppearance) -> Unit,
) {
    val appAppearance = selected as? CheckoutAppearance.App

    Column {
        Header3(text = stringResource(id = R.string.appearance))

        Column(
            modifier = Modifier.padding(vertical = verticalPadding),
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            val optionModifier = Modifier
                .background(color = MaterialTheme.colorScheme.background)
                .fillMaxWidth()

            Column(
                modifier = Modifier.selectableGroup(),
                verticalArrangement = Arrangement.spacedBy(5.dp),
            ) {
                SettingsRadioOption(
                    label = stringResource(id = R.string.appearance_storefront),
                    description = stringResource(id = R.string.appearance_storefront_description),
                    selected = selected is CheckoutAppearance.Storefront,
                    onClick = { setSelected(sampleStorefrontAppearance()) },
                    modifier = optionModifier,
                )

                SettingsRadioOption(
                    label = stringResource(id = R.string.appearance_app),
                    description = stringResource(id = R.string.appearance_app_description),
                    selected = appAppearance != null,
                    onClick = {
                        if (appAppearance == null) {
                            setSelected(CheckoutAppearance.App())
                        }
                    },
                    modifier = optionModifier,
                )
            }

            appAppearance?.let { appearance ->
                Column(
                    modifier = Modifier
                        .padding(start = 48.dp, bottom = 8.dp)
                        .selectableGroup(),
                    verticalArrangement = Arrangement.spacedBy(5.dp),
                ) {
                    AppColorSchemeOption(
                        colorScheme = ColorScheme.Dark(),
                        label = stringResource(id = R.string.appearance_app_dark),
                        description = stringResource(id = R.string.appearance_app_dark_description),
                        selected = appearance.colorScheme,
                        setSelected = setSelected,
                        modifier = optionModifier,
                    )

                    AppColorSchemeOption(
                        colorScheme = ColorScheme.Light(),
                        label = stringResource(id = R.string.appearance_app_light),
                        description = stringResource(id = R.string.appearance_app_light_description),
                        selected = appearance.colorScheme,
                        setSelected = setSelected,
                        modifier = optionModifier,
                    )

                    AppColorSchemeOption(
                        colorScheme = ColorScheme.Automatic(),
                        label = stringResource(id = R.string.appearance_app_automatic),
                        description = stringResource(id = R.string.appearance_app_automatic_description),
                        selected = appearance.colorScheme,
                        setSelected = setSelected,
                        modifier = optionModifier,
                    )
                }
            }
        }
    }
}

@Composable
private fun AppColorSchemeOption(
    colorScheme: ColorScheme,
    label: String,
    description: String,
    selected: ColorScheme,
    setSelected: (CheckoutAppearance) -> Unit,
    modifier: Modifier,
) {
    SettingsRadioOption(
        label = label,
        description = description,
        selected = selected.id == colorScheme.id,
        onClick = { setSelected(CheckoutAppearance.App(colorScheme)) },
        modifier = modifier,
    )
}

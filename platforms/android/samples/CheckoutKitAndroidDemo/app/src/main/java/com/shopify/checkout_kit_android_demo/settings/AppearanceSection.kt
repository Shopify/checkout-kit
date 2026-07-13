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
import com.shopify.checkoutkit.CheckoutAppearance
import com.shopify.checkoutkit.ColorScheme

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
                AppearanceOption(
                    label = stringResource(id = R.string.appearance_storefront),
                    description = stringResource(id = R.string.appearance_storefront_description),
                    selected = selected is CheckoutAppearance.Storefront,
                    onClick = { setSelected(CheckoutAppearance.Storefront()) },
                    modifier = optionModifier,
                )

                AppearanceOption(
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
    AppearanceOption(
        label = label,
        description = description,
        selected = selected.id == colorScheme.id,
        onClick = { setSelected(CheckoutAppearance.App(colorScheme)) },
        modifier = modifier,
    )
}

@Composable
private fun AppearanceOption(
    label: String,
    description: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier.selectable(
            selected = selected,
            role = Role.RadioButton,
            onClick = onClick,
        ),
    ) {
        RadioButton(
            selected = selected,
            onClick = null,
            modifier = Modifier.semantics { contentDescription = description },
        )
        BodyMedium(
            text = label,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp),
        )
    }
}

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
import com.shopify.checkout_kit_android_demo.common.sampleStorefrontAppearance
import com.shopify.checkout_kit_android_demo.common.ui.theme.verticalPadding
import com.shopify.checkoutkit.CheckoutAppearance
import com.shopify.checkoutkit.ColorScheme

@Composable
fun ColorSchemeSection(
    selected: CheckoutAppearance,
    setSelected: (CheckoutAppearance) -> Unit,
) {

    Column {
        Header3(text = stringResource(id = R.string.color_scheme))

        Column(
            modifier = Modifier
                .selectableGroup()
                .padding(vertical = verticalPadding),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {

            val optionModifier = Modifier
                .background(color = MaterialTheme.colorScheme.background)
                .fillMaxWidth()

            AppearanceOption(
                appearance = sampleStorefrontAppearance(),
                description = "Uses the storefront checkout branding with customized native colors",
                selected = selected,
                setSelected = setSelected,
                modifier = optionModifier,
            )

            AppearanceOption(
                appearance = CheckoutAppearance.App(ColorScheme.Automatic()),
                description = "Applies a color scheme in checkout based on device preferences",
                selected = selected,
                setSelected = setSelected,
                modifier = optionModifier,
            )

            AppearanceOption(
                appearance = CheckoutAppearance.App(ColorScheme.Light()),
                description = "Applies a light color scheme to checkout",
                selected = selected,
                setSelected = setSelected,
                modifier = optionModifier
            )

            AppearanceOption(
                appearance = CheckoutAppearance.App(ColorScheme.Dark()),
                selected = selected,
                description = "Applies a dark color scheme to checkout",
                setSelected = setSelected,
                modifier = optionModifier,
            )
        }
    }
}

@Composable
fun AppearanceOption(
    appearance: CheckoutAppearance,
    setSelected: (CheckoutAppearance) -> Unit,
    description: String,
    selected: CheckoutAppearance,
    modifier: Modifier,
) {
    val isSelected = selected.optionKey == appearance.optionKey

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier.selectable(
            selected = isSelected,
            role = Role.RadioButton,
            onClick = { setSelected(appearance) }
        ),
    ) {
        RadioButton(
            selected = isSelected,
            onClick = null,
            modifier = Modifier.semantics { contentDescription = description }
        )
        BodyMedium(
            stringResource(id = appearance.name),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp)
        )
    }
}

private val CheckoutAppearance.name: Int
    get() = when (this) {
        is CheckoutAppearance.Storefront -> R.string.color_scheme_storefront
        is CheckoutAppearance.App -> when (colorScheme) {
            is ColorScheme.Light -> R.string.color_scheme_app_light
            is ColorScheme.Dark -> R.string.color_scheme_app_dark
            is ColorScheme.Automatic -> R.string.color_scheme_app_automatic
        }
    }

private val CheckoutAppearance.optionKey: String
    get() = when (this) {
        is CheckoutAppearance.Storefront -> "storefront"
        is CheckoutAppearance.App -> "app:${colorScheme.id}"
    }

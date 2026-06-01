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
import com.shopify.checkoutkit.Color
import com.shopify.checkoutkit.ColorScheme
import com.shopify.checkoutkit.Colors

@Composable
fun ColorSchemeSection(
    selected: ColorScheme,
    setSelected: (ColorScheme) -> Unit,
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

            ColorSchemeOption(
                colorScheme = ColorScheme.Automatic(),
                description = "Applies a color scheme in checkout based on device preferences",
                selected = selected,
                setSelected = setSelected,
                modifier = optionModifier,
            )

            ColorSchemeOption(
                colorScheme = ColorScheme.Light(),
                description = "Applies a light color scheme to checkout",
                selected = selected,
                setSelected = setSelected,
                modifier = optionModifier
            )

            ColorSchemeOption(
                colorScheme = ColorScheme.Dark(),
                selected = selected,
                description = "Applies a dark color scheme to checkout",
                setSelected = setSelected,
                modifier = optionModifier,
            )

            ColorSchemeOption(
                colorScheme = ColorScheme.Web(
                    colors = Colors(
                        headerBackground = Color.ResourceId(R.color.header_bg),
                        webViewBackground = Color.ResourceId(R.color.web_view_bg),
                        headerFont = Color.ResourceId(R.color.header_font),
                        progressIndicator = Color.ResourceId(R.color.bright_progress_indicator),
                    )
                ),
                description = "Applies a color scheme in checkout based on the current checkout web configuration",
                selected = selected,
                setSelected = setSelected,
                modifier = optionModifier,
            )
        }
    }
}

@Composable
fun ColorSchemeOption(
    colorScheme: ColorScheme,
    setSelected: (ColorScheme) -> Unit,
    description: String,
    selected: ColorScheme,
    modifier: Modifier,
) {
    val isSelected = selected.id == colorScheme.id

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier.selectable(
            selected = isSelected,
            role = Role.RadioButton,
            onClick = { setSelected(colorScheme) }
        ),
    ) {
        RadioButton(
            selected = isSelected,
            onClick = null,
            modifier = Modifier.semantics { contentDescription = description }
        )
        BodyMedium(
            stringResource(id = colorScheme.name),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp)
        )
    }
}

private val ColorScheme.name: Int
    get() = when (this) {
        is ColorScheme.Light -> R.string.color_scheme_light
        is ColorScheme.Dark -> R.string.color_scheme_dark
        is ColorScheme.Web -> R.string.color_scheme_web
        is ColorScheme.Automatic -> R.string.color_scheme_automatic
    }

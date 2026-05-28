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
import com.shopify.checkout_kit_android_demo.settings.data.WindowOpenHandler

@Composable
fun WindowOpenHandlerSection(
    selected: WindowOpenHandler,
    setSelected: (WindowOpenHandler) -> Unit,
) {
    Column {
        Header3(text = stringResource(id = R.string.window_open_handler))

        Column(
            modifier = Modifier
                .selectableGroup()
                .padding(vertical = verticalPadding),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            val optionModifier = Modifier
                .background(color = MaterialTheme.colorScheme.background)
                .fillMaxWidth()

            WindowOpenHandlerOption(
                handler = WindowOpenHandler.Default,
                description = stringResource(id = R.string.window_open_handler_default_description),
                selected = selected,
                setSelected = setSelected,
                modifier = optionModifier,
            )

            WindowOpenHandlerOption(
                handler = WindowOpenHandler.ExternalApp,
                description = stringResource(id = R.string.window_open_handler_external_app_description),
                selected = selected,
                setSelected = setSelected,
                modifier = optionModifier,
            )
        }
    }
}

@Composable
fun WindowOpenHandlerOption(
    handler: WindowOpenHandler,
    setSelected: (WindowOpenHandler) -> Unit,
    description: String,
    selected: WindowOpenHandler,
    modifier: Modifier,
) {
    val isSelected = selected == handler

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier.selectable(
            selected = isSelected,
            role = Role.RadioButton,
            onClick = { setSelected(handler) }
        ),
    ) {
        RadioButton(
            selected = isSelected,
            onClick = null,
            modifier = Modifier.semantics { contentDescription = description }
        )
        BodyMedium(
            stringResource(id = handler.title),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp)
        )
    }
}

private val WindowOpenHandler.title: Int
    get() = when (this) {
        WindowOpenHandler.Default -> R.string.window_open_handler_default
        WindowOpenHandler.ExternalApp -> R.string.window_open_handler_external_app
    }

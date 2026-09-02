package com.shopify.checkoutkit.androiddemo.products.product

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.OutlinedButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import com.shopify.checkoutkit.androiddemo.R
import com.shopify.checkoutkit.androiddemo.common.components.Header3

@Composable
fun AddToCartButton(
    enabled: Boolean,
    loading: Boolean,
    modifier: Modifier,
    onClick: () -> Unit
) {
    val buttonEnabled = enabled && !loading

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        OutlinedButton(
            modifier = Modifier.fillMaxWidth(),
            enabled = buttonEnabled,
            onClick = onClick,
            shape = RectangleShape,
        ) {
            Box {
                Header3(
                    textAlign = TextAlign.Center,
                    text = stringResource(id = R.string.product_add_to_cart),
                    color = LocalContentColor.current,
                )
            }
        }
    }
}

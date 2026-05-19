package com.shopify.checkout_kit_android_demo.products.product

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.shopify.checkout_kit_android_demo.R
import com.shopify.checkout_kit_android_demo.common.components.Header3

@Composable
fun AddToCartButton(
    enabled: Boolean,
    loading: Boolean,
    modifier: Modifier,
    onClick: () -> Unit
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        TextButton(
            modifier = Modifier
                .fillMaxWidth()
                .testTag("add-to-cart-button"),
            enabled = !loading,
            onClick = onClick,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.onBackground),
            shape = RectangleShape
        ) {
            Box {
                Header3(
                    textAlign = TextAlign.Center,
                    text = stringResource(id = R.string.product_add_to_cart),
                )
            }
        }
    }
}

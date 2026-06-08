package com.shopify.checkout_kit_android_demo.cart


import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.res.vectorResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shopify.checkout_kit_android_demo.R
import com.shopify.checkout_kit_android_demo.cart.data.CartLine
import com.shopify.checkout_kit_android_demo.common.ID
import com.shopify.checkout_kit_android_demo.common.components.BodySmall
import com.shopify.checkout_kit_android_demo.common.components.MoneyText
import com.shopify.checkout_kit_android_demo.common.components.QuantitySelector
import com.shopify.checkout_kit_android_demo.common.components.RemoteImage
import com.shopify.checkout_kit_android_demo.common.ui.theme.largeScreenBreakpoint

@Composable
fun CartItem(
    cartLine: CartLine,
    loading: Boolean,
    modifyLineItem: (ID, Int?) -> Unit,
) {
    BoxWithConstraints {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(if (maxWidth < largeScreenBreakpoint) 142.dp else 300.dp)
                .padding(vertical = 10.dp)
        ) {
            RemoteImage(
                url = cartLine.image?.url,
                altText = cartLine.image?.altText,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(.95f)
            )

            Column(
                verticalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier
                    .fillMaxHeight()
                    .padding(horizontal = 20.dp)
                    .weight(2f)
            ) {
                Column {
                    Text(
                        text = cartLine.title,
                        style = MaterialTheme.typography.bodyMedium,
                        fontSize = 18.sp,
                        color = MaterialTheme.colorScheme.secondary,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    MoneyText(
                        price = cartLine.pricePerQuantity,
                        currency = cartLine.currencyPerQuantity,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.secondary,
                    )
                    BodySmall(cartLine.variantDescription)
                }
                QuantitySelector(enabled = !loading, quantity = cartLine.quantity) { quantity ->
                    modifyLineItem(cartLine.id, quantity)
                }
            }

            Column(
                Modifier
                    .weight(1f)
                    .fillMaxHeight(),
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                MoneyText(
                    currency = cartLine.totalCurrency,
                    price = cartLine.totalPrice,
                    includeSuffix = false,
                )
                IconButton(
                    onClick = { modifyLineItem(cartLine.id, null) },
                ) {
                    Icon(
                        imageVector = ImageVector.vectorResource(R.drawable.trash_can),
                        contentDescription = stringResource(id = R.string.cart_trash_content_description),
                    )
                }
            }
        }
    }
}

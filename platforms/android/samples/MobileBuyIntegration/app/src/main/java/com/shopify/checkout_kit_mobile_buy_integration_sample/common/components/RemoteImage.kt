package com.shopify.checkout_kit_mobile_buy_integration_sample.common.components

import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import coil.compose.AsyncImage
import coil.request.ImageRequest
import coil.size.Scale
import com.shopify.checkout_kit_mobile_buy_integration_sample.R

@Composable
fun RemoteImage(
    url: String?,
    altText: String?,
    modifier: Modifier
) {
    if (url != null) {
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(url)
                .scale(Scale.FILL)
                .crossfade(true)
                .build(),
            contentScale = ContentScale.Crop,
            alignment = Alignment.Center,
            contentDescription = altText,
            modifier = modifier,
        )
    } else {
        Image(
            painter = painterResource(id = R.drawable.placeholder),
            contentDescription = altText,
            modifier = modifier,
        )
    }
}

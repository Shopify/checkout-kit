package com.shopify.checkout_kit_android_demo.products.collection

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.shopify.checkout_kit_android_demo.R
import com.shopify.checkout_kit_android_demo.common.components.Header2
import com.shopify.checkout_kit_android_demo.common.components.Header3
import com.shopify.checkout_kit_android_demo.common.components.RemoteImage
import com.shopify.checkout_kit_android_demo.common.ui.theme.horizontalPadding
import com.shopify.checkout_kit_android_demo.common.ui.theme.verticalPadding
import com.shopify.checkout_kit_android_demo.products.collection.data.ProductCollection
import com.shopify.checkout_kit_android_demo.products.collection.data.ProductCollectionImage

@Composable
fun ProductCollections(
    productCollections: List<ProductCollection>,
    onClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        Modifier
            .fillMaxHeight()
            .padding(horizontal = horizontalPadding)
    ) {
        Header2(
            resourceId = R.string.collections_title,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(vertical = verticalPadding),
        )

        if (productCollections.isEmpty()) {
            Text(stringResource(id = R.string.collections_no_collections_configured))
        } else {
            productCollections.forEach { collection ->
                ProductCollection(
                    handle = collection.handle,
                    title = collection.title,
                    image = collection.image,
                    modifier = modifier,
                    onClick = onClick
                )
            }
        }
    }
}

@Composable
fun ProductCollection(
    handle: String,
    title: String,
    image: ProductCollectionImage?,
    onClick: (String) -> Unit,
    modifier: Modifier,
) {
    Column(
        modifier = Modifier
            .padding(bottom = verticalPadding)
            .clickable {
                onClick(handle)
            }
    ) {
        RemoteImage(
            url = image?.url,
            altText = image?.altText ?: stringResource(R.string.collection_img_alt_default),
            modifier = modifier
                .defaultMinSize(minWidth = 345.dp, minHeight = 345.dp)
                .fillMaxWidth(),
        )

        Row(verticalAlignment = Alignment.CenterVertically) {
            Header3(
                text = title,
                modifier = Modifier.padding(top = 10.dp)
            )
            Icon(
                painter = painterResource(id = R.drawable.arrow_forward),
                contentDescription = stringResource(id = R.string.collection_cta_content_description),
                modifier = Modifier.padding(start = 5.dp, top = 10.dp)
            )
        }
    }
}

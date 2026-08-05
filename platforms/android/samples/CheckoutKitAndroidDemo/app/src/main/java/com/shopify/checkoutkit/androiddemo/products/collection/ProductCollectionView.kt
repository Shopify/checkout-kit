package com.shopify.checkoutkit.androiddemo.products.collection

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.shopify.checkoutkit.androiddemo.R
import com.shopify.checkoutkit.androiddemo.common.components.BodyMedium
import com.shopify.checkoutkit.androiddemo.common.components.Header2
import com.shopify.checkoutkit.androiddemo.common.components.ProgressIndicator
import com.shopify.checkoutkit.androiddemo.common.components.RemoteImage
import com.shopify.checkoutkit.androiddemo.common.ui.theme.horizontalPadding
import com.shopify.checkoutkit.androiddemo.common.ui.theme.verticalPadding
import org.koin.androidx.compose.koinViewModel

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ProductCollectionView(
    navController: NavController,
    productCollectionHandle: String,
    productCollectionViewModel: ProductCollectionViewModel = koinViewModel(),
) {
    LaunchedEffect(key1 = true) {
        productCollectionViewModel.fetchCollection(productCollectionHandle)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        when (val productCollectionUIState = productCollectionViewModel.uiState.collectAsState().value) {
            is ProductCollectionUIState.Loading -> {
                ProgressIndicator()
            }

            is ProductCollectionUIState.Error -> {
                Text(productCollectionUIState.error)
            }

            is ProductCollectionUIState.Loaded -> {
                Column(
                    Modifier
                        .padding(horizontal = horizontalPadding, vertical = verticalPadding)
                        .fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(verticalPadding)
                ) {
                    val productCollection = productCollectionUIState.productCollection

                    Header2(text = productCollection.title)

                    BodyMedium(text = productCollection.description)

                    RemoteImage(
                        url = productCollection.image?.url,
                        altText = productCollection.image?.altText ?: stringResource(id = R.string.collection_img_alt_default),
                        modifier = Modifier.fillMaxWidth()
                    )

                    FlowRow(
                        maxItemsInEachRow = 2,
                        maxLines = 4,
                        modifier = Modifier,
                        verticalArrangement = Arrangement.spacedBy(30.dp),
                        horizontalArrangement = Arrangement.spacedBy(5.dp)
                    ) {
                        productCollection.products.forEach { collectionProduct ->
                            ProductCollectionProduct(
                                product = collectionProduct,
                                textColor = MaterialTheme.colorScheme.onBackground,
                                onProductClick = { productId ->
                                    productCollectionViewModel.productSelected(
                                        navController,
                                        productId
                                    )
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

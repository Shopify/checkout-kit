package com.shopify.checkoutkit.androiddemo.products

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.compose.itemContentType
import androidx.paging.compose.itemKey
import com.shopify.checkoutkit.androiddemo.R
import com.shopify.checkoutkit.androiddemo.common.ID
import com.shopify.checkoutkit.androiddemo.common.components.Header2
import com.shopify.checkoutkit.androiddemo.common.components.MoneyRangeText
import com.shopify.checkoutkit.androiddemo.common.components.ProgressIndicator
import com.shopify.checkoutkit.androiddemo.common.components.RemoteImage
import com.shopify.checkoutkit.androiddemo.common.ui.theme.defaultProductImageHeight
import com.shopify.checkoutkit.androiddemo.common.ui.theme.defaultProductImageHeightLg
import com.shopify.checkoutkit.androiddemo.common.ui.theme.horizontalPadding
import com.shopify.checkoutkit.androiddemo.common.ui.theme.largeScreenBreakpoint
import com.shopify.checkoutkit.androiddemo.common.ui.theme.verticalPadding
import com.shopify.checkoutkit.androiddemo.products.product.data.Product
import org.koin.androidx.compose.koinViewModel

@Composable
fun ProductsView(
    navController: NavController,
    productsViewModel: ProductsViewModel = koinViewModel(),
) {
    val pager = remember {
        Pager(PagingConfig(pageSize = 10)) {
            productsViewModel.pagingSource
        }
    }
    val lazyPagingItems = pager.flow.collectAsLazyPagingItems()

    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (!lazyPagingItems.loadState.isIdle) {
            ProgressIndicator()
        }

        Column(
            Modifier
                .padding(horizontal = horizontalPadding)
                .fillMaxSize()
        ) {
            BoxWithConstraints {
                val largeScreen = maxWidth >= largeScreenBreakpoint

                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(30.dp),
                    horizontalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    if (lazyPagingItems.loadState.isIdle) {
                        item(span = { GridItemSpan(maxCurrentLineSpan) }) {
                            Header2(
                                modifier = Modifier.padding(top = verticalPadding),
                                text = stringResource(id = R.string.products_header)
                            )
                        }
                    }

                    items(
                        count = lazyPagingItems.itemCount,
                        key = lazyPagingItems.itemKey { item ->
                            item.id.id
                        },
                        contentType = lazyPagingItems.itemContentType { "Products" }
                    ) { index ->
                        val product = lazyPagingItems[index]
                        if (product != null) {
                            Product(
                                product = product,
                                imageHeight = if (largeScreen) defaultProductImageHeightLg else defaultProductImageHeight,
                                onProductClick = { productId ->
                                    productsViewModel.productClicked(navController, productId)
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun Product(
    product: Product,
    imageHeight: Dp,
    onProductClick: (id: ID) -> Unit,
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier
            .wrapContentWidth()
            .clickable {
                onProductClick(product.id)
            }
    ) {
        RemoteImage(
            url = product.image?.url,
            altText = product.image?.altText ?: stringResource(id = R.string.product_alt_text_default),
            modifier = Modifier
                .height(imageHeight)
                .fillMaxWidth()
                .align(Alignment.CenterHorizontally),
        )

        Text(product.title, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onBackground)

        MoneyRangeText(
            fromPrice = product.priceRange.minVariantPrice.amount,
            fromCurrencyCode = product.priceRange.minVariantPrice.currencyCode,
            toPrice = product.priceRange.maxVariantPrice.amount,
            toCurrencyCode = product.priceRange.maxVariantPrice.currencyCode,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )
    }
}

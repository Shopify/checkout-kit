package com.shopify.checkoutkit.androiddemo.products.product

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentHeight
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
import com.shopify.checkoutkit.androiddemo.R
import com.shopify.checkoutkit.androiddemo.common.components.BodyMedium
import com.shopify.checkoutkit.androiddemo.common.components.Header2
import com.shopify.checkoutkit.androiddemo.common.components.MoneyText
import com.shopify.checkoutkit.androiddemo.common.components.ProgressIndicator
import com.shopify.checkoutkit.androiddemo.common.components.QuantitySelector
import com.shopify.checkoutkit.androiddemo.common.components.RemoteImage
import com.shopify.checkoutkit.androiddemo.common.ui.theme.horizontalPadding
import com.shopify.checkoutkit.androiddemo.common.ui.theme.largeScreenBreakpoint
import com.shopify.checkoutkit.androiddemo.common.ui.theme.verticalPadding
import org.koin.androidx.compose.koinViewModel
import timber.log.Timber

@Suppress("MagicNumber") // Layout proportions and dimensions are visual design values.
@Composable
fun ProductView(
    productId: String,
    productViewModel: ProductViewModel = koinViewModel(),
) {
    LaunchedEffect(key1 = true) {
        productViewModel.fetchProduct(productId)
    }

    when (val productUIState = productViewModel.uiState.collectAsState().value) {
        is ProductUIState.Loading -> {
            Timber.i("Product loading showing progress indicator")
            ProgressIndicator()
        }

        is ProductUIState.Error -> {
            Timber.i("Product loading failed showing error")
            Text(productUIState.error)
        }

        is ProductUIState.Loaded -> {
            if (productUIState.isAddingToCart) {
                Timber.i("Showing progress indicator")
                ProgressIndicator()
            }

            val product = productUIState.product
            Column(
                Modifier
                    .fillMaxSize()
                    .padding(top = 4.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Column(modifier = Modifier.padding(vertical = verticalPadding)) {
                    BoxWithConstraints(
                        Modifier.align(Alignment.CenterHorizontally)
                    ) {
                        val modifier = Modifier
                            .wrapContentHeight()
                            .padding(horizontal = 10.dp)

                        RemoteImage(
                            url = product.image?.url,
                            altText = product.image?.altText ?: stringResource(id = R.string.product_alt_text_default),
                            modifier = if (maxWidth < largeScreenBreakpoint) {
                                modifier.fillMaxWidth()
                            } else {
                                modifier.fillMaxWidth(.7f)
                            }
                        )
                    }

                    Column(
                        Modifier
                            .fillMaxSize()
                            .padding(horizontal = horizontalPadding, vertical = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(15.dp)
                    ) {
                        Header2(
                            text = product.title
                        )

                        Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            val variant = productUIState.selectedVariant
                            MoneyText(variant.price.currencyCode, variant.price.amount)
                        }

                        OptionSelector(
                            availableOptions = productUIState.availableOptions,
                            selectedOptions = productUIState.selectedVariant.selectedOptions.associate { it.name to it.value }
                        ) { name, value ->
                            productViewModel.updateSelectedOption(name, value)
                        }

                        QuantitySelector(enabled = true, quantity = productUIState.addQuantityAmount) { quantity ->
                            productViewModel.setAddQuantityAmount(quantity)
                        }

                        AddToCartButton(
                            enabled = productUIState.selectedVariant.availableForSale,
                            loading = productUIState.isAddingToCart,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            productViewModel.addToCart()
                        }

                        BodyMedium(
                            text = product.description,
                            color = MaterialTheme.colorScheme.onBackground,
                        )
                    }
                }
            }
        }
    }
}

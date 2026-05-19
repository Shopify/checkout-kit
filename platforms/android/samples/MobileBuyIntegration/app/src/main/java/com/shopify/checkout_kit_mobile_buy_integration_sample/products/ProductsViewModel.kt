package com.shopify.checkout_kit_mobile_buy_integration_sample.products

import androidx.lifecycle.ViewModel
import androidx.navigation.NavController
import com.shopify.checkout_kit_mobile_buy_integration_sample.common.ID
import com.shopify.checkout_kit_mobile_buy_integration_sample.common.navigation.Screen
import com.shopify.checkout_kit_mobile_buy_integration_sample.products.product.data.ProductPagingSource
import com.shopify.checkout_kit_mobile_buy_integration_sample.products.product.data.ProductRepository
import timber.log.Timber

class ProductsViewModel(
    productRepository: ProductRepository,
) : ViewModel() {

    val pagingSource = ProductPagingSource(productRepository)

    fun productClicked(navController: NavController, productId: ID) {
        Timber.i("Navigation to product description page for $productId")
        navController.navigate(Screen.Product.route(productId.id))
    }
}

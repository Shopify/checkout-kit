package com.shopify.checkoutkit.androiddemo.products

import androidx.lifecycle.ViewModel
import androidx.navigation.NavController
import com.shopify.checkoutkit.androiddemo.common.ID
import com.shopify.checkoutkit.androiddemo.common.navigation.Screen
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductPagingSource
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductRepository
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

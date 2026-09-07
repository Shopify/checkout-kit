package com.shopify.checkoutkit.androiddemo.products

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.cachedIn
import com.shopify.checkoutkit.androiddemo.common.ID
import com.shopify.checkoutkit.androiddemo.common.navigation.Screen
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductPagingSource
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductRepository
import timber.log.Timber
import java.util.concurrent.atomic.AtomicBoolean

class ProductsViewModel(
    productRepository: ProductRepository,
) : ViewModel() {

    private val refreshFromNetwork = AtomicBoolean(false)

    val products = Pager(
        PagingConfig(
            pageSize = PRODUCTS_PER_PAGE,
            initialLoadSize = PRODUCTS_PER_PAGE,
        )
    ) {
        ProductPagingSource(
            repository = productRepository,
            refreshFromNetwork = refreshFromNetwork.getAndSet(false),
        )
    }.flow.cachedIn(viewModelScope)

    fun refreshFromNetwork() {
        refreshFromNetwork.set(true)
    }

    fun productClicked(navController: NavController, productId: ID) {
        Timber.i("Navigation to product description page for $productId")
        navController.navigate(Screen.Product.route(productId.id))
    }

    private companion object {
        const val PRODUCTS_PER_PAGE = 50
    }
}

package com.shopify.checkout_kit_mobile_buy_integration_sample.products.product.data

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.shopify.checkout_kit_mobile_buy_integration_sample.R
import com.shopify.checkout_kit_mobile_buy_integration_sample.common.SnackbarController
import com.shopify.checkout_kit_mobile_buy_integration_sample.common.SnackbarEvent
import timber.log.Timber

class ProductPagingSource(
    private val repository: ProductRepository,
) : PagingSource<String, Product>() {
    override suspend fun load(
        params: LoadParams<String>
    ): LoadResult<String, Product> {
        try {
            val cursor = params.key
            Timber.i("Fetching page of ${params.loadSize} products with cursor $cursor")
            val products = repository.getProducts(params.loadSize, 10, cursor)
            return LoadResult.Page(
                data = products.products,
                prevKey = null,
                nextKey = products.pageInfo.endCursor
            )
        } catch (e: Exception) {
            Timber.e("Error when paging through data $e")
            SnackbarController.sendEvent(SnackbarEvent(R.string.products_failed_to_load))
            return LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<String, Product>): String? {
        return state.anchorPosition?.let { position ->
            state.closestPageToPosition(position)?.prevKey
        }
    }
}

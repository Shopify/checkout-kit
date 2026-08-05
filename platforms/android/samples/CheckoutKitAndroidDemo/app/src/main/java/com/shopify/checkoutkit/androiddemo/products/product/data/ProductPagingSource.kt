package com.shopify.checkoutkit.androiddemo.products.product.data

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.shopify.checkoutkit.androiddemo.R
import com.shopify.checkoutkit.androiddemo.common.SnackbarController
import com.shopify.checkoutkit.androiddemo.common.SnackbarEvent
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
            val products = repository.getProducts(params.loadSize, VARIANTS_PER_PRODUCT, cursor)
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

    private companion object {
        const val VARIANTS_PER_PRODUCT = 10
    }
}

package com.shopify.checkout_kit_mobile_buy_integration_sample.products.product.data

import com.shopify.checkout_kit_mobile_buy_integration_sample.common.client.StorefrontApiClient
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.last
import kotlinx.coroutines.flow.map

class ProductRepository(
    private val client: StorefrontApiClient,
) {

    suspend fun getProduct(productId: String): Product {
        return observeProduct(productId).last()
    }

    fun observeProduct(productId: String): Flow<Product> {
        return client.fetchProduct(productId = productId, numVariants = 20)
            .map { data ->
                val product = data.product
                    ?: throw RuntimeException("Failed to fetch product")
                val variants = product.variants.nodes.map { it.productVariantFragment.toLocal() }
                product.productFragment.toLocal(variants)
            }
    }

    suspend fun getProducts(numProducts: Int, numVariants: Int, cursor: String?): Products {
        return observeProducts(numProducts, numVariants, cursor).last()
    }

    fun observeProducts(numProducts: Int, numVariants: Int, cursor: String?): Flow<Products> {
        return client.fetchProducts(numProducts = numProducts, numVariants = numVariants, cursor = cursor)
            .map { data ->
                Products(
                    products = data.products.edges.map { edge ->
                        val variants = edge.node.variants.nodes.map { it.productVariantFragment.toLocal() }
                        edge.node.productFragment.toLocal(variants)
                    },
                    pageInfo = PageInfo(
                        startCursor = data.products.pageInfo.startCursor,
                        endCursor = data.products.pageInfo.endCursor,
                    ),
                )
            }
    }
}

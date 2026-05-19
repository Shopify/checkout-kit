package com.shopify.checkout_kit_mobile_buy_integration_sample.products.product.data

import com.shopify.checkout_kit_mobile_buy_integration_sample.common.client.StorefrontApiClient

class ProductRepository(
    private val client: StorefrontApiClient,
) {

    suspend fun getProduct(productId: String): Product {
        val data = client.fetchProduct(productId = productId, numVariants = 20)
        val product = data.product
            ?: throw RuntimeException("Failed to fetch product")
        val variants = product.variants.nodes.map { it.productVariantFragment.toLocal() }
        return product.productFragment.toLocal(variants)
    }

    suspend fun getProducts(numProducts: Int, numVariants: Int, cursor: String?): Products {
        val data = client.fetchProducts(numProducts = numProducts, numVariants = numVariants, cursor = cursor)
        return Products(
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

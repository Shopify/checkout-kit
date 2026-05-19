package com.shopify.checkout_kit_mobile_buy_integration_sample.products.collection.data

import com.shopify.checkout_kit_mobile_buy_integration_sample.common.client.StorefrontApiClient

class ProductCollectionRepository(
    private val client: StorefrontApiClient,
) {
    suspend fun getProductCollections(numberOfCollections: Int, numberOfProductsPerCollection: Int): List<ProductCollection> {
        val data = client.fetchCollections(
            numCollections = numberOfCollections,
            numProducts = numberOfProductsPerCollection,
        )
        return data.collections.nodes.map { collection -> collection.toLocal() }
    }

    suspend fun getProductCollection(collectionHandle: String, numberOfProducts: Int): ProductCollection {
        val data = client.fetchCollection(handle = collectionHandle, numProducts = numberOfProducts)
        val collection = data.collection
            ?: throw RuntimeException("Failed to fetch collection")
        return collection.toLocal()
    }
}

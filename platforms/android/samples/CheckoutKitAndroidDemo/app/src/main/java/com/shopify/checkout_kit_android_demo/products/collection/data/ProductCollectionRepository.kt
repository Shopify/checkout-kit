package com.shopify.checkout_kit_android_demo.products.collection.data

import com.shopify.checkout_kit_android_demo.common.client.StorefrontApiClient
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.last
import kotlinx.coroutines.flow.map

class ProductCollectionRepository(
    private val client: StorefrontApiClient,
) {
    suspend fun getProductCollections(numberOfCollections: Int, numberOfProductsPerCollection: Int): List<ProductCollection> {
        return observeProductCollections(numberOfCollections, numberOfProductsPerCollection).last()
    }

    fun observeProductCollections(
        numberOfCollections: Int,
        numberOfProductsPerCollection: Int,
    ): Flow<List<ProductCollection>> {
        return client.fetchCollections(
            numCollections = numberOfCollections,
            numProducts = numberOfProductsPerCollection,
        ).map { data ->
            data.collections.nodes.map { collection -> collection.toLocal() }
        }
    }

    suspend fun getProductCollection(collectionHandle: String, numberOfProducts: Int): ProductCollection {
        return observeProductCollection(collectionHandle, numberOfProducts).last()
    }

    fun observeProductCollection(collectionHandle: String, numberOfProducts: Int): Flow<ProductCollection> {
        return client.fetchCollection(handle = collectionHandle, numProducts = numberOfProducts)
            .map { data ->
                val collection = data.collection
                    ?: throw RuntimeException("Failed to fetch collection")
                collection.toLocal()
            }
    }
}

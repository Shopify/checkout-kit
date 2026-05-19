package com.shopify.checkout_kit_mobile_buy_integration_sample.common.client

import com.apollographql.apollo.ApolloClient
import com.apollographql.apollo.api.Optional
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.CartCreateMutation
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.CartLinesAddMutation
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.CartLinesRemoveMutation
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.CartLinesUpdateMutation
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.FetchCollectionQuery
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.FetchCollectionsQuery
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.FetchProductQuery
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.FetchProductsQuery
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.type.CartInput
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.type.CartLineInput
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.type.CartLineUpdateInput

class StorefrontApiClient(
    private val apollo: ApolloClient,
) {
    suspend fun fetchProducts(numProducts: Int, numVariants: Int, cursor: String? = null): FetchProductsQuery.Data {
        val response = apollo.query(
            FetchProductsQuery(
                numProducts = numProducts,
                numVariants = numVariants,
                cursor = Optional.presentIfNotNull(cursor),
            )
        ).execute()
        return response.dataOrThrow()
    }

    suspend fun fetchProduct(productId: String, numVariants: Int): FetchProductQuery.Data {
        val response = apollo.query(
            FetchProductQuery(productId = productId, numVariants = numVariants)
        ).execute()
        return response.dataOrThrow()
    }

    suspend fun fetchCollections(numCollections: Int, numProducts: Int): FetchCollectionsQuery.Data {
        val response = apollo.query(
            FetchCollectionsQuery(numCollections = numCollections, numProducts = numProducts)
        ).execute()
        return response.dataOrThrow()
    }

    suspend fun fetchCollection(handle: String, numProducts: Int): FetchCollectionQuery.Data {
        val response = apollo.query(
            FetchCollectionQuery(handle = handle, numProducts = numProducts)
        ).execute()
        return response.dataOrThrow()
    }

    suspend fun createCart(input: CartInput): CartCreateMutation.Data {
        val response = apollo.mutation(CartCreateMutation(input = input)).execute()
        return response.dataOrThrow()
    }

    suspend fun cartLinesAdd(cartId: String, lines: List<CartLineInput>): CartLinesAddMutation.Data {
        val response = apollo.mutation(CartLinesAddMutation(cartId = cartId, lines = lines)).execute()
        return response.dataOrThrow()
    }

    suspend fun cartLinesUpdate(cartId: String, lines: List<CartLineUpdateInput>): CartLinesUpdateMutation.Data {
        val response = apollo.mutation(CartLinesUpdateMutation(cartId = cartId, lines = lines)).execute()
        return response.dataOrThrow()
    }

    suspend fun cartLinesRemove(cartId: String, lineIds: List<String>): CartLinesRemoveMutation.Data {
        val response = apollo.mutation(CartLinesRemoveMutation(cartId = cartId, lineIds = lineIds)).execute()
        return response.dataOrThrow()
    }
}

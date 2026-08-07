package com.shopify.checkoutkit.androiddemo.common.client

import com.apollographql.apollo.ApolloClient
import com.apollographql.apollo.api.ApolloResponse
import com.apollographql.apollo.api.Operation
import com.apollographql.apollo.api.Optional
import com.apollographql.cache.normalized.FetchPolicy
import com.apollographql.cache.normalized.fetchPolicy
import com.shopify.checkoutkit.androiddemo.graphql.CartCreateMutation
import com.shopify.checkoutkit.androiddemo.graphql.CartLinesAddMutation
import com.shopify.checkoutkit.androiddemo.graphql.CartLinesRemoveMutation
import com.shopify.checkoutkit.androiddemo.graphql.CartLinesUpdateMutation
import com.shopify.checkoutkit.androiddemo.graphql.FetchCollectionQuery
import com.shopify.checkoutkit.androiddemo.graphql.FetchCollectionsQuery
import com.shopify.checkoutkit.androiddemo.graphql.FetchProductQuery
import com.shopify.checkoutkit.androiddemo.graphql.FetchProductsQuery
import com.shopify.checkoutkit.androiddemo.graphql.type.CartInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CartLineInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CartLineUpdateInput
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.transform

class StorefrontApiClient(
    private val apollo: ApolloClient,
) {
    fun fetchProducts(numProducts: Int, numVariants: Int, cursor: String? = null): Flow<FetchProductsQuery.Data> {
        return apollo.query(
            FetchProductsQuery(
                numProducts = numProducts,
                numVariants = numVariants,
                cursor = Optional.presentIfNotNull(cursor),
            )
        )
            .fetchPolicy(FetchPolicy.CacheAndNetwork)
            .toFlow()
            .emitDataOrFinalError()
    }

    fun fetchProduct(productId: String, numVariants: Int): Flow<FetchProductQuery.Data> {
        return apollo.query(
            FetchProductQuery(productId = productId, numVariants = numVariants)
        )
            .fetchPolicy(FetchPolicy.CacheAndNetwork)
            .toFlow()
            .emitDataOrFinalError()
    }

    fun fetchCollections(numCollections: Int, numProducts: Int): Flow<FetchCollectionsQuery.Data> {
        return apollo.query(
            FetchCollectionsQuery(numCollections = numCollections, numProducts = numProducts)
        )
            .fetchPolicy(FetchPolicy.CacheAndNetwork)
            .toFlow()
            .emitDataOrFinalError()
    }

    fun fetchCollection(handle: String, numProducts: Int): Flow<FetchCollectionQuery.Data> {
        return apollo.query(
            FetchCollectionQuery(handle = handle, numProducts = numProducts)
        )
            .fetchPolicy(FetchPolicy.CacheAndNetwork)
            .toFlow()
            .emitDataOrFinalError()
    }

    suspend fun createCart(input: CartInput): CartCreateMutation.Data {
        val response = apollo.mutation(CartCreateMutation(input = input)).execute()
        return response.dataOrThrowWithErrors()
    }

    suspend fun cartLinesAdd(cartId: String, lines: List<CartLineInput>): CartLinesAddMutation.Data {
        val response = apollo.mutation(CartLinesAddMutation(cartId = cartId, lines = lines)).execute()
        return response.dataOrThrowWithErrors()
    }

    suspend fun cartLinesUpdate(cartId: String, lines: List<CartLineUpdateInput>): CartLinesUpdateMutation.Data {
        val response = apollo.mutation(CartLinesUpdateMutation(cartId = cartId, lines = lines)).execute()
        return response.dataOrThrowWithErrors()
    }

    suspend fun cartLinesRemove(cartId: String, lineIds: List<String>): CartLinesRemoveMutation.Data {
        val response = apollo.mutation(CartLinesRemoveMutation(cartId = cartId, lineIds = lineIds)).execute()
        return response.dataOrThrowWithErrors()
    }

    private fun <D : Operation.Data> ApolloResponse<D>.dataOrThrowWithErrors(): D {
        if (data == null) {
            val storefrontErrors = errors
                ?.joinToString(separator = "; ") { error -> error.message }
                ?.takeIf { errorMessages -> errorMessages.isNotBlank() }

            if (storefrontErrors != null) {
                throw StorefrontApiException("Storefront API error: $storefrontErrors")
            }
        }

        return dataOrThrow()
    }

    /**
     * CacheAndNetwork queries can emit an initial cache response before the network response arrives.
     * When the cache is empty, that first response has no data and is not final, so throwing immediately
     * would prevent the network result from being observed. Emit any available cached or network data,
     * and only surface Apollo/Storefront errors once Apollo marks the response as final.
     */
    private fun <D : Operation.Data> Flow<ApolloResponse<D>>.emitDataOrFinalError(): Flow<D> {
        return transform { response ->
            val data = response.data
            if (data != null) {
                emit(data)
            } else if (response.isLast) {
                response.dataOrThrowWithErrors()
            }
        }
    }
}

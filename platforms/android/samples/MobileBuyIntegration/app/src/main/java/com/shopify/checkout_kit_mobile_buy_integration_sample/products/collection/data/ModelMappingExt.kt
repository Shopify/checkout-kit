package com.shopify.checkout_kit_mobile_buy_integration_sample.products.collection.data

import com.shopify.checkout_kit_mobile_buy_integration_sample.common.ID
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.FetchCollectionQuery
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.FetchCollectionsQuery
import com.shopify.checkout_kit_mobile_buy_integration_sample.products.product.data.toLocal

internal fun FetchCollectionsQuery.Node.toLocal(): ProductCollection {
    return ProductCollection(
        id = ID(id),
        handle = handle,
        title = title,
        description = description,
        image = image?.let { img ->
            ProductCollectionImage(img.url.toString(), img.altText)
        },
        products = products.edges.map { it.node.productFragment.toLocal() },
    )
}

internal fun FetchCollectionQuery.Collection.toLocal(): ProductCollection {
    return ProductCollection(
        id = ID(id),
        handle = handle,
        title = title,
        description = description,
        image = image?.let { img ->
            ProductCollectionImage(img.url.toString(), img.altText)
        },
        products = products.edges.map { it.node.productFragment.toLocal() },
    )
}

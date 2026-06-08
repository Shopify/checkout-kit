package com.shopify.checkout_kit_android_demo.products.collection.data

import com.shopify.checkout_kit_android_demo.common.ID
import com.shopify.checkout_kit_android_demo.graphql.FetchCollectionQuery
import com.shopify.checkout_kit_android_demo.graphql.FetchCollectionsQuery
import com.shopify.checkout_kit_android_demo.products.product.data.toLocal

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

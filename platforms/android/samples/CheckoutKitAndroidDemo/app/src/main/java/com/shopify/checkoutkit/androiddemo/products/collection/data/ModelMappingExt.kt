package com.shopify.checkoutkit.androiddemo.products.collection.data

import com.shopify.checkoutkit.androiddemo.common.ID
import com.shopify.checkoutkit.androiddemo.graphql.FetchCollectionQuery
import com.shopify.checkoutkit.androiddemo.graphql.FetchCollectionsQuery
import com.shopify.checkoutkit.androiddemo.products.product.data.toLocal

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

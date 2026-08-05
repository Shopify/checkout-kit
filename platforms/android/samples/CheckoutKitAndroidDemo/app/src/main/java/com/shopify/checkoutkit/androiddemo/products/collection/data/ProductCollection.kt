package com.shopify.checkoutkit.androiddemo.products.collection.data

import com.shopify.checkoutkit.androiddemo.common.ID
import com.shopify.checkoutkit.androiddemo.products.product.data.Product

data class ProductCollection(
    val id: ID,
    val handle: String,
    val title: String,
    val description: String,
    val image: ProductCollectionImage?,
    val products: List<Product> = mutableListOf()
)

data class ProductCollectionImage(
    val url: String,
    val altText: String? = null,
)

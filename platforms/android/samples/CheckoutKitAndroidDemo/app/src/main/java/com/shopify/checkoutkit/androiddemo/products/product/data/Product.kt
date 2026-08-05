package com.shopify.checkoutkit.androiddemo.products.product.data

import com.shopify.checkoutkit.androiddemo.common.ID

data class Products(
    val products: List<Product> = mutableListOf(),
    val pageInfo: PageInfo = PageInfo(),
)

data class PageInfo(
    val startCursor: String? = null,
    val endCursor: String? = null,
)

data class Product(
    val id: ID,
    val title: String,
    val description: String,
    val image: ProductImage?,
    val priceRange: ProductPriceRange,
    val variants: List<ProductVariant> = mutableListOf(),
)

data class ProductVariant(
    val id: ID,
    val price: ProductPriceAmount,
    val availableForSale: Boolean,
    val title: String,
    val selectedOptions: List<ProductVariantSelectedOption>,
)

data class ProductVariantSelectedOption(
    val name: String,
    val value: String,
)

data class ProductVariantOptionDetails(
    val name: String,
    val availableForSale: Boolean,
)

data class ProductPriceRange(
    val maxVariantPrice: ProductPriceAmount,
    val minVariantPrice: ProductPriceAmount,
)

data class ProductPriceAmount(
    val currencyCode: String = "",
    val amount: Double = 0.0,
)

data class ProductImage(
    val width: Int = 0,
    val height: Int = 0,
    val altText: String? = null,
    val url: String,
)

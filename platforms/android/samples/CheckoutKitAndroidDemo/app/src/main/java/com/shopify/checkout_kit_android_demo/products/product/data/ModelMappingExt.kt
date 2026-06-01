package com.shopify.checkout_kit_android_demo.products.product.data

import com.shopify.checkout_kit_android_demo.common.ID
import com.shopify.checkout_kit_android_demo.graphql.fragment.ProductFragment
import com.shopify.checkout_kit_android_demo.graphql.fragment.ProductVariantFragment

fun ProductFragment.toLocal(variants: List<ProductVariant> = emptyList()): Product {
    return Product(
        id = ID(id),
        title = title,
        description = description,
        image = featuredImage?.let { image ->
            ProductImage(
                width = image.width ?: 0,
                height = image.height ?: 0,
                url = image.url.toString(),
                altText = image.altText ?: "Product image",
            )
        },
        priceRange = ProductPriceRange(
            minVariantPrice = ProductPriceAmount(
                currencyCode = priceRange.minVariantPrice.currencyCode.rawValue,
                amount = priceRange.minVariantPrice.amount.toString().toDouble(),
            ),
            maxVariantPrice = ProductPriceAmount(
                currencyCode = priceRange.maxVariantPrice.currencyCode.rawValue,
                amount = priceRange.maxVariantPrice.amount.toString().toDouble(),
            ),
        ),
        variants = variants,
    )
}

fun ProductVariantFragment.toLocal(): ProductVariant {
    return ProductVariant(
        id = ID(id),
        price = ProductPriceAmount(
            amount = price.amount.toString().toDouble(),
            currencyCode = price.currencyCode.rawValue,
        ),
        title = title,
        availableForSale = availableForSale,
        selectedOptions = selectedOptions.map { option ->
            ProductVariantSelectedOption(option.name, option.value)
        },
    )
}

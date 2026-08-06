package com.shopify.checkoutkit.androiddemo.products.product

import com.shopify.checkoutkit.androiddemo.products.product.data.Product
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductVariant
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductVariantOptionDetails
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductVariantSelectedOption

internal fun selectedVariantFor(
    product: Product,
    previousSelection: ProductVariant? = null,
): ProductVariant = product.variants.find { it.id == previousSelection?.id } ?: product.variants.first()

internal fun variantForOption(
    product: Product,
    selectedVariant: ProductVariant,
    name: String,
    value: String,
): ProductVariant? = product.variants.firstOrNull { variant ->
    variant.selectedOptions.containsAll(replacedOption(selectedVariant, name, value))
}

internal fun availableOptionsFor(
    product: Product,
    selectedVariant: ProductVariant,
): Map<String, List<ProductVariantOptionDetails>> {
    if (product.variants.size == 1) return emptyMap()

    val options = product.variants
        .flatMap { it.selectedOptions }
        .distinctBy { it.name to it.value }

    return options.groupBy { it.name }.mapValues { (name, optionsForName) ->
        optionsForName.map { option ->
            ProductVariantOptionDetails(
                name = option.value,
                availableForSale = product.variants.any { variant ->
                    variant.availableForSale && variant.selectedOptions.containsAll(
                        replacedOption(selectedVariant, name, option.value),
                    )
                },
            )
        }
    }
}

private fun replacedOption(
    selectedVariant: ProductVariant,
    name: String,
    value: String,
): List<ProductVariantSelectedOption> = selectedVariant.selectedOptions
    .filter { it.name != name }
    .plus(ProductVariantSelectedOption(name, value))

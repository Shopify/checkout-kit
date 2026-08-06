package com.shopify.checkoutkit.androiddemo.products.product

import com.shopify.checkoutkit.androiddemo.common.ID
import com.shopify.checkoutkit.androiddemo.products.product.data.Product
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductPriceAmount
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductPriceRange
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductVariant
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductVariantOptionDetails
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductVariantSelectedOption
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ProductVariantSelectorTest {
    @Test
    fun `keeps the previous selection when refreshed product still contains it`() {
        val product = product()
        val selected = product.variants.last()

        assertEquals(selected, selectedVariantFor(product, selected))
    }

    @Test
    fun `uses the first variant when the previous selection is unavailable`() {
        val product = product()
        val staleSelection = variant("stale", "Large", "Blue", available = true)

        assertEquals(product.variants.first(), selectedVariantFor(product, staleSelection))
    }

    @Test
    fun `selecting an option retains the other selected options`() {
        val product = product()
        val selected = product.variants.first()

        val variant = variantForOption(product, selected, name = "Size", value = "Large")

        assertEquals("Large", variant?.selectedOptions?.single { it.name == "Size" }?.value)
        assertEquals("Red", variant?.selectedOptions?.single { it.name == "Color" }?.value)
    }

    @Test
    fun `returns no variant for an option combination that does not exist`() {
        val selected = variant("small-red", "Small", "Red", available = true)
        val product = product(variants = listOf(selected))

        assertNull(variantForOption(product, selected, name = "Size", value = "Large"))
    }

    @Test
    fun `reports availability for each option combined with the current selection`() {
        val product = product()

        val options = availableOptionsFor(product, product.variants.first())

        assertEquals(
            listOf(
                ProductVariantOptionDetails("Small", availableForSale = true),
                ProductVariantOptionDetails("Large", availableForSale = false),
            ),
            options["Size"],
        )
        assertEquals(
            listOf(
                ProductVariantOptionDetails("Red", availableForSale = true),
                ProductVariantOptionDetails("Blue", availableForSale = true),
            ),
            options["Color"],
        )
    }

    @Test
    fun `keeps options with the same value under different names`() {
        val product = product(
            variants = listOf(
                variant("standard", "Standard", "Standard", available = true),
                variant("large", "Large", "Standard", available = true),
            ),
        )

        val options = availableOptionsFor(product, product.variants.first())

        assertTrue(options.containsKey("Size"))
        assertTrue(options.containsKey("Color"))
        assertEquals(listOf("Standard", "Large"), options["Size"]?.map { it.name })
        assertEquals(listOf("Standard"), options["Color"]?.map { it.name })
    }

    @Test
    fun `does not expose selectors for a single variant product`() {
        val onlyVariant = variant("only", "Standard", "Red", available = true)

        assertTrue(availableOptionsFor(product(variants = listOf(onlyVariant)), onlyVariant).isEmpty())
    }

    private fun product(variants: List<ProductVariant> = defaultVariants()) = Product(
        id = ID("product"),
        title = "Product",
        description = "Description",
        image = null,
        priceRange = ProductPriceRange(ProductPriceAmount(), ProductPriceAmount()),
        variants = variants,
    )

    private fun defaultVariants() = listOf(
        variant("small-red", "Small", "Red", available = true),
        variant("large-red", "Large", "Red", available = false),
        variant("small-blue", "Small", "Blue", available = true),
        variant("large-blue", "Large", "Blue", available = true),
    )

    private fun variant(id: String, size: String, color: String, available: Boolean) = ProductVariant(
        id = ID(id),
        price = ProductPriceAmount(),
        availableForSale = available,
        title = "$size / $color",
        selectedOptions = listOf(
            ProductVariantSelectedOption("Size", size),
            ProductVariantSelectedOption("Color", color),
        ),
    )
}

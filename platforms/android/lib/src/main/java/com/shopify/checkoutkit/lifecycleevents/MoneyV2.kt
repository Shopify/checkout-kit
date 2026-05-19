package com.shopify.checkoutkit.lifecycleevents

import kotlinx.serialization.Serializable

/**
 * A monetary value with currency.
 */
@Serializable
public data class MoneyV2(
    /**
     * The decimal money amount.
     */
    public val amount: Double? = null,

    /**
     * The three-letter code that represents the currency, for example, USD.
     * Supported codes include standard ISO 4217 codes, legacy codes, and non-
     * standard codes.
     */
    public val currencyCode: String? = null,
)

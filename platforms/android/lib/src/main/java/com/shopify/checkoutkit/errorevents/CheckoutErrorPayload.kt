package com.shopify.checkoutkit.errorevents

import kotlinx.serialization.Serializable

@Serializable
internal data class CheckoutErrorPayload(
    val group: CheckoutErrorGroup,
    val code: String? = null,
    val flowType: String? = null,
    val reason: String? = null,
    val type: String? = null,
)

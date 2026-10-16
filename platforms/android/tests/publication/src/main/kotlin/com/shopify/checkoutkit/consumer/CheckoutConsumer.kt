package com.shopify.checkoutkit.consumer

import com.shopify.checkoutkit.checkout.CheckoutErrorCode
import com.shopify.checkoutkit.checkout.CheckoutException
import com.shopify.checkoutkit.checkout.ShopifyCheckoutKit
import com.shopify.ucp.embedded.checkout.EmbeddedCheckoutProtocol

// Compilation exercises Kotlin metadata and the transitive protocol API.
fun sdkVersion(): String = ShopifyCheckoutKit.VERSION
fun checkoutError(): CheckoutException = CheckoutException(CheckoutErrorCode.UNKNOWN, "sample")
fun protocolVersion(): String = EmbeddedCheckoutProtocol.SPEC_VERSION

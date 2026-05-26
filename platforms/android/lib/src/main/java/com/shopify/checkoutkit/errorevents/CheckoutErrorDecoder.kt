package com.shopify.checkoutkit.errorevents

import com.shopify.checkoutkit.CheckoutException
import com.shopify.checkoutkit.CheckoutExpiredException
import com.shopify.checkoutkit.ClientException
import com.shopify.checkoutkit.ConfigurationException
import com.shopify.checkoutkit.LogWrapper
import com.shopify.checkoutkit.WebToSdkEvent
import kotlinx.serialization.json.Json

internal class CheckoutErrorDecoder @JvmOverloads constructor(
    private val decoder: Json,
    private val log: LogWrapper = LogWrapper()
) {
    fun decode(message: WebToSdkEvent): CheckoutException? = try {
        decodeMessage(message).mapToCheckoutException()
    } catch (e: Exception) {
        log.e("CheckoutBridge", "Failed to decode CheckoutErrorPayload", e)
        throw e
    }

    internal fun decodeMessage(message: WebToSdkEvent): CheckoutErrorPayload {
        val errors = decoder.decodeFromString<List<CheckoutErrorPayload>>(message.body)
        return errors.first()
    }

    private fun CheckoutErrorPayload.mapToCheckoutException(): CheckoutException? {
        return when (this.group) {
            CheckoutErrorGroup.CONFIGURATION -> {
                ConfigurationException(
                    errorDescription = this.reason ?: "Storefront configuration error.",
                    errorCode = if (this.code == STOREFRONT_PASSWORD_REQUIRED) {
                        ConfigurationException.STOREFRONT_PASSWORD_REQUIRED
                    } else {
                        ConfigurationException.UNKNOWN
                    },
                )
            }

            CheckoutErrorGroup.UNRECOVERABLE ->
                ClientException(
                    errorDescription = this.reason,
                )

            CheckoutErrorGroup.EXPIRED ->
                CheckoutExpiredException(
                    errorDescription = this.reason,
                    errorCode = this.expiredErrorCode(),
                )

            else -> {
                // The remaining error groups are unsupported and will be ignored
                null
            }
        }
    }

    private fun CheckoutErrorPayload.expiredErrorCode(): String {
        return when (this.code) {
            INVALID_CART -> CheckoutExpiredException.INVALID_CART
            CART_COMPLETED -> CheckoutExpiredException.CART_COMPLETED
            else -> CheckoutExpiredException.CART_EXPIRED
        }
    }

    companion object {
        private const val STOREFRONT_PASSWORD_REQUIRED = "storefront_password_required"
        private const val INVALID_CART = "invalid_cart"
        private const val CART_COMPLETED = "cart_completed"
    }
}

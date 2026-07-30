package com.shopify.checkoutkit

import com.shopify.ucp.embedded.checkout.ErrorResponse
import com.shopify.ucp.embedded.checkout.MessageType
import com.shopify.ucp.embedded.checkout.Severity
import java.net.HttpURLConnection

/** Stable, consumer-facing reason for a terminal checkout presentation failure. */
public enum class CheckoutErrorCode {
    STOREFRONT_PASSWORD_REQUIRED,
    CUSTOMER_ACCOUNT_REQUIRED,
    CART_EXPIRED,
    CART_COMPLETED,
    INVALID_CART,
    HTTP_ERROR,
    NETWORK_ERROR,
    WEB_VIEW_NOT_SUPPORTED,
    WEB_CONTENT_PROCESS_TERMINATED,
    SDK_ERROR,
    UNKNOWN,
}

/**
 * A terminal checkout presentation failure.
 *
 * Use [code] for application behavior. [message] and [cause] are diagnostic context.
 * [httpStatusCode] is present only when an HTTP response caused failure.
 */
public class CheckoutException @JvmOverloads constructor(
    public val code: CheckoutErrorCode,
    override val message: String,
    public val httpStatusCode: Int? = null,
    cause: Throwable? = null,
) : Exception(message, cause) {
    internal companion object {
        fun http(statusCode: Int, message: String): CheckoutException =
            CheckoutException(
                code = if (statusCode == HttpURLConnection.HTTP_GONE) {
                    CheckoutErrorCode.CART_EXPIRED
                } else {
                    CheckoutErrorCode.HTTP_ERROR
                },
                message = message,
                httpStatusCode = statusCode,
            )

        fun network(message: String, cause: Throwable? = null): CheckoutException =
            CheckoutException(
                code = CheckoutErrorCode.NETWORK_ERROR,
                message = message,
                cause = cause,
            )

        fun webViewNotSupported(message: String, cause: Throwable? = null): CheckoutException =
            CheckoutException(
                code = CheckoutErrorCode.WEB_VIEW_NOT_SUPPORTED,
                message = message,
                cause = cause,
            )

        fun webContentProcessTerminated(message: String, cause: Throwable? = null): CheckoutException =
            CheckoutException(
                code = CheckoutErrorCode.WEB_CONTENT_PROCESS_TERMINATED,
                message = message,
                cause = cause,
            )

        fun sdk(message: String, cause: Throwable? = null): CheckoutException =
            CheckoutException(
                code = CheckoutErrorCode.SDK_ERROR,
                message = message,
                cause = cause,
            )

        fun unknown(message: String, cause: Throwable? = null): CheckoutException =
            CheckoutException(
                code = CheckoutErrorCode.UNKNOWN,
                message = message,
                cause = cause,
            )

        fun terminalProtocol(error: ErrorResponse): CheckoutException {
            val representative = error.messages.firstOrNull {
                it.type == MessageType.Error && it.severity == Severity.Unrecoverable
            }

            return CheckoutException(
                code = representative?.code.toCheckoutErrorCode(),
                message = representative?.content ?: "Embedded checkout reported a terminal error.",
            )
        }

        private fun String?.toCheckoutErrorCode(): CheckoutErrorCode = when (this?.lowercase()) {
            "storefront_password_required" -> CheckoutErrorCode.STOREFRONT_PASSWORD_REQUIRED
            "customer_account_required" -> CheckoutErrorCode.CUSTOMER_ACCOUNT_REQUIRED
            "cart_expired" -> CheckoutErrorCode.CART_EXPIRED
            "cart_completed" -> CheckoutErrorCode.CART_COMPLETED
            "invalid_cart" -> CheckoutErrorCode.INVALID_CART
            else -> CheckoutErrorCode.UNKNOWN
        }
    }
}

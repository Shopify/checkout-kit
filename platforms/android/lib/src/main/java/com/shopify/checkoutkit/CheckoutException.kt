package com.shopify.checkoutkit

import com.shopify.ucp.embedded.checkout.ErrorResponse
import com.shopify.ucp.embedded.checkout.MessageType
import com.shopify.ucp.embedded.checkout.Severity
import java.net.HttpURLConnection

/** Stable, consumer-facing reason for a terminal checkout presentation failure. */
public enum class CheckoutErrorCode {
    /** The storefront requires a password and cannot be used by Checkout Kit. */
    STOREFRONT_PASSWORD_REQUIRED,

    /** Checkout requires a customer account that is not available to the current session. */
    CUSTOMER_ACCOUNT_REQUIRED,

    /** The cart or checkout session is no longer available. Create a new cart before retrying. */
    CART_EXPIRED,

    /** The cart has already completed checkout. */
    CART_COMPLETED,

    /** The cart is invalid or cannot be used to continue checkout. */
    INVALID_CART,

    /** Checkout returned an HTTP error response. See [CheckoutException.httpStatusCode]. */
    HTTP_ERROR,

    /** Checkout navigation failed before an HTTP response was available. */
    NETWORK_ERROR,

    /** The installed WebView provider does not support the required WebMessageListener API. */
    WEB_VIEW_NOT_SUPPORTED,

    /** The WebView renderer process was terminated or crashed. */
    WEB_CONTENT_PROCESS_TERMINATED,

    /** An internal Checkout Kit error occurred, for example when a protocol message could not be decoded. */
    SDK_ERROR,

    /** An unexpected error occurred. */
    UNKNOWN,
}

/**
 * A terminal checkout presentation failure delivered through [CheckoutListener.onCheckoutFailed]
 * or [CheckoutPresentation.onFail].
 *
 * Use [code] for application behavior. Use [message] and [cause] only for debugging and logging.
 * [httpStatusCode] is present only when an HTTP response caused failure. Your app owns recovery
 * actions such as retrying, recreating a cart, authenticating a buyer, and reopening checkout.
 *
 * @property code Stable code for this failure.
 * @property message Diagnostic description. Do not use it as a stable recovery or analytics key.
 * @property httpStatusCode HTTP status for an HTTP-response failure, otherwise `null`.
 * @param cause Native diagnostic cause, when one is available.
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

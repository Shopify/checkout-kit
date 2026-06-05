package com.shopify.checkoutkit

import android.util.Log

private const val LOG_TAG = "checkout_kit"
private const val DEFAULT_LOG_SCOPE = "sdk"

/**
 * Wrap Log class static methods to allow testing and/or disabling debug logs
 */
public class LogWrapper {
    public fun d(tag: String, msg: String) {
        if (ShopifyCheckoutKit.configuration.logLevel == LogLevel.DEBUG) {
            Log.d(LOG_TAG, formatMessage(tag, msg))
        }
    }

    public fun w(tag: String, msg: String) {
        if (listOf(LogLevel.DEBUG, LogLevel.WARN).contains(ShopifyCheckoutKit.configuration.logLevel)) {
            Log.w(LOG_TAG, formatMessage(tag, msg))
        }
    }

    public fun e(tag: String, msg: String) {
        Log.e(LOG_TAG, formatMessage(tag, msg))
    }

    public fun e(tag: String, msg: String, throwable: Throwable) {
        Log.e(LOG_TAG, formatMessage(tag, msg), throwable)
    }

    private fun formatMessage(tag: String, msg: String): String = "[$LOG_TAG:${tag.toLogScope()}] $msg"

    private fun String.toLogScope(): String = when (this) {
        "ShopifyCheckoutKit", "checkout_kit" -> DEFAULT_LOG_SCOPE
        "ShopifyAcceleratedCheckouts" -> "accelerated_checkout"
        "CheckoutECP" -> "ecp"
        else -> this
    }
}

package com.shopify.checkoutkit

import android.util.Log

/**
 * Wrap Log class static methods to allow testing and/or disabling debug logs
 */
public class LogWrapper {
    public fun d(tag: String, msg: String) {
        if (ShopifyCheckoutKit.configuration.logLevel == LogLevel.DEBUG) {
            Log.d(tag, msg)
        }
    }

    public fun w(tag: String, msg: String) {
        if (listOf(LogLevel.DEBUG, LogLevel.WARN).contains(ShopifyCheckoutKit.configuration.logLevel)) {
            Log.w(tag, msg)
        }
    }

    public fun e(tag: String, msg: String) {
        Log.e(tag, msg)
    }

    public fun e(tag: String, msg: String, throwable: Throwable) {
        Log.e(tag, msg, throwable)
    }
}

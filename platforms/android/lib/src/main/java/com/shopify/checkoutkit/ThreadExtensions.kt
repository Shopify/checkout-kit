package com.shopify.checkoutkit

import android.os.Handler
import android.os.Looper

/**
 * Executes the given block on the main (UI) thread.
 * If already on the main thread, executes immediately.
 * Otherwise, posts to the main thread handler.
 */
internal fun onMainThread(block: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
        block()
    } else {
        Handler(Looper.getMainLooper()).post {
            block()
        }
    }
}

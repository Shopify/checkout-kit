package com.shopify.checkoutkit.internal

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper

/** Returns the activity behind this context's wrappers, or `null` when there is none. */
internal fun Context.findActivity(): Activity? {
    var current: Context? = this
    while (current is ContextWrapper && current !is Activity) {
        val baseContext = current.baseContext
        current = if (baseContext === current) null else baseContext
    }
    return current as? Activity
}

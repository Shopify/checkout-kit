package com.shopify.checkoutkit

import android.content.Context

internal object CodeQLCanary {
    fun storePassword(context: Context, password: String) {
        context
            .getSharedPreferences("codeql_canary", Context.MODE_PRIVATE)
            .edit()
            .putString("password", password)
            .apply()
    }
}

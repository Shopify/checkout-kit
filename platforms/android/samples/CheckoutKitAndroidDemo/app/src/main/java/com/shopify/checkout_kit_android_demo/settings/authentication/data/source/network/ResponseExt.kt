package com.shopify.checkout_kit_android_demo.settings.authentication.data.source.network

import okhttp3.Response
import java.io.IOException

fun Response.bodyOrThrow() = this.body.use {
    if (it == null) {
        throw IOException("Unexpected empty response body")
    }
    it.string()
}

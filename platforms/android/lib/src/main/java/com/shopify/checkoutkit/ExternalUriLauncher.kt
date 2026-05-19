/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
package com.shopify.checkoutkit

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * Single point of entry for launching an external `ACTION_VIEW` Intent.
 *
 * Used by both [CheckoutWebView.shouldOverrideUrlLoading] (for `mailto:` / `tel:` / custom-scheme
 * deep links intercepted during navigation) and [EmbeddedCheckoutProtocol.defaultDelegationClient]
 * (for `ec.window.open_request` payloads from the page). Centralising the resolver check and
 * `startActivity` failure handling keeps the two paths from drifting apart.
 */
internal object ExternalUriLauncher {
    sealed class Result {
        object Launched : Result()
        data class Rejected(val reason: String? = null) : Result()
    }

    fun launch(context: Context, uri: Uri): Result {
        val intent = Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return try {
            context.startActivity(intent)
            Result.Launched
        } catch (e: ActivityNotFoundException) {
            Result.Rejected(reason = e.message ?: "No activity resolves $uri")
        } catch (e: Exception) {
            Result.Rejected(reason = e.message)
        }
    }
}

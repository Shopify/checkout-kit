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
        } catch (e: SecurityException) {
            Result.Rejected(reason = e.message)
        }
    }
}

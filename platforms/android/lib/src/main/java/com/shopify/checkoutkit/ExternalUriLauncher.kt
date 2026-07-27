package com.shopify.checkoutkit

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle

/**
 * Single point of entry for launching URLs outside the checkout WebView.
 *
 * Web links use Android Custom Tabs so buyers stay in an in-app browser surface by default.
 * Contact links and custom-scheme deep links use an external `ACTION_VIEW` intent.
 */
internal object ExternalUriLauncher {
    sealed class Result {
        object Launched : Result()
        data class Rejected(val reason: String? = null) : Result()
    }

    fun launch(context: Context, uri: Uri): Result {
        if (!uri.isWebLink()) {
            return launchExternalApp(context, uri)
        }
        return launchCustomTab(context, uri)
    }

    fun launchExternalApp(context: Context, uri: Uri): Result {
        return launchIntent(
            context = context,
            intent = Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            uri = uri,
        )
    }

    private fun launchCustomTab(context: Context, uri: Uri): Result {
        val customTabsExtras = Bundle().apply {
            putBinder(CUSTOM_TABS_SESSION_EXTRA, null)
        }
        val intent = Intent(Intent.ACTION_VIEW, uri)
            .putExtras(customTabsExtras)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return launchIntent(context, intent, uri)
    }

    private fun launchIntent(context: Context, intent: Intent, uri: Uri): Result {
        return try {
            context.startActivity(intent)
            Result.Launched
        } catch (e: ActivityNotFoundException) {
            Result.Rejected(reason = e.message ?: "No activity resolves $uri")
        } catch (e: SecurityException) {
            Result.Rejected(reason = e.message)
        }
    }

    private const val CUSTOM_TABS_SESSION_EXTRA = "android.support.customtabs.extra.SESSION"
}

package com.shopify.checkoutkit

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.core.net.toUri

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
        val browserPackage = resolveCustomTabsPackage(context) ?: return launchExternalApp(context, uri)
        val customTabsExtras = Bundle().apply {
            putBinder(CUSTOM_TABS_SESSION_EXTRA, null)
        }
        val intent = Intent(Intent.ACTION_VIEW, uri)
            .putExtras(customTabsExtras)
            .setPackage(browserPackage)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return launchIntent(context, intent, uri)
    }

    private fun resolveCustomTabsPackage(context: Context): String? {
        val browserIntent = Intent(Intent.ACTION_VIEW, BROWSER_PROBE_URI)
            .addCategory(Intent.CATEGORY_BROWSABLE)
        return context.packageManager.queryIntentActivities(browserIntent, 0)
            .asSequence()
            .mapNotNull { it.activityInfo?.packageName }
            .distinct()
            .firstOrNull { packageName ->
                val serviceIntent = Intent(CUSTOM_TABS_SERVICE_ACTION).setPackage(packageName)
                context.packageManager.resolveService(serviceIntent, 0) != null
            }
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

    private val BROWSER_PROBE_URI = "http://www.example.com".toUri()
    private const val CUSTOM_TABS_SERVICE_ACTION = "android.support.customtabs.action.CustomTabsService"
    private const val CUSTOM_TABS_SESSION_EXTRA = "android.support.customtabs.extra.SESSION"
}

package com.shopify.checkout_kit_android_demo.e2e

import android.content.Intent
import androidx.activity.ComponentActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

object E2EControlLinkHandler {
    fun handle(activity: ComponentActivity, intent: Intent) {
        val url = intent.data?.toString() ?: return

        activity.lifecycleScope.launch {
            E2EController(E2ESampleAppTarget()).handle(url)
        }
    }
}

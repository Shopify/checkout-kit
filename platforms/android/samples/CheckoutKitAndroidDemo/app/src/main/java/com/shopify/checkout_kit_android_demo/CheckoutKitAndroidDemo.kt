package com.shopify.checkout_kit_android_demo

import android.app.Application
import com.shopify.checkout_kit_android_demo.common.di.setupDI
import com.shopify.checkout_kit_android_demo.common.withCustomCloseIcon
import com.shopify.checkout_kit_android_demo.settings.PreferencesManager
import com.shopify.checkoutkit.LogLevel
import com.shopify.checkoutkit.Preloading
import com.shopify.checkoutkit.ShopifyCheckoutKit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import org.koin.android.ext.android.get

class CheckoutKitAndroidDemo : Application() {

    private val applicationScope = CoroutineScope(Job())

    override fun onCreate() {
        super.onCreate()
        setupDI(application = this)
        initCheckoutKit(preferencesManager = get())
    }

    /**
     * Configures the Checkout Kit with the most recent user preferences.
     */
    private fun initCheckoutKit(preferencesManager: PreferencesManager) {
        applicationScope.launch {
            val settings = preferencesManager.userPreferencesFlow.first()
            ShopifyCheckoutKit.configure {
                it.logLevel = LogLevel.DEBUG
                it.colorScheme = settings.colorScheme.withCustomCloseIcon()
                it.preloading = Preloading(enabled = settings.checkoutPreloadingEnabled)
            }
        }
    }

    override fun onTerminate() {
        super.onTerminate()
        applicationScope.cancel()
    }
}

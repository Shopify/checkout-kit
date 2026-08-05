package com.shopify.checkoutkit.androiddemo

import android.app.Application
import com.shopify.checkoutkit.LogLevel
import com.shopify.checkoutkit.Preloading
import com.shopify.checkoutkit.ShopifyCheckoutKit
import com.shopify.checkoutkit.androiddemo.common.di.setupDI
import com.shopify.checkoutkit.androiddemo.common.withCustomCloseIcon
import com.shopify.checkoutkit.androiddemo.settings.PreferencesManager
import com.shopify.checkoutkit.androiddemo.settings.data.toCheckoutSheetOptions
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
                it.appearance = settings.appearance.withCustomCloseIcon()
                it.sheet = settings.checkoutPresentationMode.toCheckoutSheetOptions(
                    preset = settings.checkoutSheetPreset,
                    dragToDismissEnabled = settings.dragToDismissEnabled,
                    tapAwayToDismissEnabled = settings.tapAwayToDismissEnabled,
                )
                it.preloading = Preloading(enabled = settings.checkoutPreloadingEnabled)
                it.title = "Plant Checkout"
            }
        }
    }

    override fun onTerminate() {
        super.onTerminate()
        applicationScope.cancel()
    }
}

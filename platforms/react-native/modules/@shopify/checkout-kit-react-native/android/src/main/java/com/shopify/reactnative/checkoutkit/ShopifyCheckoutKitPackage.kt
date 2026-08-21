package com.shopify.reactnative.checkoutkit

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class ShopifyCheckoutKitPackage : TurboReactPackage() {
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == ShopifyCheckoutKitModule.NAME) ShopifyCheckoutKitModule(reactContext) else null

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
        mapOf(
            ShopifyCheckoutKitModule.NAME to ReactModuleInfo(
                ShopifyCheckoutKitModule.NAME,
                ShopifyCheckoutKitModule.NAME,
                false,
                false,
                false,
                true,
            ),
        )
    }
}

package com.shopify.reactnative.checkoutkit;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.TurboReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.uimanager.ViewManager;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ShopifyCheckoutKitPackage extends TurboReactPackage {

  @NonNull
  @Override
  public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }

  @Nullable
  @Override
  public NativeModule getModule(@NonNull String name, @NonNull ReactApplicationContext reactContext) {
    if (name.equals(ShopifyCheckoutKitModule.NAME)) {
      return new ShopifyCheckoutKitModule(reactContext);
    }
    return null;
  }

  @Override
  public ReactModuleInfoProvider getReactModuleInfoProvider() {
    return () -> {
      final Map<String, ReactModuleInfo> moduleInfos = new HashMap<>();
      moduleInfos.put(
          ShopifyCheckoutKitModule.NAME,
          new ReactModuleInfo(
              ShopifyCheckoutKitModule.NAME,
              ShopifyCheckoutKitModule.NAME,
              false, // canOverrideExistingModule
              false, // needsEagerInit
              false, // isCxxModule
              true   // isTurboModule
          ));
      return moduleInfos;
    };
  }
}

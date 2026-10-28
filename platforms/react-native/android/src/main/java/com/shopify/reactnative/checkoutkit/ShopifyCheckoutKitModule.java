package com.shopify.reactnative.checkoutkit;

import android.app.Activity;
import androidx.activity.ComponentActivity;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.shopify.checkoutkit.NativeShopifyCheckoutKitSpec;
import com.shopify.checkoutkit.checkout.*;

import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.json.JSONException;
import org.json.JSONObject;

public class ShopifyCheckoutKitModule extends NativeShopifyCheckoutKitSpec {

  // A snapshot of the SDK configuration, never the SDK's live object. Written on the native
  // modules thread, read by getConfig() on the JS thread.
  public static volatile Configuration checkoutConfig = ShopifyCheckout.getConfiguration();

  private volatile boolean invalidated;

  private CheckoutHandle checkoutSheet;

  private WeakReference<CheckoutHandle> closingCheckoutSheet;

  private CustomCheckoutListener checkoutListener;

  private CheckoutPreload checkoutPreload;

  public ShopifyCheckoutKitModule(ReactApplicationContext reactContext) {
    super(reactContext);

    ShopifyCheckout.configure(configuration -> configuration.setPlatform(new Platform.ReactNative()));
    checkoutConfig = ShopifyCheckout.getConfiguration();
  }

  @Override
  public void invalidate() {
    invalidated = true;
    releaseCheckoutPreload();
    UiThreadUtil.runOnUiThread(this::releaseCheckoutListener);
    super.invalidate();
  }

  @Override
  protected Map<String, Object> getTypedExportedConstants() {
    final Map<String, Object> constants = new HashMap<>();
    constants.put("version", ShopifyCheckoutKit.VERSION);
    // Exposed so the JS layer can verify the SDK lifecycle event set
    // it was built against matches what this native module emits.
    constants.put("dispatchEventTypes", DispatchEventTypes.ALL);
    return constants;
  }

  @ReactMethod
  public void addListener(String eventName) {
    // No-op but required for RN to register module
  }

  @ReactMethod
  public void removeListeners(double count) {
    // No-op but required for RN to register module
  }

  @ReactMethod
  public void present(String checkoutURL, String linkAction, Callback onResult) {
    if (invalidated) {
      onResult.invoke(false);
      return;
    }
    Activity currentActivity = getReactApplicationContext().getCurrentActivity();
    if (currentActivity instanceof ComponentActivity) {
      currentActivity.runOnUiThread(() -> {
        // Ignore duplicate calls without replacing the active listener or policy.
        if (invalidated || (checkoutListener != null && !checkoutListener.isReleased())) {
          onResult.invoke(false);
          return;
        }
        CustomCheckoutListener listener = new CustomCheckoutListener(this::emitDispatchEvent);
        checkoutListener = listener;
        listener.configure(linkAction, this::finishCheckoutPresentation);
        CheckoutHandle sheet = ShopifyCheckout.present(checkoutURL, (ComponentActivity) currentActivity, listener);
        // Initialization can fail synchronously and already emit a terminal event.
        if (checkoutListener != listener) {
          onResult.invoke(true);
          return;
        }
        if (sheet != null && closingCheckoutSheet != null && sheet == closingCheckoutSheet.get()) {
          // The SDK returns the closing handle without adopting this listener.
          // Keep the old handle so another explicit attempt can check it again.
          releaseCheckoutListener();
          onResult.invoke(false);
          return;
        }
        closingCheckoutSheet = null;
        checkoutSheet = sheet;
        if (sheet == null) listener.onCheckoutDismissed();
        onResult.invoke(true);
      });
    } else {
      CustomCheckoutListener listener = new CustomCheckoutListener(this::emitDispatchEvent);
      listener.onCheckoutDismissed();
      onResult.invoke(true);
    }
  }

  private void finishCheckoutPresentation() {
    if (checkoutSheet != null) closingCheckoutSheet = new WeakReference<>(checkoutSheet);
    checkoutSheet = null;
    checkoutListener = null;
  }

  protected void emitDispatchEvent(String event) {
    emitOnDispatch(event);
  }

  @ReactMethod
  public void dismiss() {
    UiThreadUtil.runOnUiThread(() -> {
      CheckoutHandle sheet = checkoutSheet;
      CustomCheckoutListener listener = checkoutListener;
      if (sheet != null) sheet.dismiss();
      // Native dismiss() does not notify the listener for programmatic dismissal.
      if (listener != null) listener.onCheckoutDismissed();
      else checkoutSheet = null;
    });
  }

  @ReactMethod
  public void preload(String checkoutURL, String requestId) {
    releaseCheckoutPreload();

    Activity currentActivity = getReactApplicationContext().getCurrentActivity();
    if (currentActivity instanceof ComponentActivity) {
      checkoutPreload = ShopifyCheckout.preload(
          checkoutURL,
          (ComponentActivity) currentActivity,
          state -> emitPreloadStateChange(requestId, state));

      if (checkoutPreload == null) {
        emitPreloadStateChange(requestId, new PreloadState.Idle());
      }
    } else {
      emitPreloadStateChange(requestId, new PreloadState.Idle());
    }
  }

  @ReactMethod
  public void clearPreload() {
    releaseCheckoutPreload();
    ShopifyCheckout.clearPreload();
  }

  private void emitPreloadStateChange(String requestId, PreloadState state) {
    JSONObject event = new JSONObject();

    try {
      event.put("requestId", requestId);

      if (state instanceof PreloadState.Idle) {
        PreloadState.IdleReason reason = ((PreloadState.Idle) state).getReason();
        event.put("type", "idle");
        if (reason != null) event.put("reason", reason.getRawValue());
      } else if (state instanceof PreloadState.Loading) {
        event.put("type", "loading");
      } else if (state instanceof PreloadState.Ready) {
        event.put("type", "ready");
      } else if (state instanceof PreloadState.Failed) {
        PreloadState.FailureReason reason = ((PreloadState.Failed) state).getReason();
        event.put("type", "failed");

        if (reason instanceof PreloadState.FailureReason.HttpError) {
          event.put("reason", "httpError");
          event.put("statusCode", ((PreloadState.FailureReason.HttpError) reason).getStatusCode());
        } else if (reason instanceof PreloadState.FailureReason.NavigationFailed) {
          event.put("reason", "navigationFailed");
        } else if (reason instanceof PreloadState.FailureReason.WebContentUnavailable) {
          event.put("reason", "webContentUnavailable");
        } else if (reason instanceof PreloadState.FailureReason.ProtocolError) {
          event.put("reason", "protocolError");
        } else {
          event.put("reason", "unknown");
        }
      } else {
        return;
      }
    } catch (JSONException exception) {
      throw new IllegalStateException("Failed to serialize preload state", exception);
    }

    emitPreloadStateEvent(event.toString());
  }

  protected void emitPreloadStateEvent(String event) {
    emitOnPreloadStateChange(event);
  }

  private void releaseCheckoutListener() {
    if (checkoutListener != null) {
      checkoutListener.release();
      checkoutListener = null;
    }
  }

  private void releaseCheckoutPreload() {
    if (checkoutPreload != null) {
      checkoutPreload.setListener(null);
      checkoutPreload = null;
    }
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  public WritableMap getConfig() {
    // Read the field once, so every value comes from the same snapshot.
    Configuration snapshot = checkoutConfig;
    WritableMap resultConfig = Arguments.createMap();

    resultConfig.putString("title", snapshot.getTitle());
    resultConfig.putMap("appearance", CheckoutAppearanceConfiguration.appearanceResultFor(snapshot.getAppearance()));
    resultConfig.putString("logLevel", logLevelStringFor(snapshot.getLogLevel()));
    resultConfig.putBoolean("preloading", snapshot.getPreloading().getEnabled());
    resultConfig.putBoolean("telemetry", snapshot.getTelemetry().getEnabled());
    resultConfig.putArray("allowedMessageOrigins",
        Arguments.fromList(new ArrayList<>(snapshot.getAllowedMessageOrigins())));

    return resultConfig;
  }

  /**
   * Resolves with the applied configuration, in the getConfig shape, after
   * ShopifyCheckout.configure has run and checkoutConfig is updated.
   * React Native runs these calls on one thread, so they apply and resolve in call order.
   * Rejects, and applies nothing, when an input cannot be read.
   */
  @ReactMethod
  public void setConfig(ReadableMap config, Promise promise) {
    try {
      applyConfig(config);
    } catch (RuntimeException exception) {
      promise.reject("set_config_failed", exception.getMessage(), exception);
      return;
    }
    promise.resolve(getConfig());
  }

  private void applyConfig(ReadableMap config) {
    // Read every input before configure. A bad input then throws before the SDK changes anything.
    boolean hasTitle = config.hasKey("title");
    String title = hasTitle ? config.getString("title") : null;
    Preloading preloading = config.hasKey("preloading")
        ? new Preloading(config.getBoolean("preloading"))
        : null;
    Set<String> allowedMessageOrigins = config.hasKey("allowedMessageOrigins")
        ? toStringSet(config.getArray("allowedMessageOrigins"))
        : null;
    Telemetry telemetry = config.hasKey("telemetry")
        ? new Telemetry(config.getBoolean("telemetry"))
        : null;
    LogLevel logLevel = config.hasKey("logLevel") ? logLevelFor(config.getString("logLevel")) : null;
    CheckoutAppearance appearance =
        CheckoutAppearanceConfiguration.update(ShopifyCheckout.getConfiguration().getAppearance(), config);

    ShopifyCheckout.configure(configuration -> {
      if (hasTitle) {
        configuration.setTitle(title);
      }
      if (preloading != null) {
        configuration.setPreloading(preloading);
      }
      if (allowedMessageOrigins != null) {
        configuration.setAllowedMessageOrigins(allowedMessageOrigins);
      }
      if (telemetry != null) {
        configuration.setTelemetry(telemetry);
      }
      if (logLevel != null) {
        configuration.setLogLevel(logLevel);
      }
      configuration.setAppearance(appearance);
    });

    checkoutConfig = ShopifyCheckout.getConfiguration();
  }

  private static Set<String> toStringSet(ReadableArray array) {
    Set<String> values = new HashSet<>();
    if (array == null) {
      return values;
    }
    for (int i = 0; i < array.size(); i++) {
      String value = array.getString(i);
      if (value != null) {
        values.add(value);
      }
    }
    return values;
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  public boolean configureAcceleratedCheckouts(
      String storefrontDomain,
      String storefrontAccessToken,
      String customerEmail,
      String customerPhoneNumber,
      String customerAccessToken,
      String applePayMerchantIdentifier,
      ReadableArray applyPayContactFields,
      ReadableArray supportedShippingCountries) {
    // Accelerated checkouts not supported on Android
    return false;
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  public boolean isAcceleratedCheckoutAvailable() {
    // Accelerated checkouts not supported on Android
    return false;
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  public boolean isApplePayAvailable() {
    // Apple Pay not available on Android
    return false;
  }

  @ReactMethod
  public void respondToGeolocationRequest(boolean allow) {
    UiThreadUtil.runOnUiThread(() -> {
      if (checkoutListener != null) {
        checkoutListener.invokeGeolocationCallback(allow);
      }
    });
  }

  // Private

  static LogLevel logLevelFor(String logLevel) {
    if (logLevel == null) {
      return null;
    }

    try {
      return LogLevel.valueOf(logLevel.toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException unknownLogLevel) {
      return null;
    }
  }

  static String logLevelStringFor(LogLevel logLevel) {
    return logLevel.name().toLowerCase(Locale.ROOT);
  }
}

package com.shopify.reactnative.checkoutkit;

import android.app.Activity;
import android.util.Log;
import androidx.activity.ComponentActivity;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.shopify.checkoutkit.NativeShopifyCheckoutKitSpec;
import com.shopify.checkoutkit.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class ShopifyCheckoutKitModule extends NativeShopifyCheckoutKitSpec {
  private static final String TAG = "checkout_kit";
  private static final String LOG_PREFIX = "checkout_kit";
  private static final String LOG_SCOPE = "sdk";

  public static Configuration checkoutConfig = new Configuration();

  private CheckoutKitDialog checkoutSheet;

  private CustomCheckoutListener checkoutListener;

  public ShopifyCheckoutKitModule(ReactApplicationContext reactContext) {
    super(reactContext);

    ShopifyCheckoutKit.configure(configuration -> {
      configuration.setPlatform(new Platform.ReactNative());
      checkoutConfig = configuration;
    });
  }

  @Override
  protected Map<String, Object> getTypedExportedConstants() {
    final Map<String, Object> constants = new HashMap<>();
    constants.put("version", ShopifyCheckoutKit.version);
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
  public void present(String checkoutURL, ReadableArray subscribedMethods) {
    releaseCheckoutListener();

    Activity currentActivity = getCurrentActivity();
    if (currentActivity instanceof ComponentActivity) {
      DispatchHandle dispatch = new DispatchHandle(json -> emitOnDispatch(json));
      CustomCheckoutListener listener = new CustomCheckoutListener(dispatch);
      checkoutListener = listener;

      List<String> methods = new ArrayList<>();
      for (int i = 0; i < subscribedMethods.size(); i++) {
        String method = subscribedMethods.getString(i);
        if (method != null) {
          methods.add(method);
        }
      }
      CheckoutProtocol.Client client = ProtocolRelay.makeClient(methods, dispatch);

      currentActivity.runOnUiThread(() -> {
        if (checkoutListener != listener) {
          return;
        }
        checkoutSheet = ShopifyCheckoutKit.present(checkoutURL, (ComponentActivity) currentActivity,
            listener, client);
      });
    }
  }

  @ReactMethod
  public void dismiss() {
    releaseCheckoutListener();

    if (checkoutSheet != null) {
      checkoutSheet.dismiss();
      checkoutSheet = null;
    }
  }

  private void releaseCheckoutListener() {
    if (checkoutListener != null) {
      checkoutListener.release();
      checkoutListener = null;
    }
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  public WritableMap getConfig() {
    WritableMap resultConfig = Arguments.createMap();

    resultConfig.putString("colorScheme", colorSchemeToString(checkoutConfig.getColorScheme()));
    resultConfig.putString("logLevel", logLevelToString(checkoutConfig.getLogLevel()));

    return resultConfig;
  }

  @ReactMethod
  public void setConfig(ReadableMap config) {
    ShopifyCheckoutKit.configure(configuration -> {
      if (config.hasKey("logLevel")) {
        LogLevel logLevel = getLogLevel(config.getString("logLevel"));
        configuration.setLogLevel(logLevel);
      } else {
        configuration.setLogLevel(LogLevel.ERROR);
      }

      if (config.hasKey("colorScheme")) {
        ColorScheme colorScheme = getColorScheme(Objects.requireNonNull(config.getString("colorScheme")));
        ReadableMap colorsConfig = config.hasKey("colors") ? config.getMap("colors") : null;
        ReadableMap androidConfig = null;

        if (colorsConfig != null && colorsConfig.hasKey("android")) {
          androidConfig = colorsConfig.getMap("android");
        }

        if (this.isValidColorConfig(androidConfig)) {
          ColorScheme colorSchemeWithOverrides = getColors(colorScheme, androidConfig);
          if (colorSchemeWithOverrides != null) {
            configuration.setColorScheme(colorSchemeWithOverrides);
            checkoutConfig = configuration;
            return;
          }
        }

        configuration.setColorScheme(colorScheme);
      }

      checkoutConfig = configuration;
    });
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
    if (checkoutListener != null) {
      checkoutListener.invokeGeolocationCallback(allow);
    }
  }

  // Private

  private ColorScheme getColorScheme(String colorScheme) {
    switch (colorScheme) {
      case "web_default":
        return new ColorScheme.Web();
      case "light":
        return new ColorScheme.Light();
      case "dark":
        return new ColorScheme.Dark();
      case "automatic":
      default:
        return new ColorScheme.Automatic();
    }
  }

  private String colorSchemeToString(ColorScheme colorScheme) {
    return colorScheme.getId();
  }

  private LogLevel getLogLevel(String logLevel) {
    if (logLevel == null) {
      return LogLevel.ERROR;
    }

    switch (logLevel.toLowerCase()) {
      case "debug":
        return LogLevel.DEBUG;
      default:
        return LogLevel.ERROR;
    }
  }

  private String logLevelToString(LogLevel logLevel) {
    if (logLevel == LogLevel.DEBUG) {
      return "debug";
    }
    return "error";
  }

  private boolean isValidColorConfig(ReadableMap config) {
    if (config == null) {
      return false;
    }

    String[] requiredColorKeys = { "backgroundColor", "progressIndicator", "headerTextColor", "headerBackgroundColor" };

    for (String key : requiredColorKeys) {
      if (!config.hasKey(key) || config.getString(key) == null || parseColor(config.getString(key)) == null) {
        return false;
      }
    }

    // closeButtonColor is optional, so we only validate it if it's present
    if (config.hasKey("closeButtonColor") && config.getString("closeButtonColor") != null) {
      if (parseColor(config.getString("closeButtonColor")) == null) {
        return false;
      }
    }

    return true;
  }

  private boolean isValidColorScheme(ColorScheme colorScheme, ReadableMap colorConfig) {
    if (colorConfig == null) {
      return false;
    }

    if (colorScheme instanceof ColorScheme.Automatic) {
      if (!colorConfig.hasKey("light") || !colorConfig.hasKey("dark")) {
        return false;
      }

      boolean validLight = this.isValidColorConfig(colorConfig.getMap("light"));
      boolean validDark = this.isValidColorConfig(colorConfig.getMap("dark"));

      return validLight && validDark;
    }

    return this.isValidColorConfig(colorConfig);
  }

  private Color parseColorFromConfig(ReadableMap config, String colorKey) {
    if (config.hasKey(colorKey)) {
      String colorStr = config.getString(colorKey);
      return parseColor(colorStr);
    }

    return null;
  }

  private Colors createColorsFromConfig(ReadableMap config) {
    if (config == null) {
      return null;
    }

    Color webViewBackground = parseColorFromConfig(config, "backgroundColor");
    Color headerBackground = parseColorFromConfig(config, "headerBackgroundColor");
    Color headerFont = parseColorFromConfig(config, "headerTextColor");
    Color progressIndicator = parseColorFromConfig(config, "progressIndicator");
    Color closeButtonColor = parseColorFromConfig(config, "closeButtonColor");

    if (webViewBackground != null && progressIndicator != null && headerFont != null && headerBackground != null) {
      return new Colors(
          webViewBackground,
          headerBackground,
          headerFont,
          progressIndicator,
          // Parameter allows passing a custom drawable, we'll just support custom color
          // for now
          null,
          closeButtonColor);
    }

    return null;
  }

  private ColorScheme getColors(ColorScheme colorScheme, ReadableMap config) {
    if (!this.isValidColorScheme(colorScheme, config)) {
      return null;
    }

    if (colorScheme instanceof ColorScheme.Automatic && this.isValidColorScheme(colorScheme, config)) {
      Colors lightColors = createColorsFromConfig(config.getMap("light"));
      Colors darkColors = createColorsFromConfig(config.getMap("dark"));

      if (lightColors != null && darkColors != null) {
        ColorScheme.Automatic automaticColorScheme = (ColorScheme.Automatic) colorScheme;
        automaticColorScheme.setLightColors(lightColors);
        automaticColorScheme.setDarkColors(darkColors);
        return automaticColorScheme;
      }
    }

    Colors colors = createColorsFromConfig(config);

    if (colors != null) {
      if (colorScheme instanceof ColorScheme.Light) {
        ((ColorScheme.Light) colorScheme).setColors(colors);
      } else if (colorScheme instanceof ColorScheme.Dark) {
        ((ColorScheme.Dark) colorScheme).setColors(colors);
      } else if (colorScheme instanceof ColorScheme.Web) {
        ((ColorScheme.Web) colorScheme).setColors(colors);
      }
      return colorScheme;
    }

    return null;
  }

  private Color parseColor(String colorStr) {
    try {
      colorStr = colorStr.replace("#", "");

      long color = Long.parseLong(colorStr, 16);

      if (colorStr.length() == 6) {
        // If alpha is not included, assume full opacity
        // "L" is not needed here on the end of the hex value
        color = color | 0xFF000000;
      }

      return new Color.SRGB((int) color);
    } catch (NumberFormatException e) {
      Log.w(TAG, "[" + LOG_PREFIX + ":" + LOG_SCOPE + "] Invalid color string. Default color will be used.");
      return null;
    }
  }
}

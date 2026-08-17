package com.shopify.reactnative.checkoutkit;

import android.app.Activity;
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
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

import org.json.JSONException;
import org.json.JSONObject;

public class ShopifyCheckoutKitModule extends NativeShopifyCheckoutKitSpec {

  /** The JavaScript name for {@link CheckoutAppearance.Storefront}, which has no native id. */
  private static final String STOREFRONT_COLOR_SCHEME = "storefront";

  public static Configuration checkoutConfig = new Configuration();

  private CheckoutHandle checkoutSheet;

  private CustomCheckoutListener checkoutListener;

  private CheckoutPreload checkoutPreload;

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

  @ReactMethod
  public void preload(String checkoutURL, String requestId) {
    if (checkoutPreload != null) {
      checkoutPreload.setListener(null);
      checkoutPreload = null;
    }

    Activity currentActivity = getCurrentActivity();
    if (currentActivity instanceof ComponentActivity) {
      checkoutPreload = ShopifyCheckoutKit.preload(
          checkoutURL,
          (ComponentActivity) currentActivity,
          state -> emitPreloadStateChange(requestId, state));

      if (checkoutPreload == null) {
        emitPreloadStateChange(requestId, PreloadState.Idle.INSTANCE);
      }
    } else {
      emitPreloadStateChange(requestId, PreloadState.Idle.INSTANCE);
    }
  }

  @ReactMethod
  public void invalidateCache() {
    ShopifyCheckoutKit.invalidate();
    checkoutPreload = null;
  }

  private void emitPreloadStateChange(String requestId, PreloadState state) {
    JSONObject event = new JSONObject();

    try {
      event.put("requestId", requestId);

      if (state instanceof PreloadState.Idle) {
        event.put("type", "idle");
      } else if (state instanceof PreloadState.Loading) {
        event.put("type", "loading");
      } else if (state instanceof PreloadState.Ready) {
        event.put("type", "ready");
      } else if (state instanceof PreloadState.Expired) {
        event.put("type", "expired");
      } else if (state instanceof PreloadState.Failed) {
        PreloadState.FailureReason reason = ((PreloadState.Failed) state).getReason();
        event.put("type", "failed");

        if (reason instanceof PreloadState.FailureReason.HttpError) {
          event.put("reason", "httpError");
          event.put("statusCode", ((PreloadState.FailureReason.HttpError) reason).getStatusCode());
        } else if (reason instanceof PreloadState.FailureReason.NavigationFailed) {
          event.put("reason", "navigationFailed");
        } else if (reason instanceof PreloadState.FailureReason.WebContentProcessTerminated) {
          event.put("reason", "webContentProcessTerminated");
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

    emitOnPreloadStateChange(event.toString());
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

    resultConfig.putString("title", checkoutConfig.getTitle());
    resultConfig.putString("colorScheme", colorSchemeStringFor(checkoutConfig.getAppearance()));
    resultConfig.putString("logLevel", logLevelStringFor(checkoutConfig.getLogLevel()));
    resultConfig.putBoolean("preloading", checkoutConfig.getPreloading().getEnabled());

    return resultConfig;
  }

  @ReactMethod
  public void setConfig(ReadableMap config) {
    ShopifyCheckoutKit.configure(configuration -> {
      if (config.hasKey("title")) {
        configuration.setTitle(config.getString("title"));
      }

      if (config.hasKey("preloading")) {
        configuration.setPreloading(new Preloading(config.getBoolean("preloading")));
      }

      if (config.hasKey("logLevel")) {
        LogLevel logLevel = logLevelFor(config.getString("logLevel"));

        if (logLevel != null) {
          configuration.setLogLevel(logLevel);
        }
      }

      if (config.hasKey("colorScheme")) {
        String colorScheme = Objects.requireNonNull(config.getString("colorScheme"));
        ReadableMap colorsConfig = config.hasKey("colors") ? config.getMap("colors") : null;
        ReadableMap androidConfig = null;

        if (colorsConfig != null && colorsConfig.hasKey("android")) {
          androidConfig = colorsConfig.getMap("android");
        }

        CheckoutAppearance appearance = appearanceFor(colorScheme, androidConfig);

        if (appearance != null) {
          configuration.setAppearance(appearance);
        }
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

  static CheckoutAppearance appearanceFor(String colorScheme, ReadableMap androidConfig) {
    if (STOREFRONT_COLOR_SCHEME.equals(colorScheme)) {
      return getStorefrontAppearance(androidConfig);
    }

    ColorScheme scheme = colorSchemeFor(colorScheme);

    if (scheme == null) {
      return null;
    }

    if (isValidColorConfig(androidConfig)) {
      ColorScheme schemeWithOverrides = getColors(scheme, androidConfig);
      if (schemeWithOverrides != null) {
        return new CheckoutAppearance.App(schemeWithOverrides);
      }
    }

    return new CheckoutAppearance.App(scheme);
  }

  private static CheckoutAppearance getStorefrontAppearance(ReadableMap androidConfig) {
    CheckoutAppearance.Storefront storefront = new CheckoutAppearance.Storefront();

    Colors colors = createColorsFromConfig(androidConfig);
    if (colors == null) {
      return storefront;
    }

    return storefront.customize(builder -> {
      builder.withWebViewBackground(colors.getWebViewBackground());
      builder.withHeaderBackground(colors.getHeaderBackground());
      builder.withHeaderFont(colors.getHeaderFont());
      builder.withProgressIndicator(colors.getProgressIndicator());
      Color closeButtonColor = colors.getCloseIconTint();
      if (closeButtonColor != null) {
        builder.withCloseIconTint(closeButtonColor);
      }
    });
  }

  private static ColorScheme colorSchemeFor(String colorScheme) {
    if (colorScheme == null) {
      return null;
    }

    ColorScheme light = new ColorScheme.Light();
    ColorScheme dark = new ColorScheme.Dark();
    ColorScheme automatic = new ColorScheme.Automatic();

    if (colorScheme.equals(light.getId())) {
      return light;
    }

    if (colorScheme.equals(dark.getId())) {
      return dark;
    }

    if (colorScheme.equals(automatic.getId())) {
      return automatic;
    }

    return null;
  }

  static String colorSchemeStringFor(CheckoutAppearance appearance) {
    if (appearance instanceof CheckoutAppearance.App) {
      return ((CheckoutAppearance.App) appearance).getColorScheme().getId();
    }
    return STOREFRONT_COLOR_SCHEME;
  }

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

  private static boolean isValidColorConfig(ReadableMap config) {
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

  private static boolean isValidColorScheme(ColorScheme colorScheme, ReadableMap colorConfig) {
    if (colorConfig == null) {
      return false;
    }

    if (colorScheme instanceof ColorScheme.Automatic) {
      if (!colorConfig.hasKey("light") || !colorConfig.hasKey("dark")) {
        return false;
      }

      boolean validLight = isValidColorConfig(colorConfig.getMap("light"));
      boolean validDark = isValidColorConfig(colorConfig.getMap("dark"));

      return validLight && validDark;
    }

    return isValidColorConfig(colorConfig);
  }

  private static Color parseColorFromConfig(ReadableMap config, String colorKey) {
    if (config.hasKey(colorKey)) {
      String colorStr = config.getString(colorKey);
      return parseColor(colorStr);
    }

    return null;
  }

  private static Colors createColorsFromConfig(ReadableMap config) {
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
          closeButtonColor,
          null,
          null);
    }

    return null;
  }

  private static ColorScheme getColors(ColorScheme colorScheme, ReadableMap config) {
    if (!isValidColorScheme(colorScheme, config)) {
      return null;
    }

    if (colorScheme instanceof ColorScheme.Automatic && isValidColorScheme(colorScheme, config)) {
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
      }
      return colorScheme;
    }

    return null;
  }

  private static Color parseColor(String colorStr) {
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
      System.out.println("Warning: Invalid color string. Default color will be used.");
      return null;
    }
  }
}

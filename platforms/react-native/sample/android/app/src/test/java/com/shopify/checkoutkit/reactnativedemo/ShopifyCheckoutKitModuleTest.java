package com.shopify.checkoutkit.reactnativedemo;

import android.webkit.GeolocationPermissions;

import androidx.activity.ComponentActivity;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.JavaOnlyArray;
import com.facebook.react.bridge.JavaOnlyMap;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.shopify.checkoutkit.CheckoutAppearance;
import com.shopify.checkoutkit.CheckoutErrorCode;
import com.shopify.checkoutkit.CheckoutException;
import com.shopify.checkoutkit.ShopifyCheckoutKit;
import com.shopify.checkoutkit.LogLevel;
import com.shopify.checkoutkit.Preloading;
import com.shopify.reactnative.checkoutkit.ShopifyCheckoutKitModule;
import com.shopify.reactnative.checkoutkit.CustomCheckoutListener;
import com.shopify.reactnative.checkoutkit.DispatchCallback;

import java.util.Locale;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.robolectric.RobolectricTestRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;



@RunWith(RobolectricTestRunner.class)
public class ShopifyCheckoutKitModuleTest {
  @Mock
  private ReactApplicationContext mockReactContext;
  @Mock
  private ComponentActivity mockComponentActivity;
  @Captor
  ArgumentCaptor<Runnable> runnableCaptor;
  @Captor
  private ArgumentCaptor<String> stringCaptor;

  private ShopifyCheckoutKitModule shopifyCheckoutKitModule;
  private AutoCloseable mocks;

  // Store initial configuration to restore after each test
  private CheckoutAppearance initialAppearance;
  private LogLevel initialLogLevel;
  private Preloading initialPreloading;

  // Mock for Arguments.createMap() to avoid native library loading
  private MockedStatic<Arguments> mockedArguments;

  // Test constants for color configuration
  private static final String BACKGROUND_COLOR = "#FFFFFF";
  private static final String PROGRESS_INDICATOR = "#000000";
  private static final String HEADER_BACKGROUND_COLOR = "#FFFFFF";
  private static final String HEADER_TEXT_COLOR = "#000000";

  // Dark theme colors
  private static final String DARK_BACKGROUND_COLOR = "#000000";
  private static final String DARK_PROGRESS_INDICATOR = "#FFFFFF";
  private static final String DARK_HEADER_BACKGROUND_COLOR = "#000000";
  private static final String DARK_HEADER_TEXT_COLOR = "#FFFFFF";

  @Before
  public void setup() {
    mocks = MockitoAnnotations.openMocks(this);
    mockedArguments = Mockito.mockStatic(Arguments.class);
    mockedArguments.when(Arguments::createMap).thenAnswer(invocation -> new JavaOnlyMap());

    when(mockReactContext.getCurrentActivity()).thenReturn(mockComponentActivity);
    shopifyCheckoutKitModule = new ShopifyCheckoutKitModule(mockReactContext);

    // Capture initial configuration state to restore after each test
    initialAppearance = ShopifyCheckoutKitModule.checkoutConfig.getAppearance();
    initialLogLevel = ShopifyCheckoutKitModule.checkoutConfig.getLogLevel();
    initialPreloading = ShopifyCheckoutKitModule.checkoutConfig.getPreloading();
  }

  @After
  public void tearDown() throws Exception {
    // Close mocked static
    if (mockedArguments != null) {
      mockedArguments.close();
    }
    if (mocks != null) {
      mocks.close();
    }

    // Reset configuration to initial state after each test
    ShopifyCheckoutKit.configure(configuration -> {
      configuration.setAppearance(initialAppearance);
      configuration.setLogLevel(initialLogLevel);
      configuration.setPreloading(initialPreloading);
      ShopifyCheckoutKitModule.checkoutConfig = configuration;
    });
  }

  /**
   * Core Methods
   */

  @Test
  public void testCanPresentCheckout() {
    try (MockedStatic<ShopifyCheckoutKit> mockedShopifyCheckoutKit = Mockito
        .mockStatic(ShopifyCheckoutKit.class)) {
      String checkoutUrl = "https://shopify.com";
      // An empty JavaOnlyArray stands in for "no UCP methods subscribed",
      // matching the JS-side default of `protocol = {}`.
      shopifyCheckoutKitModule.present(checkoutUrl, new JavaOnlyArray());

      verify(mockComponentActivity).runOnUiThread(runnableCaptor.capture());
      runnableCaptor.getValue().run();

      mockedShopifyCheckoutKit.verify(() -> {
        // (url, activity, checkoutListener, protocolClient) — the protocol
        // client is the new fourth arg from `ShopifyCheckoutKit.present`
        // when UCP wiring is enabled.
        ShopifyCheckoutKit.present(eq(checkoutUrl), any(), any(), any());
      });
    }
  }

  @Test
  public void testCanPreloadCheckout() {
    try (MockedStatic<ShopifyCheckoutKit> mockedShopifyCheckoutKit = Mockito
        .mockStatic(ShopifyCheckoutKit.class)) {
      String checkoutUrl = "https://shopify.com";

      shopifyCheckoutKitModule.preload(checkoutUrl);

      mockedShopifyCheckoutKit.verify(() -> ShopifyCheckoutKit.preload(checkoutUrl, mockComponentActivity));
    }
  }

  @Test
  public void testPreloadDoesNothingWithoutComponentActivity() {
    when(mockReactContext.getCurrentActivity()).thenReturn(null);

    try (MockedStatic<ShopifyCheckoutKit> mockedShopifyCheckoutKit = Mockito
        .mockStatic(ShopifyCheckoutKit.class)) {
      shopifyCheckoutKitModule.preload("https://shopify.com");

      mockedShopifyCheckoutKit.verifyNoInteractions();
    }
  }

  @Test
  public void testCanInvalidatePreloadCache() {
    try (MockedStatic<ShopifyCheckoutKit> mockedShopifyCheckoutKit = Mockito
        .mockStatic(ShopifyCheckoutKit.class)) {
      shopifyCheckoutKitModule.invalidateCache();

      mockedShopifyCheckoutKit.verify(ShopifyCheckoutKit::invalidate);
    }
  }

  @Test
  public void testPresentForwardsOnCloseCallback() {
    DispatchCallback dispatch = mock(DispatchCallback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onCheckoutDismissed();

    verify(dispatch).invoke(stringCaptor.capture());
    assertThat(stringCaptor.getValue()).contains("\"type\":\"close\"");
  }

  @Test
  public void testOnCloseCallbackIsSingleShot() {
    DispatchCallback dispatch = mock(DispatchCallback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onCheckoutDismissed();
    processor.onCheckoutDismissed();

    verify(dispatch, times(1)).invoke(anyString());
  }

  @Test
  public void testReleaseDropsPendingDispatchCallback() {
    DispatchCallback dispatch = mock(DispatchCallback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.release();
    processor.onCheckoutDismissed();

    verify(dispatch, never()).invoke(anyString());
  }

  @Test
  public void testReleaseClearsPendingGeolocationCallback() {
    DispatchCallback dispatch = mock(DispatchCallback.class);
    GeolocationPermissions.Callback permissionsCallback = mock(GeolocationPermissions.Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onGeolocationPermissionsShowPrompt("https://shopify.com", permissionsCallback);
    processor.release();
    processor.invokeGeolocationCallback(true);

    verify(permissionsCallback, never()).invoke(anyString(), anyBoolean(), anyBoolean());
  }

  @Test
  public void testTerminalEventClearsPendingGeolocationCallback() {
    DispatchCallback dispatch = mock(DispatchCallback.class);
    GeolocationPermissions.Callback permissionsCallback = mock(GeolocationPermissions.Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onGeolocationPermissionsShowPrompt("https://shopify.com", permissionsCallback);
    processor.onCheckoutDismissed();
    processor.invokeGeolocationCallback(true);

    verify(permissionsCallback, never()).invoke(anyString(), anyBoolean(), anyBoolean());
  }

  @Test
  public void testGeolocationDispatchesEnvelopeWithOrigin() {
    DispatchCallback dispatch = mock(DispatchCallback.class);
    GeolocationPermissions.Callback permissionsCallback = mock(GeolocationPermissions.Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onGeolocationPermissionsShowPrompt("https://shopify.com", permissionsCallback);

    verify(dispatch).invoke(stringCaptor.capture());
    assertThat(stringCaptor.getValue())
        .contains("\"type\":\"geolocationRequest\"", "\"origin\":\"https://shopify.com\"");
  }

  @Test
  public void testGeolocationDispatchIsMultiShot() {
    DispatchCallback dispatch = mock(DispatchCallback.class);
    GeolocationPermissions.Callback permissionsCallback = mock(GeolocationPermissions.Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onGeolocationPermissionsShowPrompt("https://shopify.com", permissionsCallback);
    processor.onGeolocationPermissionsShowPrompt("https://shopify.com", permissionsCallback);

    verify(dispatch, times(2)).invoke(anyString());
  }

  /**
   * Module name and version
   */

  @Test
  public void testModuleName() {
    assertThat(shopifyCheckoutKitModule.getName())
        .isEqualTo("ShopifyCheckoutKit");
  }

  @Test
  public void testConstants() {
    assertThat(shopifyCheckoutKitModule.getConstants())
        .isNotNull()
        .containsKey("version");
  }

  /**
   * Configuration
   */

  @Test
  public void testHasCorrectDefaultConfiguration() {
    // Test that the module starts with sensible defaults
    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("storefront");
    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getPreloading().getEnabled())
        .isTrue();
  }

  @Test
  public void testCanSetDarkColorScheme() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("colorScheme", "dark");

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("dark");
  }

  @Test
  public void testUnknownColorSchemeKeepsTheCurrentAppearance() {
    JavaOnlyMap darkConfig = new JavaOnlyMap();
    darkConfig.putString("colorScheme", "dark");
    shopifyCheckoutKitModule.setConfig(darkConfig);

    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("colorScheme", "sepia");

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("dark");
  }

  @Test
  public void testUnknownColorSchemeKeepsTheNativeDefaultAppearance() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("colorScheme", "sepia");

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("storefront");
  }

  @Test
  public void testOnlyInstallsMessageRejectedCallbackWhenRequested() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putArray("allowedMessageOrigins", JavaOnlyArray.from(List.of("https://example.com")));

    shopifyCheckoutKitModule.setConfig(config);
    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getOnMessageRejected()).isNull();

    config.putBoolean("hasMessageRejectedCallback", true);
    shopifyCheckoutKitModule.setConfig(config);
    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getOnMessageRejected()).isNotNull();

    config.putBoolean("hasMessageRejectedCallback", false);
    shopifyCheckoutKitModule.setConfig(config);
    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getOnMessageRejected()).isNull();
  }

  @Test
  public void testCanConfigureLightColorSchemeWithValidColors() {
    JavaOnlyMap androidColors = createValidLightColors();
    JavaOnlyMap config = createConfigWithAndroidColors("light", androidColors);

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("light");
  }

  @Test
  public void testCanConfigureDarkColorSchemeWithValidColors() {
    JavaOnlyMap androidColors = createValidDarkColors();
    JavaOnlyMap config = createConfigWithAndroidColors("dark", androidColors);

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("dark");
  }

  @Test
  public void testCanConfigureAutomaticColorSchemeWithLightAndDarkColors() {
    JavaOnlyMap lightColors = createValidLightColors();
    JavaOnlyMap darkColors = createValidDarkColors();

    JavaOnlyMap androidColors = new JavaOnlyMap();
    androidColors.putMap("light", lightColors);
    androidColors.putMap("dark", darkColors);

    JavaOnlyMap colorsConfig = new JavaOnlyMap();
    colorsConfig.putMap("android", androidColors);

    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("colorScheme", "automatic");
    config.putMap("colors", colorsConfig);

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("automatic");
  }

  @Test
  public void testInvalidColorConfigurationFallsBackToBasicScheme() {
    JavaOnlyMap androidColors = new JavaOnlyMap();
    androidColors.putString("backgroundColor", "invalid-color");
    androidColors.putString("progressIndicator", PROGRESS_INDICATOR);
    androidColors.putString("headerBackgroundColor", HEADER_BACKGROUND_COLOR);
    androidColors.putString("headerTextColor", HEADER_TEXT_COLOR);

    JavaOnlyMap config = createConfigWithAndroidColors("light", androidColors);

    // Should not throw exception
    shopifyCheckoutKitModule.setConfig(config);

    // Should fall back to basic light scheme without custom colors
    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("light");
  }

  @Test
  public void testPartialColorConfigurationIsRejected() {
    JavaOnlyMap androidColors = new JavaOnlyMap();
    androidColors.putString("backgroundColor", BACKGROUND_COLOR);
    // Missing other required colors

    JavaOnlyMap config = createConfigWithAndroidColors("light", androidColors);

    shopifyCheckoutKitModule.setConfig(config);

    // Should fall back to basic scheme since colors are incomplete
    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("light");
  }

  @Test
  public void testCanSetConfigWithCloseButtonColor() {
    JavaOnlyMap androidColors = createValidLightColors();
    androidColors.putString("closeButtonColor", "#FF0000");

    JavaOnlyMap config = createConfigWithAndroidColors("light", androidColors);

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("light");
  }

  @Test
  public void testCanSetConfigWithMissingCloseButtonColor() {
    // Missing closeButtonColor - should not crash
    JavaOnlyMap androidColors = createValidLightColors();
    JavaOnlyMap config = createConfigWithAndroidColors("light", androidColors);

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("light");
  }

  @Test
  public void testCanSetConfigWithInvalidCloseButtonColor() {
    JavaOnlyMap androidColors = createValidLightColors();
    androidColors.putString("closeButtonColor", "invalid-color");
    JavaOnlyMap config = createConfigWithAndroidColors("light", androidColors);

    // The method should not throw an exception when given invalid close button
    // color
    shopifyCheckoutKitModule.setConfig(config);

    // Verify the color scheme was set correctly despite invalid close button color
    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("light");
  }

  /**
   * Log Level Configuration
   */

  @Test
  public void testCanSetLogLevelDebug() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("logLevel", "debug");

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getLogLevel())
        .isEqualTo(LogLevel.DEBUG);
  }

  @Test
  public void testCanSetLogLevelError() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("logLevel", "error");

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getLogLevel())
        .isEqualTo(LogLevel.ERROR);
  }

  @Test
  public void testCanSetLogLevelNone() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("logLevel", "none");

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getLogLevel())
        .isEqualTo(LogLevel.NONE);
  }

  @Test
  public void testCanSetLogLevelWarn() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("logLevel", "warn");

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getLogLevel())
        .isEqualTo(LogLevel.WARN);
  }

  @Test
  public void testCanSetEveryNativeLogLevel() {
    for (LogLevel logLevel : LogLevel.values()) {
      JavaOnlyMap config = new JavaOnlyMap();
      config.putString("logLevel", logLevel.name().toLowerCase(Locale.ROOT));

      shopifyCheckoutKitModule.setConfig(config);

      assertThat(ShopifyCheckoutKitModule.checkoutConfig.getLogLevel())
          .isEqualTo(logLevel);
    }
  }

  @Test
  public void testInvalidLogLevelKeepsTheCurrentLevel() {
    JavaOnlyMap debugConfig = new JavaOnlyMap();
    debugConfig.putString("logLevel", "debug");
    shopifyCheckoutKitModule.setConfig(debugConfig);

    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("logLevel", "invalid");

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getLogLevel())
        .isEqualTo(LogLevel.DEBUG);
  }

  @Test
  public void testLogLevelHandlesUppercaseDebug() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("logLevel", "DEBUG");

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getLogLevel())
        .isEqualTo(LogLevel.DEBUG);
  }

  @Test
  public void testLogLevelHandlesMixedCaseDebug() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("logLevel", "Debug");

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getLogLevel())
        .isEqualTo(LogLevel.DEBUG);
  }

  @Test
  public void testLogLevelHandlesUppercaseError() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("logLevel", "ERROR");

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getLogLevel())
        .isEqualTo(LogLevel.ERROR);
  }

  @Test
  public void testSetConfigWithoutLogLevelKeepsTheNativeLevel() {
    JavaOnlyMap debugConfig = new JavaOnlyMap();
    debugConfig.putString("logLevel", "debug");
    shopifyCheckoutKitModule.setConfig(debugConfig);

    JavaOnlyMap config = new JavaOnlyMap();

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getLogLevel())
        .isEqualTo(LogLevel.DEBUG);
  }

  @Test
  public void testCanDisablePreloading() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putBoolean("preloading", false);

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getPreloading().getEnabled())
        .isFalse();
  }

  @Test
  public void testGetConfigIncludesPreloading() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putBoolean("preloading", false);

    shopifyCheckoutKitModule.setConfig(config);

    WritableMap result = shopifyCheckoutKitModule.getConfig();

    assertThat(result).isNotNull();
    assertThat(result.getBoolean("preloading")).isFalse();
  }

  @Test
  public void testGetConfigReturnsDebugForDebugLogLevel() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("logLevel", "debug");

    shopifyCheckoutKitModule.setConfig(config);

    WritableMap result = shopifyCheckoutKitModule.getConfig();

    assertThat(result).isNotNull();
    assertThat(result.getString("logLevel")).isEqualTo("debug");
  }

  @Test
  public void testGetConfigReturnsErrorForErrorLogLevel() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("logLevel", "error");

    shopifyCheckoutKitModule.setConfig(config);

    WritableMap result = shopifyCheckoutKitModule.getConfig();

    assertThat(result).isNotNull();
    assertThat(result.getString("logLevel")).isEqualTo("error");
  }

  @Test
  public void testGetConfigReturnsNoneForNoneLogLevel() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("logLevel", "none");

    shopifyCheckoutKitModule.setConfig(config);

    WritableMap result = shopifyCheckoutKitModule.getConfig();

    assertThat(result).isNotNull();
    assertThat(result.getString("logLevel")).isEqualTo("none");
  }

  @Test
  public void testGetConfigReportsEveryNativeLogLevel() {
    for (LogLevel logLevel : LogLevel.values()) {
      String name = logLevel.name().toLowerCase(Locale.ROOT);
      JavaOnlyMap config = new JavaOnlyMap();
      config.putString("logLevel", name);

      shopifyCheckoutKitModule.setConfig(config);

      assertThat(shopifyCheckoutKitModule.getConfig().getString("logLevel"))
          .isEqualTo(name);
    }
  }

  @Test
  public void testGetConfigKeepsTheCurrentLevelForInvalidLogLevel() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("logLevel", "invalid");

    shopifyCheckoutKitModule.setConfig(config);

    WritableMap result = shopifyCheckoutKitModule.getConfig();

    assertThat(result).isNotNull();
    assertThat(result.getString("logLevel")).isEqualTo("warn");
  }

  @Test
  public void testGetConfigReturnsTheNativeDefaultLogLevel() {
    WritableMap result = shopifyCheckoutKitModule.getConfig();

    assertThat(result).isNotNull();
    assertThat(result.getString("logLevel")).isEqualTo("warn");
  }

  /**
   * Events
   */

  /**
   * Errors
   */

  @Test
  public void testCanProcessCheckoutExpiredErrors() {
    DispatchCallback dispatch = mock(DispatchCallback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onCheckoutFailed(cartExpired());

    verify(dispatch).invoke(stringCaptor.capture());

    assertThat(stringCaptor.getValue())
        .contains("\"type\":\"fail\"", "\"code\":\"cart_expired\"", "\"message\":\"Cart has expired\"")
        .doesNotContain("__typename", "statusCode");
  }

  @Test
  public void testCanProcessClientErrors() {
    DispatchCallback dispatch = mock(DispatchCallback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onCheckoutFailed(new CheckoutException(
        CheckoutErrorCode.CUSTOMER_ACCOUNT_REQUIRED, "Customer account required"));

    verify(dispatch).invoke(stringCaptor.capture());

    assertThat(stringCaptor.getValue())
        .contains("\"type\":\"fail\"", "\"code\":\"customer_account_required\"",
            "\"message\":\"Customer account required\"")
        .doesNotContain("__typename", "statusCode");
  }

  @Test
  public void testCanProcessHttpErrors() {
    DispatchCallback dispatch = mock(DispatchCallback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onCheckoutFailed(new CheckoutException(
        CheckoutErrorCode.HTTP_ERROR, "Not Found", 404));

    verify(dispatch).invoke(stringCaptor.capture());

    assertThat(stringCaptor.getValue())
        .contains("\"type\":\"fail\"", "\"code\":\"http_error\"", "\"message\":\"Not Found\"",
            "\"statusCode\":404")
        .doesNotContain("__typename");
  }

  @Test
  public void testEveryErrorCodeSerialisesAsLowerSnakeCase() {
    for (CheckoutErrorCode code : CheckoutErrorCode.values()) {
      DispatchCallback dispatch = mock(DispatchCallback.class);
      CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);
      ArgumentCaptor<String> envelopeCaptor = ArgumentCaptor.forClass(String.class);

      processor.onCheckoutFailed(new CheckoutException(code, "failed"));

      verify(dispatch).invoke(envelopeCaptor.capture());
      assertThat(envelopeCaptor.getValue())
          .contains("\"code\":\"" + code.name().toLowerCase(Locale.ROOT) + "\"");
    }
  }

  @Test
  public void testOnFailCallbackIsSingleShot() {
    DispatchCallback dispatch = mock(DispatchCallback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onCheckoutFailed(cartExpired());
    processor.onCheckoutFailed(cartExpired());

    verify(dispatch, times(1)).invoke(anyString());
  }

  /**
   * Integration
   */

  @Test
  public void testCompleteConfigurationAndEventFlow() {
    // Set up configuration
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("colorScheme", "dark");

    shopifyCheckoutKitModule.setConfig(config);

    // Verify configuration was applied
    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("dark");
  }

  /**
   * Helpers
   */

  private static CheckoutException cartExpired() {
    return new CheckoutException(CheckoutErrorCode.CART_EXPIRED, "Cart has expired");
  }

  private static String colorSchemeIdOf(CheckoutAppearance appearance) {
    if (appearance instanceof CheckoutAppearance.App) {
      return ((CheckoutAppearance.App) appearance).getColorScheme().getId();
    }
    return "storefront";
  }

  private JavaOnlyMap createValidLightColors() {
    JavaOnlyMap colors = new JavaOnlyMap();
    colors.putString("backgroundColor", BACKGROUND_COLOR);
    colors.putString("progressIndicator", PROGRESS_INDICATOR);
    colors.putString("headerBackgroundColor", HEADER_BACKGROUND_COLOR);
    colors.putString("headerTextColor", HEADER_TEXT_COLOR);
    return colors;
  }

  private JavaOnlyMap createValidDarkColors() {
    JavaOnlyMap colors = new JavaOnlyMap();
    colors.putString("backgroundColor", DARK_BACKGROUND_COLOR);
    colors.putString("progressIndicator", DARK_PROGRESS_INDICATOR);
    colors.putString("headerBackgroundColor", DARK_HEADER_BACKGROUND_COLOR);
    colors.putString("headerTextColor", DARK_HEADER_TEXT_COLOR);
    return colors;
  }

  private JavaOnlyMap createConfigWithAndroidColors(String colorScheme, JavaOnlyMap androidColors) {
    JavaOnlyMap colorsConfig = new JavaOnlyMap();
    colorsConfig.putMap("android", androidColors);

    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("colorScheme", colorScheme);
    config.putMap("colors", colorsConfig);
    return config;
  }

  private static class PromiseMock implements Promise {
    public Object resolvedValue;
    public String rejectedCode;
    public String rejectedMessage;
    public Throwable rejectedThrowable;

    @Override
    public void resolve(Object value) {
      resolvedValue = value;
    }

    @Override
    public void reject(String code, String message) {
      rejectedCode = code;
      rejectedMessage = message;
    }

    @Override
    public void reject(String code, Throwable throwable) {
      rejectedCode = code;
      rejectedThrowable = throwable;
    }

    @Override
    public void reject(String code, String message, Throwable throwable) {
      rejectedCode = code;
      rejectedMessage = message;
      rejectedThrowable = throwable;
    }

    @Override
    public void reject(Throwable throwable) {
      rejectedThrowable = throwable;
    }

    @Override
    public void reject(Throwable throwable, WritableMap userInfo) {
      rejectedThrowable = throwable;
    }

    @Override
    public void reject(String code, WritableMap userInfo) {
      rejectedCode = code;
    }

    @Override
    public void reject(String code, Throwable throwable, WritableMap userInfo) {
      rejectedCode = code;
      rejectedThrowable = throwable;
    }

    @Override
    public void reject(String code, String message, WritableMap userInfo) {
      rejectedCode = code;
      rejectedMessage = message;
    }

    @Override
    public void reject(String code, String message, Throwable throwable, WritableMap userInfo) {
      rejectedCode = code;
      rejectedMessage = message;
      rejectedThrowable = throwable;
    }

    @Override
    public void reject(String message) {
      rejectedMessage = message;
    }
  }
}

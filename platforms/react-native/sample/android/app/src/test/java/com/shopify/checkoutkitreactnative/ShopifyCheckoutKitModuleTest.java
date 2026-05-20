package com.shopify.checkoutkitreactnative;

import android.webkit.GeolocationPermissions;

import androidx.activity.ComponentActivity;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.JavaOnlyMap;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.shopify.checkoutkit.CheckoutException;
import com.shopify.checkoutkit.CheckoutExpiredException;
import com.shopify.checkoutkit.CheckoutKitException;
import com.shopify.checkoutkit.ClientException;
import com.shopify.checkoutkit.ConfigurationException;
import com.shopify.checkoutkit.HttpException;
import com.shopify.checkoutkit.ShopifyCheckoutKit;
import com.shopify.checkoutkit.ColorScheme;
import com.shopify.checkoutkit.LogLevel;
import com.shopify.reactnative.checkoutkit.ShopifyCheckoutKitModule;
import com.shopify.reactnative.checkoutkit.CustomCheckoutListener;

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
  @Mock
  private DeviceEventManagerModule.RCTDeviceEventEmitter mockEventEmitter;

  @Captor
  ArgumentCaptor<Runnable> runnableCaptor;
  @Captor
  private ArgumentCaptor<String> stringCaptor;

  private ShopifyCheckoutKitModule shopifyCheckoutKitModule;
  private AutoCloseable mocks;

  // Store initial configuration to restore after each test
  private ColorScheme initialColorScheme;
  private LogLevel initialLogLevel;

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
    // Note: the old `CustomCheckoutListener` used `reactContext.getJSModule(...)`
    // to emit DeviceEventManagerModule events. Both the field and the method
    // call are gone now, replaced by the per-`present()` dispatcher callback,
    // so no `getJSModule(...)` stub is required here. `mockEventEmitter` is
    // still referenced from a few `verify(..., never()).emit(...)` assertions
    // below that defensively confirm the legacy emit path stays dead.
    shopifyCheckoutKitModule = new ShopifyCheckoutKitModule(mockReactContext);

    // Capture initial configuration state to restore after each test
    initialColorScheme = ShopifyCheckoutKitModule.checkoutConfig.getColorScheme();
    initialLogLevel = ShopifyCheckoutKitModule.checkoutConfig.getLogLevel();
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
      configuration.setColorScheme(initialColorScheme);
      configuration.setLogLevel(initialLogLevel);
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
      shopifyCheckoutKitModule.present(checkoutUrl, null);

      verify(mockComponentActivity).runOnUiThread(runnableCaptor.capture());
      runnableCaptor.getValue().run();

      mockedShopifyCheckoutKit.verify(() -> {
        ShopifyCheckoutKit.present(eq(checkoutUrl), any(), any());
      });
    }
  }

  @Test
  public void testPresentForwardsOnCloseCallback() {
    Callback dispatch = mock(Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onCheckoutCanceled();

    ArgumentCaptor<Object[]> args = ArgumentCaptor.forClass(Object[].class);
    verify(dispatch).invoke(args.capture());
    assertThat((String) args.getValue()[0]).contains("\"type\":\"close\"");
  }

  @Test
  public void testOnCloseCallbackIsSingleShot() {
    Callback dispatch = mock(Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onCheckoutCanceled();
    processor.onCheckoutCanceled();

    verify(dispatch, times(1)).invoke(any(Object[].class));
  }

  @Test
  public void testReleaseDropsPendingDispatchCallback() {
    Callback dispatch = mock(Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.release();
    processor.onCheckoutCanceled();

    verify(dispatch, never()).invoke(any(Object[].class));
  }

  @Test
  public void testReleaseClearsPendingGeolocationCallback() {
    Callback dispatch = mock(Callback.class);
    GeolocationPermissions.Callback permissionsCallback = mock(GeolocationPermissions.Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onGeolocationPermissionsShowPrompt("https://shopify.com", permissionsCallback);
    processor.release();
    processor.invokeGeolocationCallback(true);

    verify(permissionsCallback, never()).invoke(anyString(), anyBoolean(), anyBoolean());
  }

  @Test
  public void testTerminalEventClearsPendingGeolocationCallback() {
    Callback dispatch = mock(Callback.class);
    GeolocationPermissions.Callback permissionsCallback = mock(GeolocationPermissions.Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onGeolocationPermissionsShowPrompt("https://shopify.com", permissionsCallback);
    processor.onCheckoutCanceled();
    processor.invokeGeolocationCallback(true);

    verify(permissionsCallback, never()).invoke(anyString(), anyBoolean(), anyBoolean());
  }

  @Test
  public void testGeolocationDispatchesEnvelopeWithOrigin() {
    Callback dispatch = mock(Callback.class);
    GeolocationPermissions.Callback permissionsCallback = mock(GeolocationPermissions.Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onGeolocationPermissionsShowPrompt("https://shopify.com", permissionsCallback);

    ArgumentCaptor<Object[]> args = ArgumentCaptor.forClass(Object[].class);
    verify(dispatch).invoke(args.capture());
    assertThat((String) args.getValue()[0])
        .contains("\"type\":\"geolocationRequest\"", "\"origin\":\"https://shopify.com\"");
    verify(mockEventEmitter, never()).emit(eq("geolocationRequest"), any());
  }

  @Test
  public void testGeolocationDispatchIsMultiShot() {
    Callback dispatch = mock(Callback.class);
    GeolocationPermissions.Callback permissionsCallback = mock(GeolocationPermissions.Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onGeolocationPermissionsShowPrompt("https://shopify.com", permissionsCallback);
    processor.onGeolocationPermissionsShowPrompt("https://shopify.com", permissionsCallback);

    verify(dispatch, times(2)).invoke(any(Object[].class));
  }

  @Test
  public void testGeolocationWithNoDispatchCallbackDoesNotInvoke() {
    GeolocationPermissions.Callback permissionsCallback = mock(GeolocationPermissions.Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(null);

    processor.onGeolocationPermissionsShowPrompt("https://shopify.com", permissionsCallback);

    verify(mockEventEmitter, never()).emit(eq("geolocationRequest"), any());
  }

  @Test
  public void testCheckoutCanceledWithNoDispatchCallbackDoesNotEmitCloseEvent() {
    CustomCheckoutListener processor = new CustomCheckoutListener(null);

    processor.onCheckoutCanceled();

    verify(mockEventEmitter, never()).emit(eq("close"), any());
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
    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getColorScheme().getId())
        .isEqualTo("automatic");
  }

  @Test
  public void testCanSetDarkColorScheme() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("colorScheme", "dark");

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getColorScheme().getId())
        .isEqualTo("dark");
  }

  @Test
  public void testCanConfigureLightColorSchemeWithValidColors() {
    JavaOnlyMap androidColors = createValidLightColors();
    JavaOnlyMap config = createConfigWithAndroidColors("light", androidColors);

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getColorScheme().getId())
        .isEqualTo("light");
  }

  @Test
  public void testCanConfigureDarkColorSchemeWithValidColors() {
    JavaOnlyMap androidColors = createValidDarkColors();
    JavaOnlyMap config = createConfigWithAndroidColors("dark", androidColors);

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getColorScheme().getId())
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

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getColorScheme().getId())
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
    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getColorScheme().getId())
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
    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getColorScheme().getId())
        .isEqualTo("light");
  }

  @Test
  public void testCanSetConfigWithCloseButtonColor() {
    JavaOnlyMap androidColors = createValidLightColors();
    androidColors.putString("closeButtonColor", "#FF0000");

    JavaOnlyMap config = createConfigWithAndroidColors("light", androidColors);

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getColorScheme().getId())
        .isEqualTo("light");
  }

  @Test
  public void testCanSetConfigWithMissingCloseButtonColor() {
    // Missing closeButtonColor - should not crash
    JavaOnlyMap androidColors = createValidLightColors();
    JavaOnlyMap config = createConfigWithAndroidColors("light", androidColors);

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getColorScheme().getId())
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
    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getColorScheme().getId())
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

    // "none" maps to ERROR on Android (closest equivalent)
    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getLogLevel())
        .isEqualTo(LogLevel.ERROR);
  }

  @Test
  public void testInvalidLogLevelDefaultsToError() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("logLevel", "invalid");

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getLogLevel())
        .isEqualTo(LogLevel.ERROR);
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
  public void testSetConfigWithoutLogLevelDefaultsToError() {
    JavaOnlyMap config = new JavaOnlyMap();

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getLogLevel())
        .isEqualTo(LogLevel.ERROR);
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
  public void testGetConfigReturnsErrorForNoneLogLevel() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("logLevel", "none");

    shopifyCheckoutKitModule.setConfig(config);

    WritableMap result = shopifyCheckoutKitModule.getConfig();

    assertThat(result).isNotNull();
    assertThat(result.getString("logLevel")).isEqualTo("error");
  }

  @Test
  public void testGetConfigReturnsErrorForInvalidLogLevel() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putString("logLevel", "invalid");

    shopifyCheckoutKitModule.setConfig(config);

    WritableMap result = shopifyCheckoutKitModule.getConfig();

    assertThat(result).isNotNull();
    assertThat(result.getString("logLevel")).isEqualTo("error");
  }

  @Test
  public void testGetConfigReturnsDefaultLogLevel() {
    WritableMap result = shopifyCheckoutKitModule.getConfig();

    assertThat(result).isNotNull();
    assertThat(result.getString("logLevel")).isEqualTo("error");
  }

  /**
   * Events
   */

  /**
   * Errors
   */

  @Test
  public void testCanProcessCheckoutExpiredErrors() {
    Callback dispatch = mock(Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    CheckoutExpiredException mockException = mock(CheckoutExpiredException.class);
    when(mockException.getErrorDescription()).thenReturn("Cart has expired");
    when(mockException.getErrorCode()).thenReturn("cart_expired");

    processor.onCheckoutFailed(mockException);

    ArgumentCaptor<Object[]> args = ArgumentCaptor.forClass(Object[].class);
    verify(dispatch).invoke(args.capture());

    assertThat((String) args.getValue()[0])
        .contains("\"type\":\"fail\"", "CheckoutExpiredError", "Cart has expired", "cart_expired");
  }

  @Test
  public void testCanProcessClientErrors() {
    Callback dispatch = mock(Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    ClientException mockException = mock(ClientException.class);
    when(mockException.getErrorDescription()).thenReturn("Customer account required");
    when(mockException.getErrorCode()).thenReturn("customer_account_required");

    processor.onCheckoutFailed(mockException);

    ArgumentCaptor<Object[]> args = ArgumentCaptor.forClass(Object[].class);
    verify(dispatch).invoke(args.capture());

    assertThat((String) args.getValue()[0])
        .contains("\"type\":\"fail\"", "CheckoutClientError", "Customer account required", "customer_account_required");
  }

  @Test
  public void testCanProcessHttpErrors() {
    Callback dispatch = mock(Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    HttpException mockException = mock(HttpException.class);
    when(mockException.getErrorDescription()).thenReturn("Not Found");
    when(mockException.getErrorCode()).thenReturn("http_error");
    when(mockException.getStatusCode()).thenReturn(404);

    processor.onCheckoutFailed(mockException);

    ArgumentCaptor<Object[]> args = ArgumentCaptor.forClass(Object[].class);
    verify(dispatch).invoke(args.capture());

    assertThat((String) args.getValue()[0])
        .contains("\"type\":\"fail\"", "CheckoutHTTPError", "Not Found", "http_error", "\"statusCode\":404");
  }

  @Test
  public void testOnFailCallbackIsSingleShot() {
    Callback dispatch = mock(Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    CheckoutExpiredException mockException = mock(CheckoutExpiredException.class);
    when(mockException.getErrorDescription()).thenReturn("Cart has expired");
    when(mockException.getErrorCode()).thenReturn("cart_expired");

    processor.onCheckoutFailed(mockException);
    processor.onCheckoutFailed(mockException);

    verify(dispatch, times(1)).invoke(any(Object[].class));
  }

  @Test
  public void testCheckoutFailedWithNoDispatchCallbackDoesNotEmitFailEvent() {
    CustomCheckoutListener processor = new CustomCheckoutListener(null);

    CheckoutExpiredException mockException = mock(CheckoutExpiredException.class);

    processor.onCheckoutFailed(mockException);

    verify(mockEventEmitter, never()).emit(eq("error"), any());
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
    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getColorScheme().getId())
        .isEqualTo("dark");
  }

  /**
   * Helpers
   */

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

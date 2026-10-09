package com.shopify.checkoutkit.reactnativedemo;

import android.net.Uri;
import android.os.Looper;
import android.webkit.GeolocationPermissions;

import androidx.activity.ComponentActivity;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.JavaOnlyArray;
import com.facebook.react.bridge.JavaOnlyMap;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.shopify.checkoutkit.CheckoutAppearance;
import com.shopify.checkoutkit.CheckoutErrorCode;
import com.shopify.checkoutkit.CheckoutException;
import com.shopify.checkoutkit.CheckoutFailureEvent;
import com.shopify.checkoutkit.CheckoutHandle;
import com.shopify.checkoutkit.CheckoutLink;
import com.shopify.checkoutkit.CheckoutLinkAction;
import com.shopify.checkoutkit.CheckoutPreload;
import com.shopify.checkoutkit.LogLevel;
import com.shopify.checkoutkit.PreloadState;
import com.shopify.checkoutkit.PreloadStateListener;
import com.shopify.checkoutkit.Preloading;
import com.shopify.checkoutkit.ShopifyCheckoutKit;
import com.shopify.checkoutkit.Telemetry;
import com.shopify.reactnative.checkoutkit.ShopifyCheckoutKitModule;
import com.shopify.reactnative.checkoutkit.CustomCheckoutListener;
import com.shopify.reactnative.checkoutkit.DispatchCallback;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Consumer;

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
import static org.robolectric.Shadows.shadowOf;



@RunWith(RobolectricTestRunner.class)
public class ShopifyCheckoutKitModuleTest {
  @Mock
  private ReactApplicationContext mockReactContext;
  @Mock
  private ComponentActivity mockComponentActivity;
  @Mock
  private Callback presentationResult;
  @Captor
  ArgumentCaptor<Runnable> runnableCaptor;
  @Captor
  private ArgumentCaptor<String> stringCaptor;

  private TestShopifyCheckoutKitModule shopifyCheckoutKitModule;
  private AutoCloseable mocks;

  // Store initial configuration to restore after each test
  private CheckoutAppearance initialAppearance;
  private LogLevel initialLogLevel;
  private Preloading initialPreloading;
  private Telemetry initialTelemetry;

  // Mock for Arguments.createMap() to avoid native library loading
  private MockedStatic<Arguments> mockedArguments;

  private static final class TestShopifyCheckoutKitModule extends ShopifyCheckoutKitModule {
    private String preloadStateEvent;

    private final List<String> dispatchEvents = new ArrayList<>();
    private Consumer<String> onDispatch;

    TestShopifyCheckoutKitModule(ReactApplicationContext reactContext) {
      super(reactContext);
    }

    @Override
    protected void emitDispatchEvent(String event) {
      dispatchEvents.add(event);
      if (onDispatch != null) onDispatch.accept(event);
    }

    @Override
    protected void emitPreloadStateEvent(String event) {
      preloadStateEvent = event;
    }
  }

  @Before
  public void setup() {
    mocks = MockitoAnnotations.openMocks(this);
    mockedArguments = Mockito.mockStatic(Arguments.class);
    mockedArguments.when(Arguments::createMap).thenAnswer(invocation -> new JavaOnlyMap());
    mockedArguments.when(() -> Arguments.fromList(anyList()))
        .thenAnswer(invocation -> JavaOnlyArray.from(invocation.getArgument(0)));

    when(mockReactContext.getCurrentActivity()).thenReturn(mockComponentActivity);
    shopifyCheckoutKitModule = new TestShopifyCheckoutKitModule(mockReactContext);

    // Capture initial configuration state to restore after each test
    initialAppearance = ShopifyCheckoutKitModule.checkoutConfig.getAppearance();
    initialLogLevel = ShopifyCheckoutKitModule.checkoutConfig.getLogLevel();
    initialPreloading = ShopifyCheckoutKitModule.checkoutConfig.getPreloading();
    initialTelemetry = ShopifyCheckoutKitModule.checkoutConfig.getTelemetry();
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
      configuration.setTelemetry(initialTelemetry);
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
      mockedShopifyCheckoutKit.when(() -> ShopifyCheckoutKit.present(
          eq(checkoutUrl), any(), any())).thenReturn(mock(CheckoutHandle.class));
      shopifyCheckoutKitModule.present(checkoutUrl, "open", presentationResult);

      verify(mockComponentActivity).runOnUiThread(runnableCaptor.capture());
      runnableCaptor.getValue().run();

      mockedShopifyCheckoutKit.verify(() ->
          ShopifyCheckoutKit.present(eq(checkoutUrl), eq(mockComponentActivity), any()));
    }
  }

  @Test
  public void testDuplicatePresentationPreservesOriginalListener() throws Exception {
    doAnswer(invocation -> {
      ((Runnable) invocation.getArgument(0)).run();
      return null;
    }).when(mockComponentActivity).runOnUiThread(any());
    try (MockedStatic<ShopifyCheckoutKit> nativeKit = Mockito.mockStatic(ShopifyCheckoutKit.class)) {
      CheckoutHandle sheet = mock(CheckoutHandle.class);
      ArgumentCaptor<CustomCheckoutListener> listeners = ArgumentCaptor.forClass(CustomCheckoutListener.class);
      nativeKit.when(() -> ShopifyCheckoutKit.present(anyString(), eq(mockComponentActivity), any()))
          .thenReturn(sheet);
      shopifyCheckoutKitModule.present("https://example.test/first", "handled", presentationResult);
      nativeKit.verify(() -> ShopifyCheckoutKit.present(eq("https://example.test/first"), eq(mockComponentActivity), listeners.capture()));
      shopifyCheckoutKitModule.present("https://example.test/second", "cancel", presentationResult);
      nativeKit.verifyNoMoreInteractions();
      verify(presentationResult).invoke(true);
      verify(presentationResult).invoke(false);
      java.lang.reflect.Constructor<CheckoutLink> constructor = CheckoutLink.class.getDeclaredConstructor(Uri.class);
      constructor.setAccessible(true);
      CheckoutLink link = constructor.newInstance(Uri.parse("https://example.test/policy"));
      assertThat(listeners.getValue().onCheckoutLinkClicked(link)).isEqualTo(CheckoutLinkAction.Handled);
      listeners.getValue().onCheckoutDismissed();
      assertThat(shopifyCheckoutKitModule.dispatchEvents).hasSize(2);
    }
  }

  @Test
  public void testProgrammaticDismissReleasesCallbacksAndAllowsAnotherPresentation() {
    assertCanPresentAfterProgrammaticDismiss(false);
  }

  @Test
  public void testProgrammaticDismissCleansUpWithoutCurrentActivity() {
    assertCanPresentAfterProgrammaticDismiss(true);
  }

  private void assertCanPresentAfterProgrammaticDismiss(boolean detachActivity) {
    doAnswer(invocation -> {
      ((Runnable) invocation.getArgument(0)).run();
      return null;
    }).when(mockComponentActivity).runOnUiThread(any());

    try (MockedStatic<ShopifyCheckoutKit> nativeKit = Mockito.mockStatic(ShopifyCheckoutKit.class)) {
      // Published native handles dismiss silently; the bridge must finish its own lifecycle.
      CheckoutHandle firstSheet = mock(CheckoutHandle.class);
      CheckoutHandle secondSheet = mock(CheckoutHandle.class);
      ArgumentCaptor<CustomCheckoutListener> listeners = ArgumentCaptor.forClass(CustomCheckoutListener.class);
      nativeKit.when(() -> ShopifyCheckoutKit.present(anyString(), eq(mockComponentActivity), any()))
          .thenReturn(firstSheet, secondSheet);

      shopifyCheckoutKitModule.present("https://example.com/first", "open", presentationResult);
      nativeKit.verify(() -> ShopifyCheckoutKit.present(
          eq("https://example.com/first"), eq(mockComponentActivity), listeners.capture()));
      CustomCheckoutListener firstListener = listeners.getValue();
      if (detachActivity) when(mockReactContext.getCurrentActivity()).thenReturn(null);

      shopifyCheckoutKitModule.dismiss();
      shadowOf(Looper.getMainLooper()).idle();

      verify(firstSheet).dismiss();
      assertThat(firstListener.isReleased()).isTrue();
      assertThat(shopifyCheckoutKitModule.dispatchEvents).hasSize(1);
      assertThat(shopifyCheckoutKitModule.dispatchEvents.get(0))
          .contains("\"type\":\"dismiss\"");

      shopifyCheckoutKitModule.dismiss();
      shadowOf(Looper.getMainLooper()).idle();
      when(mockReactContext.getCurrentActivity()).thenReturn(mockComponentActivity);
      shopifyCheckoutKitModule.present("https://example.com/second", "open", presentationResult);
      nativeKit.verify(() -> ShopifyCheckoutKit.present(
          eq("https://example.com/second"), eq(mockComponentActivity), listeners.capture()));
      assertThat(listeners.getValue().isReleased()).isFalse();

      firstListener.onCheckoutDismissed();
      assertThat(shopifyCheckoutKitModule.dispatchEvents).hasSize(1);
      verifyNoMoreInteractions(firstSheet);
      verifyNoInteractions(secondSheet);
    }
  }

  @Test
  public void testPresentFromDismissCallbackIsIgnoredWhileClosing() {
    assertPresentWhileClosingIsIgnored("programmatic");
  }

  @Test
  public void testPresentFromFailCallbackIsIgnoredWhileClosing() {
    assertPresentWhileClosingIsIgnored("fail");
  }

  @Test
  public void testPresentFromBuyerDismissCallbackIsIgnoredWhileClosing() {
    assertPresentWhileClosingIsIgnored("buyer");
  }

  private void assertPresentWhileClosingIsIgnored(String terminal) {
    doAnswer(invocation -> {
      ((Runnable) invocation.getArgument(0)).run();
      return null;
    }).when(mockComponentActivity).runOnUiThread(any());

    try (MockedStatic<ShopifyCheckoutKit> nativeKit = Mockito.mockStatic(ShopifyCheckoutKit.class)) {
      CheckoutHandle firstSheet = mock(CheckoutHandle.class);
      CheckoutHandle secondSheet = mock(CheckoutHandle.class);
      ArgumentCaptor<CustomCheckoutListener> listeners = ArgumentCaptor.forClass(CustomCheckoutListener.class);
      Callback ignoredResult = mock(Callback.class);
      nativeKit.when(() -> ShopifyCheckoutKit.present(anyString(), eq(mockComponentActivity), any()))
          .thenReturn(firstSheet, firstSheet, firstSheet, secondSheet);
      shopifyCheckoutKitModule.present("https://example.com/first", "open", presentationResult);
      verify(presentationResult).invoke(true);
      nativeKit.verify(() -> ShopifyCheckoutKit.present(
          eq("https://example.com/first"), eq(mockComponentActivity), listeners.capture()));
      shopifyCheckoutKitModule.onDispatch = event -> {
        shopifyCheckoutKitModule.onDispatch = null;
        shopifyCheckoutKitModule.present("https://example.com/ignored", "open", ignoredResult);
      };

      if (terminal.equals("fail")) listeners.getValue().onCheckoutFailed(new CheckoutFailureEvent(cartExpired()));
      else if (terminal.equals("buyer")) listeners.getValue().onCheckoutDismissed();
      else shopifyCheckoutKitModule.dismiss();
      shadowOf(Looper.getMainLooper()).idle();
      nativeKit.verify(() -> ShopifyCheckoutKit.present(
          eq("https://example.com/ignored"), eq(mockComponentActivity), listeners.capture()));
      assertThat(listeners.getValue().isReleased()).isTrue();
      verify(ignoredResult).invoke(false);

      // Repeated explicit attempts still recognize the closing handle.
      shopifyCheckoutKitModule.present("https://example.com/still-closing", "open", ignoredResult);
      verify(ignoredResult, times(2)).invoke(false);
      nativeKit.clearInvocations();
      shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(6));
      nativeKit.verifyNoInteractions();
      assertThat(shopifyCheckoutKitModule.dispatchEvents).hasSize(1);

      shopifyCheckoutKitModule.present("https://example.com/after-close", "open", presentationResult);
      verify(presentationResult, times(2)).invoke(true);
      nativeKit.verify(() -> ShopifyCheckoutKit.present(
          eq("https://example.com/after-close"), eq(mockComponentActivity), listeners.capture()));
      assertThat(listeners.getValue().isReleased()).isFalse();
      listeners.getValue().onCheckoutDismissed();
      assertThat(shopifyCheckoutKitModule.dispatchEvents).hasSize(2);
      verifyNoInteractions(secondSheet);
    }
  }

  @Test
  public void testSynchronousInitializationFailureStillEmitsFailure() {
    doAnswer(invocation -> {
      ((Runnable) invocation.getArgument(0)).run();
      return null;
    }).when(mockComponentActivity).runOnUiThread(any());
    try (MockedStatic<ShopifyCheckoutKit> nativeKit = Mockito.mockStatic(ShopifyCheckoutKit.class)) {
      nativeKit.when(() -> ShopifyCheckoutKit.present(anyString(), eq(mockComponentActivity), any()))
          .thenAnswer(invocation -> {
            CustomCheckoutListener listener = invocation.getArgument(2);
            listener.onCheckoutFailed(new CheckoutFailureEvent(cartExpired()));
            return null;
          });
      shopifyCheckoutKitModule.present("https://example.com/failing", "open", presentationResult);
      verify(presentationResult).invoke(true);
      assertThat(shopifyCheckoutKitModule.dispatchEvents).hasSize(1);
      assertThat(shopifyCheckoutKitModule.dispatchEvents.get(0)).contains("\"type\":\"fail\"");
    }
  }

  @Test
  public void testInvalidationCancelsQueuedPresentation() {
    try (MockedStatic<ShopifyCheckoutKit> nativeKit = Mockito.mockStatic(ShopifyCheckoutKit.class)) {
      shopifyCheckoutKitModule.present("https://example.com/checkout", "open", presentationResult);
      verify(mockComponentActivity).runOnUiThread(runnableCaptor.capture());
      shopifyCheckoutKitModule.invalidate();
      runnableCaptor.getValue().run();
      shadowOf(Looper.getMainLooper()).idle();
      shopifyCheckoutKitModule.present("https://example.com/checkout", "open", presentationResult);
      nativeKit.verifyNoInteractions();
      verify(presentationResult, times(2)).invoke(false);
      assertThat(shopifyCheckoutKitModule.dispatchEvents).isEmpty();
    }
  }

  @Test
  public void testCanPreloadCheckout() {
    try (MockedStatic<ShopifyCheckoutKit> mockedShopifyCheckoutKit = Mockito
        .mockStatic(ShopifyCheckoutKit.class)) {
      String checkoutUrl = "https://shopify.com";
      CheckoutPreload checkoutPreload = mock(CheckoutPreload.class);
      mockedShopifyCheckoutKit
          .when(() -> ShopifyCheckoutKit.preload(
              eq(checkoutUrl),
              eq(mockComponentActivity),
              any(PreloadStateListener.class)))
          .thenReturn(checkoutPreload);

      shopifyCheckoutKitModule.preload(checkoutUrl, "preload-request");

      mockedShopifyCheckoutKit.verify(() -> ShopifyCheckoutKit.preload(
          eq(checkoutUrl),
          eq(mockComponentActivity),
          any(PreloadStateListener.class)));
    }
  }

  @Test
  public void testPreloadSerializesWebContentUnavailable() {
    try (MockedStatic<ShopifyCheckoutKit> mockedShopifyCheckoutKit = Mockito
        .mockStatic(ShopifyCheckoutKit.class)) {
      String checkoutUrl = "https://shopify.com";
      CheckoutPreload checkoutPreload = mock(CheckoutPreload.class);
      ArgumentCaptor<PreloadStateListener> listenerCaptor =
          ArgumentCaptor.forClass(PreloadStateListener.class);
      mockedShopifyCheckoutKit
          .when(() -> ShopifyCheckoutKit.preload(
              eq(checkoutUrl),
              eq(mockComponentActivity),
              any(PreloadStateListener.class)))
          .thenReturn(checkoutPreload);

      shopifyCheckoutKitModule.preload(checkoutUrl, "preload-request");

      mockedShopifyCheckoutKit.verify(() -> ShopifyCheckoutKit.preload(
          eq(checkoutUrl),
          eq(mockComponentActivity),
          listenerCaptor.capture()));
      listenerCaptor.getValue().onStateChanged(new PreloadState.Failed(
          PreloadState.FailureReason.WebContentUnavailable.INSTANCE,
          "Web content process terminated."));

      assertThat(shopifyCheckoutKitModule.preloadStateEvent)
          .contains("\"requestId\":\"preload-request\"")
          .contains("\"type\":\"failed\"")
          .contains("\"reason\":\"webContentUnavailable\"");
    }
  }

  @Test
  public void testPreloadEmitsIdleWithoutComponentActivity() {
    when(mockReactContext.getCurrentActivity()).thenReturn(null);

    try (MockedStatic<ShopifyCheckoutKit> mockedShopifyCheckoutKit = Mockito
        .mockStatic(ShopifyCheckoutKit.class)) {
      shopifyCheckoutKitModule.preload("https://shopify.com", "preload-request");

      mockedShopifyCheckoutKit.verifyNoInteractions();
      assertThat(shopifyCheckoutKitModule.preloadStateEvent)
          .contains("\"requestId\":\"preload-request\"")
          .contains("\"type\":\"idle\"");
    }
  }

  @Test
  public void testCanInvalidatePreloadCache() {
    try (MockedStatic<ShopifyCheckoutKit> mockedShopifyCheckoutKit = Mockito
        .mockStatic(ShopifyCheckoutKit.class)) {
      CheckoutPreload checkoutPreload = mock(CheckoutPreload.class);
      mockedShopifyCheckoutKit
          .when(() -> ShopifyCheckoutKit.preload(
              anyString(),
              eq(mockComponentActivity),
              any(PreloadStateListener.class)))
          .thenReturn(checkoutPreload);

      shopifyCheckoutKitModule.preload("https://shopify.com", "preload-request");
      shopifyCheckoutKitModule.invalidateCache();

      verify(checkoutPreload).setListener(null);
      mockedShopifyCheckoutKit.verify(ShopifyCheckoutKit::invalidate);
    }
  }

  @Test
  public void testModuleInvalidationDetachesPreloadListener() {
    try (MockedStatic<ShopifyCheckoutKit> mockedShopifyCheckoutKit = Mockito
        .mockStatic(ShopifyCheckoutKit.class)) {
      CheckoutPreload checkoutPreload = mock(CheckoutPreload.class);
      mockedShopifyCheckoutKit
          .when(() -> ShopifyCheckoutKit.preload(
              anyString(),
              eq(mockComponentActivity),
              any(PreloadStateListener.class)))
          .thenReturn(checkoutPreload);

      shopifyCheckoutKitModule.preload("https://shopify.com", "preload-request");
      shopifyCheckoutKitModule.invalidate();

      verify(checkoutPreload).setListener(null);
    }
  }

  @Test
  public void testPresentForwardsOnDismissCallback() {
    DispatchCallback dispatch = mock(DispatchCallback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onCheckoutDismissed();

    verify(dispatch).invoke(stringCaptor.capture());
    assertThat(stringCaptor.getValue()).contains("\"type\":\"dismiss\"");
  }

  @Test
  public void testOnDismissCallbackIsSingleShot() {
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

    verify(permissionsCallback).invoke("https://shopify.com", false, false);
    verifyNoMoreInteractions(permissionsCallback);
  }

  @Test
  public void testTerminalEventClearsPendingGeolocationCallback() {
    DispatchCallback dispatch = mock(DispatchCallback.class);
    GeolocationPermissions.Callback permissionsCallback = mock(GeolocationPermissions.Callback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onGeolocationPermissionsShowPrompt("https://shopify.com", permissionsCallback);
    processor.onCheckoutDismissed();
    processor.invokeGeolocationCallback(true);

    verify(permissionsCallback).invoke("https://shopify.com", false, false);
    verifyNoMoreInteractions(permissionsCallback);
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
  public void testCanSetDarkAppAppearance() {
    JavaOnlyMap config = JavaOnlyMap.of("appearance", JavaOnlyMap.of("type", "app", "colorScheme", "dark"));

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("dark");
  }

  @Test
  public void testUnknownColorSchemeKeepsTheCurrentAppearance() {
    JavaOnlyMap darkConfig = JavaOnlyMap.of("appearance", JavaOnlyMap.of("type", "app", "colorScheme", "dark"));
    shopifyCheckoutKitModule.setConfig(darkConfig);

    JavaOnlyMap config = JavaOnlyMap.of("appearance", JavaOnlyMap.of("type", "app", "colorScheme", "sepia"));

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("dark");
  }

  @Test
  public void testUnknownColorSchemeKeepsTheNativeDefaultAppearance() {
    JavaOnlyMap config = JavaOnlyMap.of("appearance", JavaOnlyMap.of("type", "app", "colorScheme", "sepia"));

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(colorSchemeIdOf(ShopifyCheckoutKitModule.checkoutConfig.getAppearance()))
        .isEqualTo("storefront");
  }

  @Test
  public void testAllowedMessageOriginsRoundTrip() {
    JavaOnlyMap config = new JavaOnlyMap();
    JavaOnlyArray allowedMessageOrigins = new JavaOnlyArray();
    allowedMessageOrigins.pushString("https://example.com");
    allowedMessageOrigins.pushString("https://*.example.com");
    config.putArray("allowedMessageOrigins", allowedMessageOrigins);

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getAllowedMessageOrigins())
        .containsExactlyInAnyOrder("https://example.com", "https://*.example.com");
    assertThat(shopifyCheckoutKitModule.getConfig().getArray("allowedMessageOrigins").toArrayList())
        .containsExactlyInAnyOrder("https://example.com", "https://*.example.com");
  }

  @Test
  public void testGetConfigReturnsOnlyCommonSettingsAndTheAppearanceWithoutColors() {
    for (String scheme : new String[] {"light", "dark", "automatic", "storefront"}) {
      JavaOnlyMap appearance = scheme.equals("storefront")
          ? JavaOnlyMap.of("type", "storefront")
          : JavaOnlyMap.of("type", "app", "colorScheme", scheme);
      appearance.putMap("colors", JavaOnlyMap.of(
          "android", JavaOnlyMap.of("progressIndicator", "#112233")));

      shopifyCheckoutKitModule.setConfig(JavaOnlyMap.of("appearance", appearance));

      ReadableMap result = shopifyCheckoutKitModule.getConfig();

      assertThat(result.toHashMap()).containsOnlyKeys(
          "appearance", "preloading", "telemetry", "title", "logLevel", "allowedMessageOrigins");
      Map<String, Object> expectedAppearance = scheme.equals("storefront")
          ? Map.of("type", "storefront")
          : Map.of("type", "app", "colorScheme", scheme);
      assertThat(result.getMap("appearance").toHashMap()).isEqualTo(expectedAppearance);
    }
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
  public void testCanDisableTelemetry() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putBoolean("telemetry", false);

    shopifyCheckoutKitModule.setConfig(config);

    assertThat(ShopifyCheckoutKitModule.checkoutConfig.getTelemetry().getEnabled())
        .isFalse();
  }

  @Test
  public void testGetConfigIncludesTelemetry() {
    JavaOnlyMap config = new JavaOnlyMap();
    config.putBoolean("telemetry", false);
    shopifyCheckoutKitModule.setConfig(config);

    WritableMap result = shopifyCheckoutKitModule.getConfig();

    assertThat(result.getBoolean("telemetry")).isFalse();
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

    processor.onCheckoutFailed(new CheckoutFailureEvent(cartExpired()));

    verify(dispatch).invoke(stringCaptor.capture());

    assertThat(stringCaptor.getValue())
        .contains("\"type\":\"fail\"", "\"code\":\"cart_expired\"", "\"message\":\"Cart has expired\"")
        .doesNotContain("__typename", "statusCode");
  }

  @Test
  public void testCanProcessClientErrors() {
    DispatchCallback dispatch = mock(DispatchCallback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onCheckoutFailed(new CheckoutFailureEvent(new CheckoutException(
        CheckoutErrorCode.CUSTOMER_ACCOUNT_REQUIRED, "Customer account required")));

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

    processor.onCheckoutFailed(new CheckoutFailureEvent(new CheckoutException(
        CheckoutErrorCode.HTTP_ERROR, "Not Found", 404)));

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

      processor.onCheckoutFailed(new CheckoutFailureEvent(new CheckoutException(code, "failed")));

      verify(dispatch).invoke(envelopeCaptor.capture());
      assertThat(envelopeCaptor.getValue())
          .contains("\"code\":\"" + code.name().toLowerCase(Locale.ROOT) + "\"");
    }
  }

  @Test
  public void testOnFailCallbackIsSingleShot() {
    DispatchCallback dispatch = mock(DispatchCallback.class);
    CustomCheckoutListener processor = new CustomCheckoutListener(dispatch);

    processor.onCheckoutFailed(new CheckoutFailureEvent(cartExpired()));
    processor.onCheckoutFailed(new CheckoutFailureEvent(cartExpired()));

    verify(dispatch, times(1)).invoke(anyString());
  }

  /**
   * Integration
   */

  @Test
  public void testCompleteConfigurationAndEventFlow() {
    // Set up configuration
    JavaOnlyMap config = JavaOnlyMap.of("appearance", JavaOnlyMap.of("type", "app", "colorScheme", "dark"));

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

package com.shopify.checkoutkit;

import static org.assertj.core.api.Assertions.assertThat;

import androidx.activity.ComponentActivity;
import androidx.annotation.NonNull;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.android.controller.ActivityController;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import kotlin.Unit;

@RunWith(RobolectricTestRunner.class)
public class InteropTest {
    private Configuration initialConfiguration = null;

    @Before
    public void setUp() {
        initialConfiguration = ShopifyCheckoutKit.getConfiguration();
    }

    @After
    public void tearDown() {
        ShopifyCheckoutKit.configure(config -> {
            config.setAppearance(initialConfiguration.getAppearance());
            config.setSheet(initialConfiguration.getSheet());
            config.setPreloading(initialConfiguration.getPreloading());
            config.setPlatform(initialConfiguration.getPlatform());
            config.setLogLevel(initialConfiguration.getLogLevel());
            config.setTitle(initialConfiguration.getTitle());
        });
    }

    @Test
    public void canInstantiateCustomListener() {
        DefaultCheckoutListener listener = new DefaultCheckoutListener() {
            @Override
            public void onCheckoutFailed(@NonNull CheckoutException error) {

            }

            @Override
            public void onCheckoutDismissed() {

            }
        };

        assertThat(listener).isNotNull();
    }

    @Test
    public void canConstructCheckoutExceptionWithJavaOverloads() {
        CheckoutException withoutOptionalFields = new CheckoutException(
                CheckoutErrorCode.UNKNOWN,
                "Unknown checkout failure"
        );
        CheckoutException withHttpStatusCode = new CheckoutException(
                CheckoutErrorCode.HTTP_ERROR,
                "Checkout request failed",
                500
        );
        CheckoutException withRetryAfter = new CheckoutException(
                CheckoutErrorCode.HTTP_ERROR,
                "Checkout request throttled",
                429,
                null,
                120L
        );

        assertThat(withoutOptionalFields.getCode()).isEqualTo(CheckoutErrorCode.UNKNOWN);
        assertThat(withoutOptionalFields.getHttpStatusCode()).isNull();
        assertThat(withHttpStatusCode.getHttpStatusCode()).isEqualTo(500);
        assertThat(withRetryAfter.getRetryAfterSeconds()).isEqualTo(120L);
    }

    @Test
    public void canConfigureCheckoutKit() {
        ShopifyCheckoutKit.configure(configuration -> {
            configuration.setAppearance(new CheckoutAppearance.App(new ColorScheme.Dark()));
        });

        Configuration configuration = ShopifyCheckoutKit.getConfiguration();

        assertThat(configuration.getAppearance()).isEqualTo(new CheckoutAppearance.App(new ColorScheme.Dark()));
    }

    @Test
    public void canConfigureStorefrontAppearance() {
        ShopifyCheckoutKit.configure(configuration -> {
            configuration.setAppearance(new CheckoutAppearance.Storefront());
        });

        Configuration configuration = ShopifyCheckoutKit.getConfiguration();

        assertThat(configuration.getAppearance()).isEqualTo(new CheckoutAppearance.Storefront());
    }

    @Test
    public void canCustomizeStorefrontAppearance() {
        Color headerBackground = new Color.SRGB(0xFF008060);

        CheckoutAppearance.Storefront appearance = new CheckoutAppearance.Storefront().customize(
                builder -> builder.setHeaderBackground(headerBackground)
        );

        assertThat(appearance).isNotEqualTo(new CheckoutAppearance.Storefront());
    }

    @Test
    public void canConfigureTitle() {
        ShopifyCheckoutKit.configure(configuration -> {
            configuration.setTitle("Java Title");
        });

        Configuration configuration = ShopifyCheckoutKit.getConfiguration();

        assertThat(configuration.getTitle()).isEqualTo("Java Title");
    }

    @Test
    public void canConfigurePreloading() {
        ShopifyCheckoutKit.configure(configuration -> {
            configuration.setPreloading(new Preloading(false, Preloading.ThrottlePolicy.PASSTHROUGH));
        });

        Configuration configuration = ShopifyCheckoutKit.getConfiguration();

        assertThat(configuration.getPreloading().getEnabled()).isFalse();
        assertThat(configuration.getPreloading().getThrottlePolicy())
                .isEqualTo(Preloading.ThrottlePolicy.PASSTHROUGH);
    }

    @Test
    public void canConfigureSheet() {
        CheckoutSheetOptions sheet = new CheckoutSheetOptions(
                12f,
                CheckoutSheetTitleAlignment.START,
                4f,
                null,
                new Color.ResourceId(android.R.color.holo_red_dark),
                new Color.SRGB(0x52000000),
                new CheckoutSheetDismissal(false, false),
                new CheckoutSheetDragHandle(true),
                Collections.singletonList(new CheckoutSheetSnapPoint.Expanded(12f)),
                480f
        );

        ShopifyCheckoutKit.configure(configuration -> configuration.setSheet(sheet));

        Configuration configuration = ShopifyCheckoutKit.getConfiguration();

        assertThat(configuration.getSheet()).isEqualTo(sheet);
    }

    @Test
    public void canConfigureSheetDismissal() {
        CheckoutSheetDismissal dismissal = new CheckoutSheetDismissal(false, false);

        ShopifyCheckoutKit.configure(configuration -> configuration.setSheet(
                new CheckoutSheetOptions(
                        32f,
                        CheckoutSheetTitleAlignment.CENTER,
                        0f,
                        null,
                        null,
                        new Color.SRGB(0x52000000),
                        dismissal,
                        new CheckoutSheetDragHandle(),
                        Collections.singletonList(CheckoutSheetSnapPoint.MaterialExpanded.INSTANCE)
                )
        ));

        Configuration configuration = ShopifyCheckoutKit.getConfiguration();

        assertThat(configuration.getSheet().getDismissal()).isEqualTo(dismissal);
    }

    @Test
    public void canPreloadAndInvalidate() {
        try (ActivityController<ComponentActivity> controller = Robolectric.buildActivity(ComponentActivity.class)) {
            ComponentActivity activity = controller.get();

            ShopifyCheckoutKit.preload("https://shopify.dev", activity);
            ShopifyCheckoutKit.invalidate();
        }
    }

    @Test
    public void canPreloadWithListenerFromJava() {
        try (ActivityController<ComponentActivity> controller = Robolectric.buildActivity(ComponentActivity.class)) {
            ComponentActivity activity = controller.get();

            try (ActivityController<ComponentActivity> finishingController = Robolectric.buildActivity(ComponentActivity.class)) {
                ComponentActivity finishingActivity = finishingController.get();
                finishingActivity.finish();

                CheckoutPreload skippedPreload = ShopifyCheckoutKit.preload(
                        "https://shopify.dev",
                        finishingActivity,
                        ignored -> {}
                );

                assertThat(skippedPreload).isNull();
            }

            List<PreloadState> states = new ArrayList<>();
            CheckoutPreload preload = CheckoutWebView.Companion.preload(
                    "https://shopify.dev",
                    activity,
                    new FakeWebMessageTransport(),
                    states::add
            );

            assertThat(preload).isNotNull();
            preload.setListener(states::add);
            assertThat(preload.getState()).isNotNull();
            assertThat(states).containsExactly(PreloadState.Loading.INSTANCE, PreloadState.Loading.INSTANCE);
            ShopifyCheckoutKit.invalidate();
        }
    }

    @Test
    public void canCallPresentFromJava() {
        try (ActivityController<ComponentActivity> controller = Robolectric.buildActivity(ComponentActivity.class)) {
            ComponentActivity activity = controller.get();
            // Avoid constructing a WebView; fake-transport Kotlin tests cover presentation behavior.
            activity.finish();

            CheckoutHandle checkout = ShopifyCheckoutKit.present(
                    "https://shopify.dev",
                    activity,
                    new DefaultCheckoutListener() {
                        @Override
                        public void onCheckoutFailed(@NonNull CheckoutException error) {
                            // do nothing
                        }

                        @Override
                        public void onCheckoutDismissed() {
                            // do nothing
                        }
                    }
            );

            assertThat(checkout).isNull();
        }
    }

    @Test
    public void canDismissCheckoutHandleFromJava() {
        AtomicBoolean dismissed = new AtomicBoolean();
        CheckoutHandle checkout = () -> dismissed.set(true);

        checkout.dismiss();

        assertThat(dismissed).isTrue();
    }

    @Test
    public void canCreateAndDestroyShopifyCheckoutFromJava() {
        try (ActivityController<ComponentActivity> controller = Robolectric.buildActivity(ComponentActivity.class)) {
            ComponentActivity activity = controller.get();
            DefaultCheckoutListener listener = new DefaultCheckoutListener() {
                @Override
                public void onCheckoutFailed(@NonNull CheckoutException error) {
                    // do nothing
                }

                @Override
                public void onCheckoutDismissed() {
                    // do nothing
                }
            };

            ShopifyCheckout checkout = new ShopifyCheckout(activity, "https://shopify.dev", listener);
            checkout.destroy();

            assertThat(checkout).isNotNull();
        }
    }

    @Test
    public void canCustomizeColorSchemeWithSingleBlock() {
        ColorScheme.Light lightScheme = new ColorScheme.Light();
        Color tintColor = new Color.ResourceId(android.R.color.holo_red_dark);

        ColorScheme customized = lightScheme.customize(builder -> {
            builder.setCloseIconTint(tintColor);
            return Unit.INSTANCE;
        });

        assertThat(customized).isInstanceOf(ColorScheme.Light.class);
        ColorScheme.Light customizedLight = (ColorScheme.Light) customized;
        assertThat(customizedLight.getColors().getCloseIconTint()).isEqualTo(tintColor);
    }

    @Test
    public void canCustomizeColorSchemeWithLightAndDarkBlocks() {
        ColorScheme.Automatic autoScheme = new ColorScheme.Automatic();
        Color lightTint = new Color.ResourceId(android.R.color.holo_orange_light);
        Color darkTint = new Color.ResourceId(android.R.color.holo_blue_dark);
        Color lightHandle = new Color.ResourceId(android.R.color.holo_green_light);
        Color darkHandle = new Color.ResourceId(android.R.color.holo_green_dark);
        DrawableResource customIcon = new DrawableResource(android.R.drawable.ic_menu_close_clear_cancel);

        ColorScheme customized = autoScheme.customize(
                lightBuilder -> {
                    lightBuilder.setCloseIconTint(lightTint);
                    lightBuilder.setDragHandleColor(lightHandle);
                    return Unit.INSTANCE;
                },
                darkBuilder -> {
                    darkBuilder.setCloseIcon(customIcon);
                    darkBuilder.setCloseIconTint(darkTint);
                    darkBuilder.setDragHandleColor(darkHandle);
                    return Unit.INSTANCE;
                }
        );

        assertThat(customized).isInstanceOf(ColorScheme.Automatic.class);
        ColorScheme.Automatic customizedAuto = (ColorScheme.Automatic) customized;

        assertThat(customizedAuto.getLightColors().getCloseIconTint()).isEqualTo(lightTint);
        assertThat(customizedAuto.getLightColors().getCloseIcon()).isNull();

        assertThat(customizedAuto.getDarkColors().getCloseIconTint()).isEqualTo(darkTint);
        assertThat(customizedAuto.getDarkColors().getCloseIcon()).isEqualTo(customIcon);
        assertThat(customizedAuto.getLightColors().getDragHandleColor()).isEqualTo(lightHandle);
        assertThat(customizedAuto.getDarkColors().getDragHandleColor()).isEqualTo(darkHandle);
    }

    @Test
    public void canUseColorsBuilderDirectPropertyAssignment() {
        ColorScheme.Dark darkScheme = new ColorScheme.Dark();
        Color headerColor = new Color.SRGB(0xFF123456);
        Color tintColor = new Color.SRGB(0xFFABCDEF);

        ColorScheme customized = darkScheme.customize(builder -> {
            builder.setHeaderBackground(headerColor);
            builder.setCloseIconTint(tintColor);
            return Unit.INSTANCE;
        });

        assertThat(customized).isInstanceOf(ColorScheme.Dark.class);
        ColorScheme.Dark customizedDark = (ColorScheme.Dark) customized;
        assertThat(customizedDark.getColors().getHeaderBackground()).isEqualTo(headerColor);
        assertThat(customizedDark.getColors().getCloseIconTint()).isEqualTo(tintColor);
    }

    @Test
    public void canChainColorsBuilderMethods() {
        ColorScheme.Light lightScheme = new ColorScheme.Light();
        Color webViewBg = new Color.ResourceId(android.R.color.white);
        Color progressColor = new Color.ResourceId(android.R.color.holo_green_dark);
        Color dragHandle = new Color.ResourceId(android.R.color.holo_blue_light);
        Color headerBorder = new Color.ResourceId(android.R.color.darker_gray);
        DrawableResource icon = new DrawableResource(android.R.drawable.ic_menu_close_clear_cancel);

        ColorScheme customized = lightScheme.customize(builder -> {
            builder
                    .withWebViewBackground(webViewBg)
                    .withProgressIndicator(progressColor)
                    .withDragHandleColor(dragHandle)
                    .withHeaderBorderColor(headerBorder)
                    .withCloseIcon(icon);
            return Unit.INSTANCE;
        });

        assertThat(customized).isInstanceOf(ColorScheme.Light.class);
        ColorScheme.Light customizedLight = (ColorScheme.Light) customized;
        Colors colors = customizedLight.getColors();

        assertThat(colors.getWebViewBackground()).isEqualTo(webViewBg);
        assertThat(colors.getProgressIndicator()).isEqualTo(progressColor);
        assertThat(colors.getDragHandleColor()).isEqualTo(dragHandle);
        assertThat(colors.getHeaderBorderColor()).isEqualTo(headerBorder);
        assertThat(colors.getCloseIcon()).isEqualTo(icon);
    }

    @Test
    public void customizeLeavesDragHandleColorUnsetWhenOnlyHeaderFontChanges() {
        ColorScheme.Light lightScheme = new ColorScheme.Light();
        Color headerFont = new Color.SRGB(0xFF336699);

        ColorScheme customized = lightScheme.customize(builder -> {
            builder.setHeaderFont(headerFont);
            return Unit.INSTANCE;
        });

        assertThat(customized).isInstanceOf(ColorScheme.Light.class);
        Colors colors = ((ColorScheme.Light) customized).getColors();

        assertThat(colors.getHeaderFont()).isEqualTo(headerFont);
        assertThat(colors.getDragHandleColor()).isNull();
    }
}

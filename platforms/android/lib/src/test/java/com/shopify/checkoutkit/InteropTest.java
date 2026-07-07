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
import org.robolectric.shadows.ShadowDialog;

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
            config.setColorScheme(initialConfiguration.getColorScheme());
            config.setPreloading(initialConfiguration.getPreloading());
            config.setPlatform(initialConfiguration.getPlatform());
            config.setLogLevel(initialConfiguration.getLogLevel());
        });
    }

    @Test
    public void canInstantiateCustomListener() {
        DefaultCheckoutListener listener = new DefaultCheckoutListener() {
            @Override
            public void onCheckoutFailed(@NonNull CheckoutException error) {

            }

            @Override
            public void onCheckoutCanceled() {

            }
        };

        assertThat(listener).isNotNull();
    }

    @Test
    public void canConfigureCheckoutKit() {
        ShopifyCheckoutKit.configure(configuration -> {
            configuration.setColorScheme(new ColorScheme.Dark());
        });

        Configuration configuration = ShopifyCheckoutKit.getConfiguration();

        assertThat(configuration.getColorScheme().getId()).isEqualTo("dark");
    }

    @Test
    public void canConfigurePreloading() {
        ShopifyCheckoutKit.configure(configuration -> {
            configuration.setPreloading(new Preloading(false));
        });

        Configuration configuration = ShopifyCheckoutKit.getConfiguration();

        assertThat(configuration.getPreloading().getEnabled()).isFalse();
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
    public void presentReturnsAHandleToAllowDismissingCheckout() {
        try (ActivityController<ComponentActivity> controller = Robolectric.buildActivity(ComponentActivity.class)) {
            ComponentActivity activity = controller.get();
            CheckoutHandle checkout = ShopifyCheckoutKit.present(
                    "https://shopify.dev",
                    activity,
                    new DefaultCheckoutListener() {
                        @Override
                        public void onCheckoutFailed(@NonNull CheckoutException error) {
                            // do nothing
                        }

                        @Override
                        public void onCheckoutCanceled() {
                            // do nothing
                        }
                    }
            );

            assertThat(checkout).isNotNull();
            CheckoutBottomSheet sheet = (CheckoutBottomSheet) ShadowDialog.getLatestDialog();
            assertThat(sheet.isShowing()).isTrue();

            checkout.dismiss();
            assertThat(sheet.isShowing()).isFalse();
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
        DrawableResource customIcon = new DrawableResource(android.R.drawable.ic_menu_close_clear_cancel);

        ColorScheme customized = autoScheme.customize(
                lightBuilder -> {
                    lightBuilder.setCloseIconTint(lightTint);
                    return Unit.INSTANCE;
                },
                darkBuilder -> {
                    darkBuilder.setCloseIcon(customIcon);
                    darkBuilder.setCloseIconTint(darkTint);
                    return Unit.INSTANCE;
                }
        );

        assertThat(customized).isInstanceOf(ColorScheme.Automatic.class);
        ColorScheme.Automatic customizedAuto = (ColorScheme.Automatic) customized;

        assertThat(customizedAuto.getLightColors().getCloseIconTint()).isEqualTo(lightTint);
        assertThat(customizedAuto.getLightColors().getCloseIcon()).isNull();

        assertThat(customizedAuto.getDarkColors().getCloseIconTint()).isEqualTo(darkTint);
        assertThat(customizedAuto.getDarkColors().getCloseIcon()).isEqualTo(customIcon);
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
        ColorScheme.Web webScheme = new ColorScheme.Web();
        Color webViewBg = new Color.ResourceId(android.R.color.white);
        Color progressColor = new Color.ResourceId(android.R.color.holo_green_dark);
        DrawableResource icon = new DrawableResource(android.R.drawable.ic_menu_close_clear_cancel);

        ColorScheme customized = webScheme.customize(builder -> {
            builder
                    .withWebViewBackground(webViewBg)
                    .withProgressIndicator(progressColor)
                    .withCloseIcon(icon);
            return Unit.INSTANCE;
        });

        assertThat(customized).isInstanceOf(ColorScheme.Web.class);
        ColorScheme.Web customizedWeb = (ColorScheme.Web) customized;
        Colors colors = customizedWeb.getColors();

        assertThat(colors.getWebViewBackground()).isEqualTo(webViewBg);
        assertThat(colors.getProgressIndicator()).isEqualTo(progressColor);
        assertThat(colors.getCloseIcon()).isEqualTo(icon);
    }
}

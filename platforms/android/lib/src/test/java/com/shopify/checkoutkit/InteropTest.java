/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
package com.shopify.checkoutkit;

import static org.assertj.core.api.Assertions.assertThat;

import androidx.activity.ComponentActivity;
import androidx.annotation.NonNull;

import com.shopify.checkoutkit.errorevents.CheckoutErrorDecoder;
import com.shopify.checkoutkit.lifecycleevents.CheckoutCompletedEvent;
import com.shopify.checkoutkit.lifecycleevents.CheckoutCompletedEventDecoder;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.android.controller.ActivityController;
import org.robolectric.shadows.ShadowDialog;

import kotlinx.serialization.json.Json;
import kotlinx.serialization.json.JsonKt;

@RunWith(RobolectricTestRunner.class)
public class InteropTest {
    private final String EXAMPLE_EVENT = "{\n" +
            "      \"orderDetails\": {\n" +
            "        \"id\": \"gid://shopify/OrderIdentity/9697125302294\",\n" +
            "        \"cart\": {\n" +
            "          \"token\": \"123abc\",\n" +
            "          \"lines\": [\n" +
            "            {\n" +
            "              \"image\": {\n" +
            "                \"sm\": \"https://cdn.shopify.com/s/files/1/0692/3996/3670/files/41bc5767-d56f-432c-ac5f-6b9eeee3ba0e.truncated...\",\n" +
            "                \"md\": \"https://cdn.shopify.com/s/files/1/0692/3996/3670/files/41bc5767-d56f-432c-ac5f-6b9eeee3ba0e.truncated...\",\n" +
            "                \"lg\": \"https://cdn.shopify.com/s/files/1/0692/3996/3670/files/41bc5767-d56f-432c-ac5f-6b9eeee3ba0e.truncated...\"\n" +
            "              },\n" +
            "              \"quantity\": 1,\n" +
            "              \"title\": \"The Box: How the Shipping Container Made the World Smaller and the World Economy Bigger\",\n" +
            "              \"price\": {\n" +
            "                \"amount\": 8,\n" +
            "                \"currencyCode\": \"GBP\"\n" +
            "              },\n" +
            "              \"merchandiseId\": \"gid://shopify/ProductVariant/43835075002390\",\n" +
            "              \"productId\": \"gid://shopify/Product/8013997834262\"\n" +
            "            }\n" +
            "          ],\n" +
            "          \"price\": {\n" +
            "            \"total\": {\n" +
            "              \"amount\": 13.99,\n" +
            "              \"currencyCode\": \"GBP\"\n" +
            "            },\n" +
            "            \"subtotal\": {\n" +
            "              \"amount\": 8,\n" +
            "              \"currencyCode\": \"GBP\"\n" +
            "            },\n" +
            "            \"taxes\": {\n" +
            "              \"amount\": 0,\n" +
            "              \"currencyCode\": \"GBP\"\n" +
            "            },\n" +
            "            \"shipping\": {\n" +
            "              \"amount\": 5.99,\n" +
            "              \"currencyCode\": \"GBP\"\n" +
            "            }\n" +
            "          }\n" +
            "        },\n" +
            "        \"email\": \"a.user@shopify.com\",\n" +
            "        \"shippingAddress\": {\n" +
            "          \"city\": \"Swansea\",\n" +
            "          \"countryCode\": \"GB\",\n" +
            "          \"postalCode\": \"SA1 1AB\",\n" +
            "          \"address1\": \"100 Street Avenue\",\n" +
            "          \"firstName\": \"Andrew\",\n" +
            "          \"lastName\": \"Person\",\n" +
            "          \"name\": \"Andrew\",\n" +
            "          \"zoneCode\": \"WLS\",\n" +
            "          \"phone\": \"+447915123456\",\n" +
            "          \"coordinates\": {\n" +
            "            \"latitude\": 54.5936785,\n" +
            "            \"longitude\": -3.013167399999999\n" +
            "          }\n" +
            "        },\n" +
            "        \"billingAddress\": {\n" +
            "          \"city\": \"Swansea\",\n" +
            "          \"countryCode\": \"GB\",\n" +
            "          \"postalCode\": \"SA1 1AB\",\n" +
            "          \"address1\": \"100 Street Avenue\",\n" +
            "          \"firstName\": \"Andrew\",\n" +
            "          \"lastName\": \"Person\",\n" +
            "          \"zoneCode\": \"WLS\",\n" +
            "          \"phone\": \"+447915123456\"\n" +
            "        },\n" +
            "        \"paymentMethods\": [\n" +
            "          {\n" +
            "            \"type\": \"wallet\",\n" +
            "            \"details\": {\n" +
            "              \"amount\": \"13.99\",\n" +
            "              \"currency\": \"GBP\",\n" +
            "              \"name\": \"SHOP_PAY\"\n" +
            "            }\n" +
            "          }\n" +
            "        ],\n" +
            "        \"deliveries\": [\n" +
            "          {\n" +
            "            \"method\": \"SHIPPING\",\n" +
            "            \"details\": {\n" +
            "              \"location\": {\n" +
            "                \"city\": \"Swansea\",\n" +
            "                \"countryCode\": \"GB\",\n" +
            "                \"postalCode\": \"SA1 1AB\",\n" +
            "                \"address1\": \"100 Street Avenue\",\n" +
            "                \"firstName\": \"Andrew\",\n" +
            "                \"lastName\": \"Person\",\n" +
            "                \"name\": \"Andrew\",\n" +
            "                \"zoneCode\": \"WLS\",\n" +
            "                \"phone\": \"+447915123456\",\n" +
            "                \"coordinates\": {\n" +
            "                  \"latitude\": 54.5936785,\n" +
            "                  \"longitude\": -3.013167399999999\n" +
            "                }\n" +
            "              }\n" +
            "            }\n" +
            "          }\n" +
            "        ]\n" +
            "      }\n" +
            "    }";
    private Configuration initialConfiguration = null;

    @Before
    public void setUp() {
        initialConfiguration = ShopifyCheckoutKit.getConfiguration();
    }

    @After
    public void tearDown() {
        ShopifyCheckoutKit.configure(config -> {
            config.setColorScheme(initialConfiguration.getColorScheme());
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

    @SuppressWarnings("all")
    @Test
    public void canAccessFieldsOnExceptions() {
        String eventString = "[{" +
                "\"group\": \"expired\"," +
                "\"reason\": \"Checkout has expired\"," +
                "\"code\": \"cart_completed\"" +
                "}]";

        WebToSdkEvent webEvent = new WebToSdkEvent("error", eventString);
        Json json = JsonKt.Json(Json.Default, b -> {
            b.setIgnoreUnknownKeys(true);
            return null;
        });
        CheckoutErrorDecoder decoder = new CheckoutErrorDecoder(json);

        CheckoutException exception = decoder.decode(webEvent);

        assertThat(exception.getClass()).isEqualTo(CheckoutExpiredException.class);
        assertThat(exception.getErrorCode()).isEqualTo("cart_completed");
        assertThat(exception.getErrorDescription()).isEqualTo("Checkout has expired");
    }

    @SuppressWarnings("all")
    @Test
    public void canAccessFieldsOnCheckoutCompletedEvent() {
        WebToSdkEvent webEvent = new WebToSdkEvent("completed", EXAMPLE_EVENT);
        Json json = JsonKt.Json(Json.Default, b -> {
            b.setIgnoreUnknownKeys(true);
            return null;
        });
        CheckoutCompletedEventDecoder decoder = new CheckoutCompletedEventDecoder(json);

        CheckoutCompletedEvent event = decoder.decode(webEvent);

        assertThat(event.getOrderDetails().getId())
                .isEqualTo("gid://shopify/OrderIdentity/9697125302294");
        assertThat(event.getOrderDetails().getCart().getLines().get(0).getPrice().getAmount())
                .isEqualTo(8.0);
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
    public void presentReturnsAHandleToAllowDismissingDialog() {
        try (ActivityController<ComponentActivity> controller = Robolectric.buildActivity(ComponentActivity.class)) {
            ComponentActivity activity = controller.get();
            CheckoutKitDialog dialog = ShopifyCheckoutKit.present(
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

            assertThat(dialog).isNotNull();
            assertThat(ShadowDialog.getLatestDialog().isShowing()).isTrue();

            dialog.dismiss();
            assertThat(ShadowDialog.getLatestDialog().isShowing()).isFalse();
        }
    }

    @Test
    public void canCustomizeColorSchemeWithSingleBlock() {
        ColorScheme.Light lightScheme = new ColorScheme.Light();
        Color tintColor = new Color.ResourceId(android.R.color.holo_red_dark);

        ColorScheme customized = lightScheme.customize(builder -> {
            builder.setCloseIconTint(tintColor);
            return null;
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
                    return null;
                },
                darkBuilder -> {
                    darkBuilder.setCloseIcon(customIcon);
                    darkBuilder.setCloseIconTint(darkTint);
                    return null;
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
            return null;
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
            // return null is slightly awkward, but we're prioritizing the kotlin interface
            return null;
        });

        assertThat(customized).isInstanceOf(ColorScheme.Web.class);
        ColorScheme.Web customizedWeb = (ColorScheme.Web) customized;
        Colors colors = customizedWeb.getColors();

        assertThat(colors.getWebViewBackground()).isEqualTo(webViewBg);
        assertThat(colors.getProgressIndicator()).isEqualTo(progressColor);
        assertThat(colors.getCloseIcon()).isEqualTo(icon);
    }
}

package com.shopify.compat;

import com.shopify.ucp.embedded.checkout.CheckoutStatus;
import com.shopify.ucp.embedded.checkout.EmbeddedCheckoutProtocol;
import com.shopify.ucp.embedded.checkout.FulfillmentDestination;
import com.shopify.ucp.embedded.checkout.InstrumentsChangeResultUcp;
import com.shopify.ucp.embedded.checkout.Item;
import com.shopify.ucp.embedded.checkout.LineItem;
import com.shopify.ucp.embedded.checkout.LineItemTotal;
import com.shopify.ucp.embedded.checkout.ReadyResult;
import com.shopify.ucp.embedded.checkout.UCPCheckoutResponseSchemaStatus;
import java.util.List;

/** Uses the protocol package the way a Java host does. */
final class JavaConsumer {
    private JavaConsumer() {}

    static LineItem updateLineItem(LineItem original) {
        return original.toBuilder().parentID("java-bundle").quantity(2L).build();
    }

    static String run() {
        InstrumentsChangeResultUcp ucp = new InstrumentsChangeResultUcp.Builder(
            UCPCheckoutResponseSchemaStatus.Success,
            EmbeddedCheckoutProtocol.SPEC_VERSION
        ).build();
        ReadyResult ready = new ReadyResult.Builder(ucp).continueURL("https://example.com/checkout").build();
        FulfillmentDestination destination = new FulfillmentDestination.Builder("dest-1")
            .streetAddress("1 Main St")
            .postalCode("K1A 0B1")
            .build();
        EmbeddedCheckoutProtocol.Options options = new EmbeddedCheckoutProtocol.Options.Builder()
            .colorScheme("dark")
            .build();
        String url = EmbeddedCheckoutProtocol.INSTANCE.url("https://example.com/checkout", options);

        LineItem lineItem = new LineItem.Builder(
            "line-1",
            new Item.Builder("gid://shopify/ProductVariant/1", 2500L, "T-shirt").build(),
            1L,
            List.of(new LineItemTotal.Builder(2500L, "subtotal").build())
        ).parentID("line-0").build();

        CheckoutStatus status = CheckoutStatus.Completed;
        if (!status.equals(CheckoutStatus.Completed) || !url.contains("ec_color_scheme=dark")) {
            throw new IllegalStateException("unexpected protocol behaviour");
        }
        return status.getValue() + ", " + ready.getContinueURL() + ", " + destination.getStreetAddress() + ", " + lineItem.getItem().getTitle();
    }
}

package com.shopify.benchmark.checkoutkit;

import androidx.appcompat.app.AppCompatActivity;

import com.shopify.checkoutkit.CheckoutFailureEvent;
import com.shopify.checkoutkit.DefaultCheckoutListener;
import com.shopify.checkoutkit.ShopifyCheckoutKit;

final class CheckoutAction {
    static void present(AppCompatActivity activity) {
        ShopifyCheckoutKit.present(
            "https://checkout.example/checkouts/benchmark",
            activity,
            new DefaultCheckoutListener() {
                @Override
                public void onCheckoutFailed(CheckoutFailureEvent event) {
                }

                @Override
                public void onCheckoutDismissed() {
                }
            }
        );
    }
}

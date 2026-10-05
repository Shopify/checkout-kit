package com.shopify.benchmark.checkoutkit;

import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

final class CheckoutAction {
    static void present(AppCompatActivity activity) {
        Toast.makeText(activity, R.string.baseline_message, Toast.LENGTH_SHORT).show();
    }
}

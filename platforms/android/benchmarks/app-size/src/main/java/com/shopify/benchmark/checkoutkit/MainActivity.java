package com.shopify.benchmark.checkoutkit;

import android.os.Bundle;
import android.widget.Button;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Button button = new Button(this);
        button.setText(R.string.checkout);
        button.setOnClickListener(view -> CheckoutAction.present(this));
        setContentView(button);
    }
}

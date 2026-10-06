package com.shopify.test.telemetry;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Log;

/**
 * Uses only Android framework APIs so the test APK does not require extra
 * entry points in dependencies that R8 has optimized inside the target APK.
 */
public final class TelemetryShrinkingTest extends Instrumentation {
    @Override
    public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        start();
    }

    @Override
    public void onStart() {
        Bundle status = new Bundle();
        status.putString("id", "InstrumentationTestRunner");
        status.putInt("numtests", 1);
        status.putInt("current", 1);
        status.putString("class", getClass().getName());
        status.putString("test", "optimizedCheckoutPreservesSerializationInflationAndWebMessages");
        sendStatus(1, status);
        try {
            exerciseCheckout();
            sendStatus(0, status);
        } catch (Throwable failure) {
            status.putString("stack", Log.getStackTraceString(failure));
            sendStatus(-2, status);
        } finally {
            finish(Activity.RESULT_OK, new Bundle());
        }
    }

    private void exerciseCheckout() {
        Intent intent = new Intent(getTargetContext(), SmokeActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            .putExtra("telemetry", !BuildConfig.TELEMETRY_INCLUDED);
        SmokeActivity activity = (SmokeActivity) startActivitySync(intent);
        try {
            runOnMainSync(() -> {
                if (activity.telemetryIncluded() != BuildConfig.TELEMETRY_INCLUDED) {
                    throw new AssertionError("The optimized build gate has the wrong value");
                }
                activity.startCheckout();
            });
            long deadline = SystemClock.elapsedRealtime() + 10000;
            boolean[] ready = {false};
            while (!ready[0] && SystemClock.elapsedRealtime() < deadline) {
                runOnMainSync(() -> ready[0] = activity.protocolReady());
                if (!ready[0]) SystemClock.sleep(50);
            }
            if (!ready[0]) {
                throw new AssertionError("The optimized WebMessage bridge must complete ec.ready");
            }
        } finally {
            runOnMainSync(activity::finish);
        }
    }
}

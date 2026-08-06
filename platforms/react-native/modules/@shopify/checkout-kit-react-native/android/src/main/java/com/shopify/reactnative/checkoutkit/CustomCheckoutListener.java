package com.shopify.reactnative.checkoutkit;

import android.util.Log;
import android.webkit.GeolocationPermissions;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.shopify.checkoutkit.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class CustomCheckoutListener extends DefaultCheckoutListener {
  private static final String TAG = "ShopifyCheckoutKit";

  private final ObjectMapper mapper = new ObjectMapper();

  private final DispatchHandle dispatch;

  // Geolocation-specific variables

  private String geolocationOrigin;
  private GeolocationPermissions.Callback geolocationCallback;

  public CustomCheckoutListener(@NonNull DispatchCallback dispatch) {
    this(new DispatchHandle(dispatch));
  }

  public CustomCheckoutListener(@NonNull DispatchHandle dispatch) {
    this.dispatch = dispatch;
  }

  // Public methods

  public void invokeGeolocationCallback(boolean allow) {
    if (geolocationCallback != null) {
      boolean retainGeolocationForFutureRequests = false;
      geolocationCallback.invoke(geolocationOrigin, allow, retainGeolocationForFutureRequests);
      geolocationCallback = null;
    }
  }

  public void release() {
    dispatch.release();
    geolocationCallback = null;
    geolocationOrigin = null;
  }

  // Lifecycle events

  /**
   * Called when the checkout sheet's webpage requests geolocation
   * permissions. The platform callback is stored in memory; the dispatcher
   * is invoked with a `geolocationRequest` envelope so JS can either route
   * to a per-call handler or run the default permission flow.
   *
   * Multi-shot — the same checkout sheet may request geolocation multiple
   * times during a single `present()` call, so the dispatcher is not
   * nulled after invocation.
   */
  @Override
  public void onGeolocationPermissionsShowPrompt(@NonNull String origin,
      @NonNull GeolocationPermissions.Callback callback) {

    if (dispatch.isReleased()) {
      // Multi-shot geolocation requests can in principle arrive after a
      // terminal event or explicit dismiss has released the dispatcher. Log
      // so the silence is observable rather than mystifying.
      Log.w(TAG, "Dropping geolocationRequest — dispatcher already released.");
      return;
    }

    this.geolocationCallback = callback;
    this.geolocationOrigin = origin;

    try {
      Map<String, Object> payload = new HashMap<>();
      payload.put("origin", origin);
      dispatch.invoke(buildEnvelope(DispatchEventTypes.GEOLOCATION_REQUEST, payload));
    } catch (IOException e) {
      Log.e(TAG, "Error emitting \"geolocationRequest\" event", e);
    }
  }

  @Override
  public void onGeolocationPermissionsHidePrompt() {
    super.onGeolocationPermissionsHidePrompt();

    this.geolocationCallback = null;
    this.geolocationOrigin = null;
  }

  @Override
  public void onCheckoutFailed(CheckoutException checkoutError) {
    if (dispatch.isReleased()) {
      return;
    }
    try {
      dispatch.invoke(buildEnvelope(DispatchEventTypes.FAIL, populateErrorDetails(checkoutError)));
    } catch (IOException e) {
      Log.e(TAG, "Error processing checkout failed event", e);
    } finally {
      release();
    }
  }

  @Override
  public void onCheckoutDismissed() {
    if (dispatch.isReleased()) {
      return;
    }
    try {
      dispatch.invoke(buildEnvelope(DispatchEventTypes.CLOSE, null));
    } catch (IOException e) {
      Log.e(TAG, "Error processing checkout dismissed event", e);
    } finally {
      release();
    }
  }

  // Private

  private String buildEnvelope(String type, @Nullable Object payload) throws IOException {
    ObjectNode envelope = mapper.createObjectNode();
    envelope.put("type", type);
    if (payload != null) {
      envelope.set("payload", mapper.valueToTree(payload));
    }
    return mapper.writeValueAsString(envelope);
  }

  private Map<String, Object> populateErrorDetails(CheckoutException checkoutError) {
    Map<String, Object> errorMap = new HashMap<>();
    errorMap.put("message", checkoutError.getMessage());
    errorMap.put("code", checkoutError.getCode().name().toLowerCase(Locale.ROOT));

    Integer httpStatusCode = checkoutError.getHttpStatusCode();
    if (httpStatusCode != null) {
      errorMap.put("statusCode", httpStatusCode);
    }

    return errorMap;
  }

}

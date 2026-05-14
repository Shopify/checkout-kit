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

package com.shopify.reactnative.checkoutkit;

import android.content.Context;
import android.util.Log;
import android.webkit.GeolocationPermissions;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.shopify.checkoutkit.*;
import com.facebook.react.bridge.Callback;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class CustomCheckoutListener extends DefaultCheckoutListener {
  private final ReactApplicationContext reactContext;
  private final ObjectMapper mapper = new ObjectMapper();

  @Nullable
  private Callback dispatchCallback;

  // Geolocation-specific variables

  private String geolocationOrigin;
  private GeolocationPermissions.Callback geolocationCallback;

  public CustomCheckoutListener(Context context, ReactApplicationContext reactContext,
      @Nullable Callback dispatch) {
    this.reactContext = reactContext;
    this.dispatchCallback = dispatch;
  }

  // Public methods

  public void invokeGeolocationCallback(boolean allow) {
    if (geolocationCallback != null) {
      boolean retainGeolocationForFutureRequests = false;
      geolocationCallback.invoke(geolocationOrigin, allow, retainGeolocationForFutureRequests);
      geolocationCallback = null;
    }
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

    this.geolocationCallback = callback;
    this.geolocationOrigin = origin;

    if (dispatchCallback == null) {
      return;
    }
    try {
      Map<String, Object> payload = new HashMap<>();
      payload.put("origin", origin);
      dispatchCallback.invoke(buildEnvelope("geolocationRequest", payload));
    } catch (IOException e) {
      Log.e("ShopifyCheckoutKit", "Error emitting \"geolocationRequest\" event", e);
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
    if (dispatchCallback == null) {
      return;
    }
    try {
      dispatchCallback.invoke(buildEnvelope("fail", populateErrorDetails(checkoutError)));
    } catch (IOException e) {
      Log.e("ShopifyCheckoutKit", "Error processing checkout failed event", e);
    } finally {
      dispatchCallback = null;
    }
  }

  @Override
  public void onCheckoutCanceled() {
    if (dispatchCallback == null) {
      return;
    }
    try {
      dispatchCallback.invoke(buildEnvelope("close", null));
    } catch (IOException e) {
      Log.e("ShopifyCheckoutKit", "Error processing checkout canceled event", e);
    } finally {
      dispatchCallback = null;
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
    Map<String, Object> errorMap = new HashMap();
    errorMap.put("__typename", getErrorTypeName(checkoutError));
    errorMap.put("message", checkoutError.getErrorDescription());
    errorMap.put("recoverable", checkoutError.isRecoverable());
    errorMap.put("code", checkoutError.getErrorCode());

    if (checkoutError instanceof HttpException) {
      errorMap.put("statusCode", ((HttpException) checkoutError).getStatusCode());
    }

    return errorMap;
  }

  private String getErrorTypeName(CheckoutException error) {
    if (error instanceof CheckoutExpiredException) {
      return "CheckoutExpiredError";
    } else if (error instanceof ClientException) {
      return "CheckoutClientError";
    } else if (error instanceof HttpException) {
      return "CheckoutHTTPError";
    } else if (error instanceof ConfigurationException) {
      return "ConfigurationError";
    } else if (error instanceof CheckoutKitException) {
      return "InternalError";
    } else {
      return "UnknownError";
    }
  }

  private void sendEventWithStringData(String name, String data) {
    reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
        .emit(name, data);
  }
}

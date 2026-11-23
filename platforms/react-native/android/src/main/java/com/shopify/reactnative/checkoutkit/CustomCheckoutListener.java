package com.shopify.reactnative.checkoutkit;

import android.util.Log;
import android.webkit.GeolocationPermissions;

import androidx.annotation.NonNull;

import com.shopify.checkoutkit.checkout.*;

public class CustomCheckoutListener extends DefaultCheckoutListener {
  private static final String TAG = "ShopifyCheckoutKit";

  private final DispatchHandle dispatch;
  private CheckoutLinkAction linkAction = CheckoutLinkAction.Default;
  private Runnable onTerminal = () -> {};

  public void configure(String action, Runnable onTerminal) {
    this.linkAction = "handled".equals(action) ? CheckoutLinkAction.Handled
        : "cancel".equals(action) ? CheckoutLinkAction.Cancel : CheckoutLinkAction.Default;
    this.onTerminal = onTerminal;
  }

  public boolean isReleased() { return dispatch.isReleased(); }

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
    invokeGeolocationCallback(false);
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

    dispatch.invoke(CheckoutEventSerialization.geolocationRequest(origin));
  }

  @Override
  public void onGeolocationPermissionsHidePrompt() {
    super.onGeolocationPermissionsHidePrompt();

    this.geolocationCallback = null;
    this.geolocationOrigin = null;
  }

  /**
   * A failure that closes checkout is followed by {@link #onCheckoutDismissed()},
   * which ends the session.
   */
  @Override
  public void onCheckoutFailed(CheckoutFailureEvent event) {
    if (dispatch.isReleased()) {
      return;
    }
    dispatch.invoke(CheckoutEventSerialization.fail(event.getError()));
  }

  @Override
  public void onCheckoutDismissed() {
    if (dispatch.isReleased()) {
      return;
    }
    try {
      onTerminal.run();
      dispatch.invoke(CheckoutEventSerialization.dismiss());
    } finally {
      release();
    }
  }

  @Override
  public void onCheckoutStarted(CheckoutStartEvent event) {
    emitCheckout(DispatchEventTypes.START, event.getCheckout());
  }

  @Override
  public void onCheckoutUpdated(CheckoutUpdateEvent event) {
    emitCheckout(DispatchEventTypes.UPDATE, event.getCheckout());
  }

  @Override
  public void onCheckoutCompleted(CheckoutCompleteEvent event) {
    emitCheckout(DispatchEventTypes.COMPLETE, event.getCheckout());
  }

  @Override
  public CheckoutLinkAction onCheckoutLinkClicked(CheckoutLink link) {
    if (dispatch.isReleased()) return CheckoutLinkAction.Cancel;
    dispatch.invoke(CheckoutEventSerialization.linkClick(link.getUrl().toString()));
    return linkAction;
  }

  private void emitCheckout(String type, Checkout checkout) {
    if (dispatch.isReleased()) return;
    try {
      dispatch.invoke(CheckoutEventSerialization.checkout(type, checkout));
    } catch (Exception e) {
      Log.e(TAG, "Error serializing checkout event");
    }
  }

}

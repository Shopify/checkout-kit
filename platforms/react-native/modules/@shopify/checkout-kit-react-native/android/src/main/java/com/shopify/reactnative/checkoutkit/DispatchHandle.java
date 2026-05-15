package com.shopify.reactnative.checkoutkit;

import androidx.annotation.NonNull;

/**
 * Shared per-presentation dispatch handle.
 *
 * SDK lifecycle events and protocol events both invoke the same handle. Terminal
 * lifecycle events release it so subsequent protocol emissions are dropped,
 * matching the iOS pendingDispatchCallback lifecycle.
 */
public class DispatchHandle implements DispatchCallback {
  private final DispatchCallback downstream;
  private boolean released = false;

  public DispatchHandle(@NonNull DispatchCallback downstream) {
    this.downstream = downstream;
  }

  @Override
  public synchronized void invoke(String json) {
    if (!released) {
      downstream.invoke(json);
    }
  }

  public synchronized void release() {
    released = true;
  }

  public synchronized boolean isReleased() {
    return released;
  }
}

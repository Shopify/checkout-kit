package com.shopify.reactnative.checkoutkit;

import androidx.annotation.NonNull;

/** Gates events after a checkout presentation ends. */
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

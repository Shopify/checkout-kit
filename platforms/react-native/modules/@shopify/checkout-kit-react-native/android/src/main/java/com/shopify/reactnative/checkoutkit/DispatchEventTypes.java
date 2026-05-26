package com.shopify.reactnative.checkoutkit;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Canonical list of SDK lifecycle event types emitted by the
 * per-{@code present()} dispatcher.
 *
 * Mirrors {@code SDK_LIFECYCLE_EVENT_TYPES} in the JS package and
 * {@code DispatchEventType} on iOS. Exposed to JS via
 * {@code getTypedExportedConstants()} so the JS layer can verify the
 * two sides agree at construction time.
 */
public final class DispatchEventTypes {
  public static final String CLOSE = "close";
  public static final String FAIL = "fail";
  public static final String GEOLOCATION_REQUEST = "geolocationRequest";

  public static final List<String> ALL = Collections.unmodifiableList(
      Arrays.asList(CLOSE, FAIL, GEOLOCATION_REQUEST));

  private DispatchEventTypes() {}
}

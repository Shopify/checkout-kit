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
  public static final String START = "start";
  public static final String UPDATE = "update";
  public static final String COMPLETE = "complete";
  public static final String DISMISS = "dismiss";
  public static final String LINK_CLICK = "linkClick";
  public static final String FAIL = "fail";
  public static final String GEOLOCATION_REQUEST = "geolocationRequest";

  public static final List<String> ALL = Collections.unmodifiableList(
      Arrays.asList(START, UPDATE, COMPLETE, DISMISS, FAIL, LINK_CLICK, GEOLOCATION_REQUEST));

  private DispatchEventTypes() {}
}

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
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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

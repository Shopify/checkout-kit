// Default every test to a telemetry client with a stubbed transport so no
// test can post metrics to the production OTLP endpoint.
import { installTestTelemetryFactory } from "./src/telemetry.test-helpers";
import { beforeEach, vi } from "vitest";

installTestTelemetryFactory();
const createElement = document.createElement.bind(document);

beforeEach(() => {
  vi.spyOn(document, "createElement").mockImplementation((name, options) => {
    const element = createElement(name, options);
    // happy-dom disables about:blank creation with remote iframe loading.
    // Empty srcdoc creates its real browsing context without any network fetch;
    // tests still send messages from the iframe's actual contentWindow.
    if (element instanceof HTMLIFrameElement) element.srcdoc = "";
    return element;
  });
});

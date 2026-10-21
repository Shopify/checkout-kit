// Default every test to a telemetry client with a stubbed transport so no
// test can post metrics to the production OTLP endpoint.
import { installTestTelemetryFactory } from "@shopify/checkout-kit-core/checkout/testing";

installTestTelemetryFactory();

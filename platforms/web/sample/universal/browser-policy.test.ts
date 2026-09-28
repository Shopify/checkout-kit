import { afterEach, describe, expect, it } from "vitest";

import { isConfiguredContinuationUrl, setDevelopmentContinuationHost } from "./browser-policy";

const PRODUCTION_URL = "https://shop.app/checkouts/uc/synthetic?key=synthetic";
const DEVELOPMENT_URL = "https://continue.example.test/checkouts/uc/synthetic?key=synthetic";

describe("Universal sample browser destination policy", () => {
  afterEach(() => setDevelopmentContinuationHost(undefined));

  it("uses the configured development host while keeping production exact", () => {
    expect(isConfiguredContinuationUrl(PRODUCTION_URL, "production")).toBe(true);
    expect(isConfiguredContinuationUrl(DEVELOPMENT_URL, "development")).toBe(false);

    setDevelopmentContinuationHost("continue.example.test");
    expect(isConfiguredContinuationUrl(DEVELOPMENT_URL, "development")).toBe(true);
    expect(isConfiguredContinuationUrl(PRODUCTION_URL, "development")).toBe(false);
    expect(
      isConfiguredContinuationUrl(
        "https://continue.example.test.evil.test/checkouts/uc/synthetic?key=synthetic",
        "development",
      ),
    ).toBe(false);
  });
});

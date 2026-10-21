import { afterEach, describe, expect, it, vi } from "vitest";

import { coerceLogLevel, DEFAULT_LOG_LEVEL, Logger } from "./logger";

describe("coerceLogLevel", () => {
  it.each([
    ["debug", "debug"],
    ["warn", "warn"],
    ["error", "error"],
    ["none", "none"],
    [null, DEFAULT_LOG_LEVEL],
    ["verbose", DEFAULT_LOG_LEVEL],
  ] as const)("coerces %s to %s", (value, expected) => {
    expect(coerceLogLevel(value)).toBe(expected);
  });
});

describe("Logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["debug", 1, 1, 1],
    ["warn", 0, 1, 1],
    ["error", 0, 0, 1],
    ["none", 0, 0, 0],
  ] as const)(
    "emits only messages at or above the %s threshold",
    (level, debugCalls, warnCalls, errorCalls) => {
      const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const logger = new Logger("<checkout>", () => level);

      logger.debug("debug message", { debug: true });
      logger.warn("warning message", { warn: true });
      logger.error("error message", { error: true });

      expect(debug).toHaveBeenCalledTimes(debugCalls);
      expect(warn).toHaveBeenCalledTimes(warnCalls);
      expect(error).toHaveBeenCalledTimes(errorCalls);
    },
  );

  it("reads the threshold lazily", () => {
    let level: "debug" | "none" = "none";
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const logger = new Logger("<checkout>", () => level);

    logger.debug("before changing level");
    level = "debug";
    logger.debug("after changing level");

    expect(debug).toHaveBeenCalledTimes(1);
    expect(debug).toHaveBeenCalledWith("<checkout>: after changing level");
  });
});

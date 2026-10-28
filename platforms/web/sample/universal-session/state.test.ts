import { describe, expect, it } from "vitest";

import {
  createInitialState,
  selectActiveSourceUrl,
  selectCanPrepare,
  selectExpressNotice,
  selectOutcome,
  selectSession,
  selectSessionInputKey,
  selectStoresWithLines,
  validateAddStore,
  type AppState,
  type SettingsSlice,
  type StoreState,
} from "./state";

const SHOP_PAY_PAGE = { tag: "shop-pay", productName: "Shop Pay", button: true } as const;

const CONTINUE_URL = "https://shop.app/checkouts/uc/session-1?key=synthetic-key";
const DOMAIN = "your-store.myshopify.com";

function state(overrides: Partial<AppState> = {}): AppState {
  const settings: SettingsSlice = {
    sourceMode: "build",
    storefrontDomain: "",
    storeDomains: [],
    environment: "production",
    buyerCountry: "",
    button: true,
    target: "popup",
    logLevel: "warn",
    manualSrc: "",
    settingsCollapsed: false,
    eventsCollapsed: false,
  };
  return {
    ...createInitialState(settings),
    configuration: { status: "loaded", environments: ["production"], storeDomains: [] },
    stores: [
      {
        domain: DOMAIN,
        variants: [],
        cartLines: [{ variantId: "1", quantity: 1 }],
        loadState: "loaded",
      },
    ],
    ...overrides,
  };
}

function ready(base: AppState): AppState {
  return {
    ...base,
    session: {
      status: "ready",
      inputKey: selectSessionInputKey(base),
      continueUrl: CONTINUE_URL,
      currencyCode: "CAD",
    },
  };
}

function preparing(base: AppState): AppState {
  return { ...base, session: { status: "preparing", inputKey: selectSessionInputKey(base) } };
}

describe("selectSession", () => {
  it("keeps a session prepared from the current cart and settings", () => {
    const current = ready(state());
    expect(selectSession(current).status).toBe("ready");
    expect(selectActiveSourceUrl(current)).toBe(CONTINUE_URL);
  });

  it.each([
    [
      "a cart line",
      {
        stores: [
          {
            domain: DOMAIN,
            variants: [],
            cartLines: [{ variantId: "1", quantity: 2 }],
            loadState: "loaded" as const,
          },
        ],
      },
    ],
    [
      "a store",
      {
        stores: [
          {
            domain: "other.myshopify.com",
            variants: [],
            cartLines: [{ variantId: "1", quantity: 1 }],
            loadState: "loaded" as const,
          },
        ],
      },
    ],
    ["the environment", { environment: "development" as const }],
    ["the buyer country", { buyerCountry: "US" as const }],
  ])("discards the session when %s changes", (_, change) => {
    const changed = { ...ready(state()), ...change };
    expect(selectSession(changed)).toEqual({ status: "idle" });
    expect(selectActiveSourceUrl(changed)).toBe("");
  });
});

describe("selectActiveSourceUrl", () => {
  it("uses a pasted HTTPS URL, trimmed, in manual mode", () => {
    expect(
      selectActiveSourceUrl(state({ sourceMode: "manual", manualSrc: ` ${CONTINUE_URL} ` })),
    ).toBe(CONTINUE_URL);
    expect(
      selectActiveSourceUrl(state({ sourceMode: "manual", manualSrc: "https://example.test/x" })),
    ).toBe("https://example.test/x");
    expect(selectActiveSourceUrl(state({ sourceMode: "manual", manualSrc: "not a url" }))).toBe("");
  });

  it("ignores a prepared session in manual mode", () => {
    expect(selectActiveSourceUrl({ ...ready(state()), sourceMode: "manual" })).toBe("");
  });
});

describe("selectStoresWithLines", () => {
  it("returns stores that have at least one cart line", () => {
    const base = state({
      stores: [
        { domain: "one.myshopify.com", variants: [], cartLines: [], loadState: "loaded" },
        {
          domain: "two.myshopify.com",
          variants: [],
          cartLines: [{ variantId: "1", quantity: 1 }],
          loadState: "loaded",
        },
        {
          domain: "three.myshopify.com",
          variants: [],
          cartLines: [{ variantId: "2", quantity: 1 }],
          loadState: "loaded",
        },
      ],
    });
    const withLines = selectStoresWithLines(base);
    expect(withLines).toHaveLength(2);
    expect(withLines.map((s) => s.domain)).toEqual(["two.myshopify.com", "three.myshopify.com"]);
  });
});

describe("selectCanPrepare", () => {
  it("allows preparing when at least one store has lines in a configured environment", () => {
    expect(selectCanPrepare(state())).toBe(true);
    expect(selectCanPrepare(state({ configuration: { status: "loading" } }))).toBe(true);
  });

  it.each([
    ["no stores with lines", state({ stores: [] })],
    [
      "stores without lines",
      state({ stores: [{ domain: DOMAIN, variants: [], cartLines: [], loadState: "loaded" }] }),
    ],
    ["an unconfigured environment", state({ environment: "development" })],
    ["no sample server", state({ configuration: { status: "unavailable" } })],
    ["manual mode", state({ sourceMode: "manual" })],
    ["a session in progress", preparing(state())],
    ["a ready session", ready(state())],
  ])("refuses %s", (_, value) => {
    expect(selectCanPrepare(value)).toBe(false);
  });
});

describe("selectOutcome", () => {
  it("applies only to the source it happened to", () => {
    const completed = {
      ...ready(state()),
      outcome: { src: CONTINUE_URL, kind: "completed" as const },
    };
    expect(selectOutcome(completed)).toEqual({ src: CONTINUE_URL, kind: "completed" });
    expect(selectOutcome({ ...completed, stores: [] })).toBeUndefined();
  });
});

describe("selectExpressNotice", () => {
  it("guides the build flow", () => {
    expect(selectExpressNotice(state({ stores: [] }), SHOP_PAY_PAGE)).toMatchObject({
      tone: "info",
      message: expect.stringContaining("Add a store"),
    });
    expect(
      selectExpressNotice(
        state({ stores: [{ domain: DOMAIN, variants: [], cartLines: [], loadState: "loaded" }] }),
        SHOP_PAY_PAGE,
      ),
    ).toMatchObject({
      tone: "info",
      message: expect.stringContaining("Add products"),
    });
    expect(selectExpressNotice(state(), SHOP_PAY_PAGE).message).toBe(
      "Prepare a session to show Shop Pay's button.",
    );
    expect(selectExpressNotice(state({ button: false }), SHOP_PAY_PAGE).message).toBe(
      "Prepare a session to enable Buy with Shop Pay.",
    );
    expect(selectExpressNotice(ready(state()), SHOP_PAY_PAGE)).toEqual({
      tone: "success",
      message: "Session ready for 1 store in CAD. Tap Shop Pay's button to open it.",
    });
  });

  it("shows the store count when preparing", () => {
    const twoStores = state({
      stores: [
        {
          domain: "one.myshopify.com",
          variants: [],
          cartLines: [{ variantId: "1", quantity: 1 }],
          loadState: "loaded",
        },
        {
          domain: "two.myshopify.com",
          variants: [],
          cartLines: [{ variantId: "2", quantity: 1 }],
          loadState: "loaded",
        },
      ],
    });
    expect(selectExpressNotice(preparing(twoStores), SHOP_PAY_PAGE).message).toContain("2 stores");
  });

  it("explains missing configuration and failures", () => {
    expect(selectExpressNotice(state({ environment: "development" }), SHOP_PAY_PAGE)).toMatchObject(
      {
        tone: "error",
        message: expect.stringContaining("CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL"),
      },
    );
    expect(
      selectExpressNotice(state({ configuration: { status: "unavailable" } }), SHOP_PAY_PAGE).tone,
    ).toBe("error");
    const base = state();
    expect(
      selectExpressNotice(
        {
          ...base,
          session: { status: "failed", inputKey: selectSessionInputKey(base), message: "Nope." },
        },
        SHOP_PAY_PAGE,
      ),
    ).toEqual({ tone: "error", message: "Nope." });
  });

  it("reports how the session ended", () => {
    const base = ready(state());
    expect(
      selectExpressNotice(
        { ...base, outcome: { src: CONTINUE_URL, kind: "completed" } },
        SHOP_PAY_PAGE,
      ),
    ).toMatchObject({ tone: "success", message: expect.stringContaining("completed") });
    expect(
      selectExpressNotice(
        {
          ...base,
          outcome: { src: CONTINUE_URL, kind: "ended", code: "expired" },
        },
        SHOP_PAY_PAGE,
      ),
    ).toMatchObject({ tone: "error", message: expect.stringContaining("expired") });
  });

  it("checks a pasted URL", () => {
    const manual = (manualSrc: string) =>
      selectExpressNotice(state({ sourceMode: "manual", manualSrc }), SHOP_PAY_PAGE);
    expect(manual("").tone).toBe("info");
    expect(manual("http://example.test")).toEqual({
      tone: "error",
      message: "Enter an HTTPS URL.",
    });
    expect(manual("https://example.test/cart").message).toBe(
      "This doesn't look like a Universal session URL. <shop-pay> will still try to open it.",
    );
    expect(manual(CONTINUE_URL)).toEqual({
      tone: "success",
      message: "Ready. Tap Shop Pay's button to open it.",
    });
  });
});

describe("validateAddStore", () => {
  it("accepts a valid new domain", () => {
    expect(validateAddStore(state({ stores: [] }), "example.myshopify.com")).toEqual({
      valid: true,
    });
  });

  it("rejects empty input", () => {
    expect(validateAddStore(state(), "")).toEqual({
      valid: false,
      message: "Enter a storefront domain.",
    });
  });

  it("rejects invalid domains", () => {
    expect(validateAddStore(state(), "not-a-domain")).toEqual({
      valid: false,
      message: "Enter a valid domain, like your-store.myshopify.com.",
    });
  });

  it("rejects duplicates", () => {
    expect(validateAddStore(state(), DOMAIN)).toEqual({
      valid: false,
      message: "This store is already in the list.",
    });
  });

  it("rejects when the limit is reached", () => {
    const stores: StoreState[] = Array(15)
      .fill(null)
      .map((_, i) => ({
        domain: `store-${i}.myshopify.com`,
        variants: [],
        cartLines: [],
        loadState: "loaded" as const,
      }));
    expect(validateAddStore(state({ stores }), "new.myshopify.com")).toEqual({
      valid: false,
      message: "This sample supports at most 15 stores.",
    });
  });
});

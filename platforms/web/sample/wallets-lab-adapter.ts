import type {
  WalletAdapter,
  WalletAdapterOutcome,
  WalletAdapterRequest,
} from "../src/wallets-adapter";

export type WalletLabScenario =
  | "ready"
  | "partial"
  | "slow-ready"
  | "no-wallet"
  | "setup-error"
  | "cart-refresh-error";

export interface WalletLabSettings {
  scenario: WalletLabScenario;
  delayMs: number;
}

export interface WalletLabEvent {
  source: "adapter" | "wallet";
  name: string;
  detail?: Record<string, boolean | number | string>;
}

type EventRecorder = (event: WalletLabEvent) => void;

const WALLET_LABELS: Record<string, string> = {
  apple_pay: "Apple Pay",
  paypal: "PayPal",
  shop_pay: "Shop Pay",
};

const MOCK_WALLETS = ["shop_pay", "apple_pay", "paypal"] as const;

export class WalletLabAdapter implements WalletAdapter {
  #request: WalletAdapterRequest | undefined;
  #releasePending: (() => void) | undefined;

  constructor(
    private readonly settings: () => WalletLabSettings,
    private readonly record: EventRecorder,
  ) {}

  async start(request: WalletAdapterRequest): Promise<WalletAdapterOutcome> {
    this.#request = request;
    const { scenario, delayMs } = this.settings();
    this.record({
      source: "adapter",
      name: "start",
      detail: {
        flow: request.purchase.cartId ? "cart" : "product",
        layout: request.layout ?? "horizontal",
        scenario,
        walletCount: request.walletCount,
      },
    });

    await this.#wait(request.signal, scenario === "slow-ready" ? undefined : delayMs);
    if (request.signal.aborted) return { status: "unavailable", reason: "setup_error" };

    if (scenario === "setup-error") throw new Error("Fixture setup failure");
    if (scenario === "no-wallet") return { status: "unavailable", reason: "no_wallet" };

    const available = scenario === "partial" ? MOCK_WALLETS.slice(0, 2) : MOCK_WALLETS;
    const wallets = request.walletCount > 0 ? available.slice(0, request.walletCount) : available;
    const failed = scenario === "partial" ? ["paypal"] : [];

    this.#renderWallets(request, wallets);
    return { status: "ready", wallets, failed };
  }

  stop(): void {
    this.release();
    this.#request = undefined;
    this.record({ source: "adapter", name: "stop" });
  }

  async cartUpdated(): Promise<void> {
    const request = this.#request;
    if (!request || request.signal.aborted) return;

    const { scenario, delayMs } = this.settings();
    this.record({ source: "adapter", name: "cartUpdated:start" });
    await this.#wait(request.signal, Math.min(delayMs, 800));
    if (request.signal.aborted) return;

    if (scenario === "cart-refresh-error") {
      this.record({ source: "adapter", name: "cartUpdated:failed" });
      throw new Error("Fixture cart refresh failure");
    }

    this.record({ source: "adapter", name: "cartUpdated:complete" });
  }

  release(): void {
    this.#releasePending?.();
    this.#releasePending = undefined;
  }

  #renderWallets(request: WalletAdapterRequest, wallets: ReadonlyArray<string>): void {
    const style = document.createElement("style");
    style.textContent = `
      .fixture-wallet-grid {
        display: grid;
        grid-template-columns: repeat(var(--fixture-columns), minmax(0, 1fr));
        gap: 0.75rem;
        width: 100%;
      }
      .fixture-wallet {
        min-height: 3rem;
        border: 1px solid #202223;
        border-radius: 0.6rem;
        background: #202223;
        color: white;
        font: 600 0.9rem/1 system-ui, sans-serif;
        cursor: pointer;
      }
      .fixture-wallet:hover { background: #333638; }
      .fixture-wallet:focus-visible { outline: 3px solid #2c6ecb; outline-offset: 2px; }
      .fixture-wallet[disabled] { cursor: wait; opacity: 0.58; }
      .fixture-wallet-status {
        margin: 0.65rem 0 0;
        color: #4a4e52;
        font: 500 0.78rem/1.4 system-ui, sans-serif;
      }
    `;

    const grid = document.createElement("div");
    grid.className = "fixture-wallet-grid";
    const columns = request.layout === "vertical" ? 1 : Math.max(wallets.length, 1);
    grid.style.setProperty("--fixture-columns", String(columns));

    const status = document.createElement("p");
    status.className = "fixture-wallet-status";
    status.setAttribute("role", "status");
    status.textContent = "Select a fixture wallet to exercise activation.";

    for (const wallet of wallets) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fixture-wallet";
      button.textContent = WALLET_LABELS[wallet] ?? wallet;
      button.addEventListener("click", () => void this.#activate(request, wallet, grid, status));
      grid.append(button);
    }

    request.mount.replaceChildren(style, grid, status);
  }

  async #activate(
    request: WalletAdapterRequest,
    wallet: string,
    grid: HTMLElement,
    status: HTMLElement,
  ): Promise<void> {
    const label = WALLET_LABELS[wallet] ?? wallet;
    status.textContent = `Activating ${label} fixture...`;
    this.record({ source: "wallet", name: "activate", detail: { wallet } });
    const buttons = Array.from(grid.querySelectorAll("button"));
    for (const button of buttons) button.disabled = true;

    try {
      if (request.getCart) {
        await request.getCart({ purchase: request.purchase, wallet, signal: request.signal });
        this.record({ source: "wallet", name: "getCart:resolved", detail: { wallet } });
      }
      status.textContent = `${label} fixture completed. No payment was attempted.`;
      this.record({ source: "wallet", name: "fixture:complete", detail: { wallet } });
    } catch {
      status.textContent = `${label} fixture activation failed.`;
      this.record({ source: "wallet", name: "fixture:failed", detail: { wallet } });
    } finally {
      for (const button of buttons) button.disabled = false;
    }
  }

  #wait(signal: AbortSignal, delayMs: number | undefined): Promise<void> {
    if (signal.aborted) return Promise.resolve();

    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort: (() => void) | undefined;
    const aborted = new Promise<void>((resolve) => {
      onAbort = () => resolve();
      signal.addEventListener("abort", onAbort, { once: true });
    });
    const elapsed = new Promise<void>((resolve) => {
      if (delayMs === undefined) this.#releasePending = resolve;
      else timer = setTimeout(resolve, Math.max(0, delayMs));
    });

    return Promise.race([aborted, elapsed]).finally(() => {
      if (timer) clearTimeout(timer);
      if (onAbort) signal.removeEventListener("abort", onAbort);
      this.#releasePending = undefined;
    });
  }
}

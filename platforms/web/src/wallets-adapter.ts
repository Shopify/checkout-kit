import type { GetCart, WalletLayout, WalletPurchaseSnapshot } from "./wallets.types";

export interface WalletAdapterRequest {
  purchase: Readonly<WalletPurchaseSnapshot>;
  walletCount: number;
  layout?: WalletLayout;
  getCart?: GetCart;
  /** Private mount owned by Checkout Kit. Adapter content is cleared on stop. */
  mount: HTMLElement;
  signal: AbortSignal;
}

export type WalletAdapterOutcome =
  | { status: "ready"; wallets: ReadonlyArray<string>; failed?: ReadonlyArray<string> }
  | { status: "unavailable"; reason: "no_wallet" | "setup_error" };

export interface WalletAdapter {
  start(request: WalletAdapterRequest): Promise<WalletAdapterOutcome>;
  stop?(): void;
  cartUpdated?(): void | Promise<void>;
}

type WalletAdapterFactory = () => WalletAdapter | undefined;

let factory: WalletAdapterFactory = () => undefined;

export function createWalletAdapter(): WalletAdapter | undefined {
  return factory();
}

export function setWalletAdapterFactoryForTesting(nextFactory?: WalletAdapterFactory): void {
  factory = nextFactory ?? (() => undefined);
}

/** Installs a deterministic adapter for the local sample only. */
export function setWalletAdapterFactoryForDevelopment(nextFactory: WalletAdapterFactory): void {
  factory = nextFactory;
}

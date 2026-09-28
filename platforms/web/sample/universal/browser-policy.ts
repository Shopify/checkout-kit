import { canonicalBareDomain, isContinuationUrl, type CheckoutEnvironment } from "./policy";

let developmentHost: string | undefined;

export function setDevelopmentContinuationHost(value: string | undefined): void {
  developmentHost = canonicalBareDomain(value) ?? undefined;
}

/** Use the same exact continuation host for cart preparation and opening. */
export function isConfiguredContinuationUrl(
  value: unknown,
  environment: CheckoutEnvironment,
): value is string {
  return isContinuationUrl(value, environment, developmentHost);
}

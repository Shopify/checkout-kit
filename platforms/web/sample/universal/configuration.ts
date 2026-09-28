import { canonicalBareDomain, MAX_SESSION_CARTS, SAMPLE_API_PATHS } from "./policy";

export interface SampleConfiguration {
  shopDomains: string[];
  developmentContinuationHost?: string;
}

/** Fetch only the fields needed by the page; environment values never enter its build. */
export async function loadSampleConfiguration(): Promise<SampleConfiguration> {
  const response = await fetch(SAMPLE_API_PATHS.configuration, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
    credentials: "same-origin",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Sample configuration is unavailable.");
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid sample configuration.");
  }
  const { shopDomains, developmentContinuationHost } = data as Record<string, unknown>;
  if (
    !Array.isArray(shopDomains) ||
    shopDomains.length > MAX_SESSION_CARTS ||
    !shopDomains.every(
      (domain) => typeof domain === "string" && canonicalBareDomain(domain) === domain,
    ) ||
    (developmentContinuationHost !== undefined &&
      (typeof developmentContinuationHost !== "string" ||
        canonicalBareDomain(developmentContinuationHost) !== developmentContinuationHost))
  ) {
    throw new Error("Invalid sample configuration.");
  }
  return {
    shopDomains: [...new Set(shopDomains as string[])],
    ...(developmentContinuationHost ? { developmentContinuationHost } : {}),
  };
}

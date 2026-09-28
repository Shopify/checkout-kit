import { flattenProductVariants, type ProductVariantOption } from "../cart";
import { SAMPLE_API_PATHS } from "./policy";

export type CatalogLoader = (
  domain: string,
  signal: AbortSignal,
) => Promise<ProductVariantOption[]>;

/** Load public catalog data through the sample's fixed-path local adapter. */
export const loadCatalog: CatalogLoader = async (domain, signal) => {
  const response = await fetch(SAMPLE_API_PATHS.catalog, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain }),
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) throw new Error("Catalog request failed");
  const data = (await response.json()) as Parameters<typeof flattenProductVariants>[0];
  return flattenProductVariants(data);
};

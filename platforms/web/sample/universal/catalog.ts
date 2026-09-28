import { fetchProductVariants, type ProductVariantOption } from "../cart";

export type CatalogLoader = (
  domain: string,
  signal: AbortSignal,
) => Promise<ProductVariantOption[]>;

/** Keep the existing products.json mapping while allowing each shop to cancel its own request. */
export const loadCatalog: CatalogLoader = (domain, signal) =>
  fetchProductVariants(domain, (url) => fetch(url, { signal }));

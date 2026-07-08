export interface CartLine {
  variantId: string;
  quantity: number;
}

export interface ProductVariantOption {
  id: string;
  title: string;
  productTitle: string;
  variantTitle: string;
  vendor: string;
  price: string;
  available: boolean;
  imageUrl?: string;
}

type ProductsJsonFetcher = (url: string) => Promise<ProductsJsonResponseLike>;

interface ProductsJsonResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<ProductsJsonResponse>;
}

interface ProductsJsonResponse {
  products?: ProductJson[];
}

interface ProductJson {
  title?: string;
  vendor?: string;
  images?: ProductImageJson[];
  image?: ProductImageJson;
  variants?: ProductVariantJson[];
}

interface ProductImageJson {
  src?: string;
}

interface ProductVariantJson {
  id?: string | number;
  title?: string;
  price?: string | number;
  available?: boolean;
}

export function normalizeStorefrontDomain(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.hostname.toLowerCase();
  } catch {
    const fallbackDomain = trimmed.replace(/^https?:\/\//i, "").split("/")[0] ?? "";
    return fallbackDomain.replace(/\/+$/, "").toLowerCase();
  }
}

export function isLikelyStorefrontDomain(value: string): boolean {
  const domain = normalizeStorefrontDomain(value);
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain);
}

export function buildProductsJsonUrl(storefrontDomain: string): string {
  const domain = normalizeStorefrontDomain(storefrontDomain);
  if (!domain) {
    throw new Error("Enter a storefront domain before loading products.");
  }

  return `https://${domain}/products.json`;
}

export async function fetchProductVariants(
  storefrontDomain: string,
  fetcher: ProductsJsonFetcher = fetch,
): Promise<ProductVariantOption[]> {
  const productsUrl = buildProductsJsonUrl(storefrontDomain);
  let response: ProductsJsonResponseLike;

  try {
    response = await fetcher(productsUrl);
  } catch (error) {
    throw new Error(
      `Could not load products from ${productsUrl}. Confirm the storefront domain is reachable and try again.`,
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new Error(
      `Could not load products from ${productsUrl} (HTTP ${response.status}). Confirm the storefront domain is correct and products are published to the Online Store channel.`,
    );
  }

  const variants = flattenProductVariants(await response.json());
  if (variants.length === 0) {
    throw new Error(
      `No product variants were found at ${productsUrl}. Add products, publish them to the Online Store channel, and try again.`,
    );
  }

  return variants;
}

export function flattenProductVariants(data: ProductsJsonResponse): ProductVariantOption[] {
  const variants = (data.products ?? []).flatMap((product) => {
    const productTitle = product.title ?? "Untitled product";
    const vendor = product.vendor ?? "";
    const imageUrl = product.images?.[0]?.src ?? product.image?.src;

    return (product.variants ?? [])
      .filter((variant) => variant.id !== undefined && variant.id !== null)
      .map((variant) => {
        const variantTitle = variant.title ?? "Default Title";
        const title =
          variantTitle && variantTitle !== "Default Title"
            ? `${productTitle} - ${variantTitle}`
            : productTitle;

        return {
          id: String(variant.id),
          title,
          productTitle,
          variantTitle,
          vendor,
          price: String(variant.price ?? ""),
          available: variant.available !== false,
          imageUrl,
        };
      });
  });

  variants.sort((first, second) => {
    if (first.available !== second.available) {
      return first.available ? -1 : 1;
    }

    return first.title.localeCompare(second.title, undefined, { sensitivity: "base" });
  });

  return variants;
}

export function normalizeQuantity(value: unknown): number {
  const quantity = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(999, Math.max(1, Math.floor(quantity)));
}

export function upsertCartLine(
  lines: readonly CartLine[],
  variantId: string,
  quantity: unknown,
): CartLine[] {
  const normalizedVariantId = variantId.trim();
  const nextQuantity = normalizeQuantity(quantity);
  const nextLines = lines.filter((line) => line.variantId !== normalizedVariantId);

  if (!normalizedVariantId || Number(quantity) <= 0) {
    return normalizeCartLines(nextLines);
  }

  return normalizeCartLines([
    ...nextLines,
    { variantId: normalizedVariantId, quantity: nextQuantity },
  ]);
}

export function cartLineTotalQuantity(lines: readonly CartLine[]): number {
  return normalizeCartLines(lines).reduce((total, line) => total + line.quantity, 0);
}

export function normalizeCartLines(lines: readonly CartLine[]): CartLine[] {
  const merged = new Map<string, CartLine>();

  for (const line of lines) {
    const variantId = line.variantId.trim();
    if (!variantId) continue;

    const existing = merged.get(variantId);
    const quantity = normalizeQuantity(line.quantity);
    merged.set(variantId, {
      variantId,
      quantity: Math.min(999, (existing?.quantity ?? 0) + quantity),
    });
  }

  return [...merged.values()];
}

export function buildCartPermalink(storefrontDomain: string, lines: readonly CartLine[]): string {
  const domain = normalizeStorefrontDomain(storefrontDomain);
  if (!domain) {
    throw new Error("Enter a storefront domain before generating a cart permalink.");
  }

  const normalizedLines = normalizeCartLines(lines);
  if (normalizedLines.length === 0) {
    throw new Error("Select at least one product before generating a cart permalink.");
  }

  const permalinkLines = normalizedLines
    .map((line) => `${encodeURIComponent(line.variantId)}:${line.quantity}`)
    .join(",");

  return `https://${domain}/cart/${permalinkLines}`;
}

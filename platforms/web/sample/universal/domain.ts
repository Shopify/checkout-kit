import { normalizeStorefrontDomain } from "../cart";

export type ParsedShopDomain = { ok: true; domain: string } | { ok: false; message: string };

const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const DOMAIN_SUFFIX = /^[a-z]{2,}$/;

/** Accept a shop domain or its HTTPS homepage, without silently dropping URL authority. */
export function parseShopDomain(raw: string): ParsedShopDomain {
  const value = raw.trim();
  if (!value) return { ok: false, message: "Enter a storefront domain." };
  if (value.includes("\\") || value.startsWith("//")) {
    return { ok: false, message: "Enter a storefront domain or its HTTPS homepage." };
  }

  const scheme = /^[a-z][a-z0-9+.-]*:\/\//i.exec(value)?.[0] ?? "";
  const authority = value.slice(scheme.length).split(/[/?#]/, 1)[0] ?? "";
  if (authority.includes("@") || authority.includes(":")) {
    return { ok: false, message: "Storefront domains cannot include credentials or ports." };
  }

  let url: URL;
  try {
    url = new URL(scheme ? value : `https://${value}`);
  } catch {
    return { ok: false, message: "Enter a valid storefront domain." };
  }

  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    return {
      ok: false,
      message: "Storefront domains must use HTTPS without credentials or ports.",
    };
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    return { ok: false, message: "Enter only the storefront domain, without a path or query." };
  }

  const domain = normalizeStorefrontDomain(url.toString());
  const labels = domain.split(".");
  if (
    labels.length < 2 ||
    !labels.every((label) => DOMAIN_LABEL.test(label)) ||
    !DOMAIN_SUFFIX.test(labels[labels.length - 1] ?? "")
  ) {
    return { ok: false, message: "Enter a complete storefront domain." };
  }

  return { ok: true, domain };
}

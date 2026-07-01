export function normalizeStorefrontDomain(
  storefrontDomain: string | undefined,
): string {
  const domainWithoutScheme = (storefrontDomain ?? '')
    .trim()
    .replace(/^https?:\/\//i, '');

  return domainWithoutScheme.split('/')[0] ?? '';
}

export function createStorefrontApiUrl(
  storefrontDomain: string | undefined,
  apiVersion: string,
): string {
  return `https://${normalizeStorefrontDomain(
    storefrontDomain,
  )}/api/${apiVersion}/graphql.json`;
}

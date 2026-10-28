const chunkPlaceholder = /\bCHECKOUT_KIT_[A-Z0-9_]+_CHUNK\b/g;

function placeholderForChunk(file: string): string | undefined {
  // The component is a path segment, not part of the filename: Vite hashes
  // use URL-safe Base64 and may themselves contain hyphens.
  const componentName = file.match(/(?:^|\/)assets\/([^/]+)\/[^/]+\.js$/)?.[1];
  if (componentName === undefined) return undefined;

  return `CHECKOUT_KIT_${componentName.toUpperCase().replaceAll("-", "_")}_CHUNK`;
}

/**
 * Replaces CDN component-chunk placeholders in the loader with their hashed,
 * relative URLs. Every placeholder must have a matching static dynamic import
 * so a retry can use a fresh URL after a failed browser module import.
 */
export function injectCdnChunkUrls(code: string, dynamicImports: readonly string[]): string {
  let injected = code;
  for (const file of dynamicImports) {
    const placeholder = placeholderForChunk(file);
    if (placeholder !== undefined) {
      injected = injected.replaceAll(placeholder, JSON.stringify(`./${file}`));
    }
  }

  const unresolved = [...injected.matchAll(chunkPlaceholder)].map((match) => match[0]);
  if (unresolved.length > 0) {
    throw new Error(
      `CDN loader has no chunk URL for ${[...new Set(unresolved)].join(", ")}. ` +
        "Add a static component registration import with a matching chunk name.",
    );
  }

  return injected;
}

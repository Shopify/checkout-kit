import { transform } from "esbuild";
import { type Plugin } from "vite";

const CSS_TAG = /css`([^`]*)`/g;

export async function minifyCssTags(code: string): Promise<string> {
  const matches = [...code.matchAll(CSS_TAG)];

  let result = code;
  for (const match of matches) {
    const [full, cssText] = match;
    if (cssText.includes("${")) continue;
    const { code: minified } = await transform(cssText, { loader: "css", minify: true });
    result = result.replace(full, `css\`${minified.trim()}\``);
  }

  return result;
}

export function minifyCssTagsPlugin(): Plugin {
  return {
    name: "minify-css-tags",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".styles.ts")) return;
      return minifyCssTags(code);
    },
  };
}

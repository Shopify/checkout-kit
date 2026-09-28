import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

const SAMPLE_ENV_KEYS = [
  "STOREFRONT_DOMAIN",
  "CHECKOUT_KIT_UC_SHOP_DOMAINS",
  "CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS",
  "CHECKOUT_KIT_UC_SESSION_CREATE_URL",
  "CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL",
  "VITE_CHECKOUT_KIT_UC_DEVELOPMENT_CONTINUATION_HOST",
] as const;

export type SampleEnvironment = Partial<Record<(typeof SAMPLE_ENV_KEYS)[number], string>>;

function readEnvironmentFile(path: string): Record<string, string | undefined> {
  try {
    return parseEnv(readFileSync(path, "utf8"));
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return {};
    }
    // Do not include filesystem paths or configuration values in diagnostics.
    // eslint-disable-next-line preserve-caught-error
    throw new Error("Could not read the sample environment configuration.");
  }
}

/** Match the shared sample configuration: local overrides, root values, then shell fallback. */
export function loadSampleEnvironment(
  root: string,
  shell: Record<string, string | undefined> = process.env,
): SampleEnvironment {
  const source = {
    ...shell,
    ...readEnvironmentFile(resolve(root, ".env")),
    ...readEnvironmentFile(resolve(root, ".env.local")),
  };
  const environment: SampleEnvironment = {};
  for (const key of SAMPLE_ENV_KEYS) {
    if (source[key] !== undefined) environment[key] = source[key];
  }
  return environment;
}

// The values Vite replaces in a build. A package that compiles this source with Vite's own
// client types gets the same declarations from them.
interface ImportMetaEnv {
  DEV: boolean;
  readonly VITE_CK_TELEMETRY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import typescriptParser from "@typescript-eslint/parser";
import compat from "eslint-plugin-compat";

export default [
  {
    files: ["src/**/*.ts", "components/*/src/**/*.ts", "internal/**/src/**/*.ts"],
    ignores: ["**/*.test.ts", "internal/telemetry/**"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: { compat },
    rules: { "compat/compat": "error" },
  },
];

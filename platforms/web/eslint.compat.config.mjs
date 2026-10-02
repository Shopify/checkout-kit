import typescriptParser from "@typescript-eslint/parser";
import compat from "eslint-plugin-compat";

export default [
  {
    files: ["src/**/*.ts"],
    ignores: ["src/**/*.test.ts"],
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

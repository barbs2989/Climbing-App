// npm run lint — ESLint over the app's source, run in the build (scripts/check-lint.mjs).
//
// Three rule families, the ones the owner asked to be held at zero:
//   - unused variables         (no-unused-vars / @typescript-eslint/no-unused-vars)
//   - implicit or explicit any (@typescript-eslint/no-explicit-any; tsc strict owns noImplicitAny)
//   - hooks                    (react-hooks/rules-of-hooks, react-hooks/exhaustive-deps)
// Every rule is an error. The JS app files get exactly these rules; src/ (TypeScript) also gets
// typescript-eslint's `strict` set. Findings that predate this config are held in
// eslint-suppressions.json — see scripts/check-lint.mjs for how that baseline only shrinks.
// Everything else is left to the check:* guards, which target the failures this app actually ships.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

const unused = { args: "after-used", ignoreRestSiblings: true, varsIgnorePattern: "^_", argsIgnorePattern: "^_", caughtErrors: "none" };

export default tseslint.config(
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  { ignores: ["dist/**", "node_modules/**", ".claude/**", "scripts/**", "supabase/**", "audits/**", "catalog/**", "research/**", "research-data/**", "enrichment-wip/**", "gear-research/**", "public/**", "docs/**"] },
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { ...globals.browser }, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      "no-unused-vars": ["error", unused],
      "react/jsx-uses-vars": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", unused],
      "@typescript-eslint/no-explicit-any": "error",
      "react/jsx-uses-vars": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
);

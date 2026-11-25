// npm run lint — ESLint over the app's source, run in the build (scripts/check-lint.mjs).
//
// Three rule families, the ones the owner asked to be held at zero:
//   - unused variables         (no-unused-vars / @typescript-eslint/no-unused-vars)
//   - implicit or explicit any (@typescript-eslint/no-explicit-any; tsc strict owns noImplicitAny)
//   - hooks                    (react-hooks/rules-of-hooks, react-hooks/exhaustive-deps)
// plus two bug-shaped rules (no-restricted-syntax): a palette-function style spread uncalled (2026-11-18),
// and the palette key C.blueSolid, renamed C.actionSolid (2026-11-24).
// Every rule is an error. The JS app files get exactly these rules; src/ (TypeScript) also gets
// typescript-eslint's `strict` set. Findings that predate this config are held in
// eslint-suppressions.json — see scripts/check-lint.mjs for how that baseline only shrinks.
// Everything else is left to the check:* guards, which target the failures this app actually ships.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

// A palette style in lib/buttonStyles.js that is a FUNCTION of C, spread uncalled, adds nothing: CrewCard's
// "All your float plans" link drew as a grey browser-default button that way (2026-11-18).
const paletteSpread = ["error", { selector: "SpreadElement > Identifier.argument[name=/^(BTN_PRIMARY|BTN_SECONDARY|BTN_GO|BTN_LINK|INPUT|SOLID_FILL)$/]", message: "This style is a function of the palette: spread NAME(C), not NAME." },
  // The solid action colour was C.blueSolid until 2026-11-24. A branch cut before the rename can bring the old name
  // back, and a missing palette key is `undefined`: the button draws with no fill and nothing fails.
  { selector: "MemberExpression > Identifier.property[name='blueSolid']", message: "C.blueSolid was renamed: use C.actionSolid." }];
const unused = { args: "after-used", ignoreRestSiblings: true, varsIgnorePattern: "^_", argsIgnorePattern: "^_", caughtErrors: "none" };

export default tseslint.config(
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  // The guard scratch files come LAST: `npm run build` runs every guard concurrently, and ESLint scanning `.`
  // beside a guard that has just created and removed its scratch directory died on it
  // (`ENOENT: scandir .cm-apsec-…`, two deploys in a row, 2026-10-16). check:approach-section,
  // check:match-percent and check:trailhead-directions make `.cm-*`, check:waypoint-placement `.wpplace-*`,
  // and the core-bundling guards `.core-entry-*.jsx` / `.trusttierprobe-*.mjs` in the checkout root.
  { ignores: ["dist/**", "node_modules/**", ".claude/**", "scripts/**", "supabase/**", "audits/**", "catalog/**", "research/**", "research-data/**", "enrichment-wip/**", "gear-research/**", "public/**", "docs/**", ".cm-*/**", ".wpplace-*/**", ".core-entry-*.jsx", ".trusttierprobe-*.mjs"] },
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { ...globals.browser }, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      "no-unused-vars": ["error", unused],
      "react/jsx-uses-vars": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "no-restricted-syntax": paletteSpread,
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
      "no-restricted-syntax": paletteSpread,
    },
  },
);

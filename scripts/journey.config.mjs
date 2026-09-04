// Vite config used ONLY by scripts/check-new-climber-journey.mjs.
//
// It exposes ONE value the walk cannot reason without: the runtime value of DEMO_AUTOLOGIN.
//
// WHY THIS EXISTS, and it is a correction of two earlier attempts. `onboarded` and `authed` are
// BOTH `useState(DEMO_AUTOLOGIN)`, so that single flag decides whether onboarding auto-opens AND
// whether the Home "Set up your climbing profile" card renders. The walk therefore cannot describe
// what it sees without knowing it -- and two runs were spent on confident wrong stories about it:
//
//   1. "the .env file is overriding the spawn env" -- asserted, never measured.
//   2. a `define` of "import.meta.env.VITE_DEMO_AUTOLOGIN" -- which DOES NOTHING. Measured by
//      fetching the transformed module from the dev server: it still contains the literal
//      `import.meta.env.VITE_DEMO_AUTOLOGIN === "true"`, unsubstituted, under this config and the
//      signed-in one alike. Vite resolves import.meta.env at runtime; `define` does not reach it.
//      Adding it changed nothing, which read equally as "the override already worked" -- an
//      ambiguity that is exactly why the value has to be OBSERVED rather than argued about.
//
// So the flag is published to the page instead. A test-only scaffold, the same shape as the
// overlay opener in signed-in.config.mjs and the anchors in zero-state.config.mjs, and it fails
// CLOSED: if the anchor moves, the walk would silently reason about `undefined`.
//
// Nothing here ships — it is only ever passed via `vite --config`.
import base from "../vite.config.js";

const ANCHOR = 'const DEMO_AUTOLOGIN=import.meta.env.VITE_DEMO_AUTOLOGIN==="true";';

function publishFlag() {
  return {
    name: "journey-publish-demo-flag",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/ClimbMatchCore.jsx")) return null;
      const n = code.split(ANCHOR).length - 1;
      if (n !== 1) {
        throw new Error(
          "ANCHOR LOST in ClimbMatchCore.jsx: expected exactly 1 occurrence of\n  " + ANCHOR +
          "\nbut found " + n + ". check:new-climber-journey reads this flag to describe what it " +
          "sees — without it the walk would reason about `undefined` and report a confident wrong " +
          "story about onboarding, which has already happened twice.");
      }
      return code.replace(ANCHOR, ANCHOR + "globalThis.__DEMO_AUTOLOGIN=DEMO_AUTOLOGIN;");
    },
  };
}

export default { ...base, plugins: [...(base.plugins || []), publishFlag()] };

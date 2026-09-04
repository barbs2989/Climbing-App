// Vite config used ONLY by scripts/check-new-climber-journey.mjs.
//
// It adds ONE thing to the real config, and it is the thing the walk cannot work without:
// `VITE_DEMO_AUTOLOGIN` is forced FALSE at compile time.
//
// WHY A `define` AND NOT AN ENV VAR. The walk spawns vite with
// `env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" }` — and `.env` in this repo sets
// `VITE_DEMO_AUTOLOGIN=true`, so what the app compiled against was NOT what the walk asked for.
// The symptom was silent and looked like an app defect: `onboarded` is `useState(DEMO_AUTOLOGIN)`
// and is never persisted, so with the flag on a brand-new REAL account is treated as already
// onboarded — no auto-open, and no "Set up your climbing profile" card on Home either. Two runs
// were spent reading that as "onboarding is unreachable for a real climber" before the flag was
// measured. A `define` is not overridable by a dotfile.
//
// This matters beyond this guard: any walk that reasons about DEMO_AUTOLOGIN while inheriting it
// from the environment is reasoning about whichever value the developer's .env happens to hold.
//
// Nothing here ships — it is only ever passed via `vite --config`.
import base from "../vite.config.js";

export default {
  ...base,
  define: {
    ...(base.define || {}),
    "import.meta.env.VITE_DEMO_AUTOLOGIN": JSON.stringify("false"),
  },
};

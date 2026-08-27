// Vite config used only by scripts/oneoff/probe-policy-notice-covers-content.mjs.
//
// PolicyUpdateNotice is a non-dismissible `position:fixed; bottom:0` panel, shown whenever
// profiles.terms_accepted_version differs from POLICY_VERSION. That is not an edge state: it is
// EVERY signed-in account, for as long as it takes them to accept, every time the policy version
// is bumped. So whether it covers content is a question about all users, not about legacy ones.
//
// The state cannot be reached from the seeded demo (it needs a uid and a profile row), and
// reaching it through a real fixture costs a Supabase account per run for a question that is pure
// geometry. So the gate is forced here, IN MEMORY, the way zero-state.config.mjs and
// anniversary.config.mjs force theirs -- the source is never edited.
//
// Does not ship. Only ever passed via `vite --config`.

import base from "../vite.config.js";

const GATE = "const _needsPolicy=!!uid&&!policyQ.isLoading&&!policyQ.error&&_accepted!==POLICY_VERSION;";

function policyNoticeScaffold() {
  return {
    name: "policy-notice-scaffold",
    enforce: "pre", // before @vitejs/plugin-react compiles the JSX away
    transform(code, id) {
      if (!id.endsWith("/ClimbMatch.jsx")) return null;
      const n = code.split(GATE).length - 1;
      if (n !== 1) {
        throw new Error(
          "ANCHOR LOST in ClimbMatch.jsx: expected exactly 1 occurrence of\n  " + GATE +
          "\nbut found " + n + ". Without it the notice never mounts, and the probe would measure " +
          "screens with no panel on them and report NO OVERLAP -- a clean result about nothing. " +
          "Update the anchor in scripts/policy-notice.config.mjs."
        );
      }
      // Forced true, and deliberately NOT by stubbing the query underneath it: the notice still
      // has to be built by the app's own `_policyEl` expression, so a change to how it is
      // rendered or portalled still reaches this probe.
      return code.replace(GATE, "const _needsPolicy=true;");
    },
  };
}

console.log("probe-policy-notice — forcing _needsPolicy true");

export default { ...base, plugins: [policyNoticeScaffold(), ...(base.plugins || [])] };

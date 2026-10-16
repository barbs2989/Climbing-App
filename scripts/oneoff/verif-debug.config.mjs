// A vite config for ONE question: what are the verification effect's inputs at runtime?
//
// `check:outage ONLY=verification_records` shows the outage INTRODUCING "Verify to boost your
// trust", which means ME.verified is false under the outage and true when healthy. Reading the
// source says that should not happen once the effect falls back to the session, and three
// hypotheses died on measurement (the fixture session DOES carry email_confirmed_at; the sign-in
// reset is gated `prev!=null` so it cannot fire on first load; no trigger seeds a
// verification_records row). So the remaining question is what the effect actually SEES.
//
// The app source is never edited -- this rewrites in memory, the pattern zero-state.config.mjs
// and anniversary.config.mjs already use. `ME.verified=verified;` runs in App's body on every
// render, which makes it the right place to observe from: it sees the settled value rather than
// one render's intermediate.

import base from "../../vite.config.js";

const ANCHOR = "ME.verified=verified;";

function verifDebug() {
  return {
    name: "verif-debug",
    enforce: "pre", // before plugin-react compiles the JSX away
    transform(code, id) {
      if (!id.endsWith("/ClimbMatch.jsx")) return null;
      const n = code.split(ANCHOR).length - 1;
      if (n !== 1) {
        // Fail closed. A moved anchor must not quietly boot an app with no reporter, because
        // then the probe reads `undefined` and that is indistinguishable from "the effect never
        // ran" -- which is one of the answers it exists to distinguish.
        throw new Error(
          "ANCHOR LOST in ClimbMatch.jsx: expected exactly 1 occurrence of\n  " + ANCHOR +
          "\nbut found " + n + ". Nothing would be reported. Update scripts/oneoff/verif-debug.config.mjs."
        );
      }
      const probe = "try{window.__verif={uid:uid||null,"
        + "hasSession:!!session,hasUser:!!(session&&session.user),"
        + "emailConfirmedAt:(session&&session.user&&session.user.email_confirmed_at)||null,"
        + "recs:(myVerificationQ.data===undefined?'undefined':(myVerificationQ.data===null?'null':myVerificationQ.data.length)),"
        + "isError:!!myVerificationQ.isError,status:myVerificationQ.status||null,"
        + "verified:verified,renders:((window.__verif&&window.__verif.renders)||0)+1};}catch(e){window.__verifErr=String(e);}";
      code = code.replace(ANCHOR, ANCHOR + probe);

      // ...and record every INVOCATION of the effect, including the early returns. The render
      // reporter above shows the settled inputs; it cannot show whether the effect ever RAN with
      // those inputs. Under an outage `myVerificationQ.data` stays `undefined` forever, so that
      // dependency never changes -- and the effect can only re-run when `uid` or `session` do.
      // Whether it does is the whole question, and it is not answerable from a render snapshot.
      const EFF = "useEffect(function(){if(!uid||verifHydratedRef.current)return;";
      const m = code.split(EFF).length - 1;
      if (m !== 1) {
        throw new Error(
          "ANCHOR LOST (effect): expected exactly 1 occurrence of\n  " + EFF +
          "\nbut found " + m + ". The invocation log would be silently empty, which reads as " +
          "'the effect never ran' -- the very answer this is trying to establish."
        );
      }
      const rec = "useEffect(function(){try{window.__verifRuns=(window.__verifRuns||[]).concat("
        + "[{uid:!!uid,latched:!!verifHydratedRef.current,"
        + "sec:!!(session&&session.user&&session.user.email_confirmed_at),"
        + "recs:(myVerificationQ.data===undefined?'undefined':String(myVerificationQ.data.length))}]);}catch(e){}"
        + "if(!uid||verifHydratedRef.current)return;";
      return code.replace(EFF, rec);
    },
  };
}

export default {
  ...base,
  plugins: [verifDebug(), ...(base.plugins || [])],
};

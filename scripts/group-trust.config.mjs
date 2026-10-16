// Vite config used only by scripts/oneoff/probe-group-trust-gate.mjs.
//
// "Trust 55+ only" was a label with nothing behind it — both group-join handlers gated on
// `policy==="approval"` and no code anywhere read a trust score, so an account at trust 0 joined
// a group whose own chip said it vetted low-trust accounts out. The fix is a gate in those two
// handlers, and a gate is a CLICK, which no SSR probe can make.
//
// Nothing in the seed app can exercise it: `GROUPS` is empty behind DEMO_FILLERS, so there is no
// group at all to tap Join on, let alone one with policy "trust". This injects three into
// `createdGroups` in memory — never editing the source — the pattern zero-state.config.mjs,
// anniversary.config.mjs and camping-expand.config.mjs already establish.
//
// THREE groups, and two of them are CONTROLS. A refusal on its own proves nothing: a join path
// broken for every group looks identical to a gate that works, so the `open` one must still
// join. And a label that always read "Invite only" would satisfy the private assertion on its
// own, so the public one must still read "Open to all".
//
// `?ztboost=1` additionally copies a high-trust seed climber's fields onto ME, so the ADMIT half
// can be driven too. The probe reads the score off the Profile screen before judging that run —
// a boost that silently failed would otherwise report a working gate as broken.
//
// Does not ship. Only ever passed via `vite --config`.

import base from "../vite.config.js";
import { lazyChunks } from "./lib/overlay-scaffold.mjs";

const ANCHOR = "  const prevUidRef=useRef(uid);";

// ownerId 1 on the two public ones so the signed-out demo climber (id 0) is NOT the owner and NOT already a member —
// otherwise the card renders "Joined · tap to leave" and there is no Join button to press.
const GROUPS = [
  {
    id: "probe_trust_group", name: "ZZTRUSTZZ Group", disciplines: ["Alpine"], kind: "Alpine",
    accent: "#4ea1ff", location: "Bellingham, WA", blurb: "Probe group, trust policy.",
    memberIds: [1], ownerId: 1, moderatorIds: [1], policy: "trust", eventPolicy: "anyone",
    visibility: "public",
  },
  {
    id: "probe_open_group", name: "ZZOPENZZ Group", disciplines: ["Alpine"], kind: "Alpine",
    accent: "#4ea1ff", location: "Bellingham, WA", blurb: "Probe group, open policy.",
    memberIds: [1], ownerId: 1, moderatorIds: [1], policy: "open", eventPolicy: "anyone",
    visibility: "public",
  },
  // policy "open" AND visibility "private" — the combination that made the browse card say
  // "Open to all" beside a detail screen saying "join by invite only". Owned by ME so it stays
  // in the browse list (a private group is filtered out for everyone else, which is the point).
  {
    id: "probe_private_group", name: "ZZPRIVATEZZ Group", disciplines: ["Alpine"], kind: "Alpine",
    accent: "#4ea1ff", location: "Bellingham, WA", blurb: "Probe group, private but policy open.",
    memberIds: [0], ownerId: 0, moderatorIds: [0], policy: "open", eventPolicy: "anyone",
    visibility: "private",
  },
];

function groupTrustScaffold() {
  return {
    name: "group-trust-scaffold",
    enforce: "pre", // before @vitejs/plugin-react compiles the JSX away
    transform(code, id) {
      // Raising ME's trust: copy a high-trust seed climber's fields over, keeping the identity
      // fields that make ME "me" (id 0 is load-bearing everywhere — see check:seed-history).
      if (id.endsWith("/ClimbMatchCore.jsx")) {
        if (!/\bconst ME=/.test(code)) throw new Error("ANCHOR LOST: `const ME=` is not in ClimbMatchCore.jsx — cannot boost the probe's trust score.");
        return code + `
if(typeof window!=="undefined"&&window.location&&window.location.search.indexOf("ztboost=1")>=0){
  var _hi=CLIMBERS.slice().sort(function(a,b){return vScore(b)-vScore(a);})[0];
  if(_hi){var _keep={id:ME.id,name:ME.name,username:ME.username,avatar:ME.avatar,objectiveIds:ME.objectiveIds};Object.assign(ME,_hi,_keep);}
  window.__zTrustBoost=_hi?vScore(ME):null;
}
`;
      }

      if (!id.endsWith("/ClimbMatch.jsx")) return null;
      const n = code.split(ANCHOR).length - 1;
      if (n !== 1) {
        throw new Error(
          "ANCHOR LOST in ClimbMatch.jsx: expected exactly 1 occurrence of\n  " + ANCHOR +
          "\nbut found " + n + ". Without it no group is injected, the Groups tab is empty, and " +
          "the probe would report the gate broken when nothing was ever tapped. Update the anchor " +
          "in scripts/group-trust.config.mjs."
        );
      }
      const inject = `
  useEffect(function(){
    if(window.location.search.indexOf("ztrust=1")<0||window.__zTrustSeeded)return;
    window.__zTrustSeeded=1;
    setCreatedGroups(${JSON.stringify(GROUPS)});
    setTab("crew");setCrewView("groups");
    window.__zTrustReady=1;
  },[]);
`;
      return code.replace(ANCHOR, ANCHOR + "\n" + inject);
    },
  };
}

const WARM = lazyChunks("group-trust probe");
console.log("group-trust probe — injecting " + GROUPS.length + " group(s); warming " + WARM.length + " lazy chunk(s)");

export default {
  ...base,
  plugins: [groupTrustScaffold(), ...(base.plugins || [])],
  server: { ...(base.server || {}), warmup: { clientFiles: WARM } },
};

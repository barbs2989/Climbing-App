// Shared machinery for the three Vite configs that drive the browser checks:
// scripts/zero-state.config.mjs (check:zero), scripts/signed-in.config.mjs
// (check:signed-in) and scripts/overlay-scroll.config.mjs (check:overlay-scroll).
//
// All three need the same two things — a way to open any overlay by name, and a warm list of
// lazy chunks — and they need them to mean the SAME thing. Two copies of the discovery
// regex would drift the moment one file is updated and the other is not, and the failure
// would be silent: the stale copy keeps reporting green over a shrinking set of overlays.
//
// Neither config ships. All are only ever passed via `vite --config`, so nothing here can
// reach a production bundle.
//
// ---------------------------------------------------------------------------------------
// TWO SHAPES, because until 2026-08-09 there was only one and it saw half the modal surface.
//
// The original discovery matched `[xOpen,setX]=useState(false)` — a NAME shape. CLAUDE.md
// said overlays were "discovered from the source, not listed in the script", and that was
// true, but only for modals whose author happened to follow the naming convention. The audit
// in audits/OVERLAY-GUARD-COVERAGE-2026-08-09.md counted 28 discovered against 22 that carry
// `role="dialog"` and could not be reached by ANY of the three guards — including LogAscent
// (the largest component in the app, where a climber records a climb), FullProfile, Resume,
// GiveVouch, LogCatch and ReportModal. Nothing reported the omission, because the summaries
// count overlays OPENED: a modal the regex cannot see is not a missing row, it is not a row.
//
// So the second shape is discovered by BEHAVIOUR instead of by name: a state whose JSX
// renders a dialog. That cannot be fooled by a rename, and it is what actually defines an
// overlay. See dialogOverlays() for the two precision rules that keep it honest.

import { readFileSync, existsSync } from "node:fs";

// Overlays whose RENDERER is gated on state beyond their own flag, so flipping the flag
// alone cannot mount them. These are correct code, not bugs: the walk simply cannot reach
// them by name, and failing on them would train everyone to ignore the failure.
//
// Every entry records the actual gate, so the claim is checkable rather than taken on
// trust — and assertKnownOverlays() below fails if a name here has stopped being an
// overlay at all, which is how a list like this normally rots.
export const NEEDS_EXTRA_STATE = {
  areaTreeOpen: "rendered as `areaTreeOpen && selArea` — needs an area selected first",
  crewListOpen: "a disclosure inside the crew finder's result list — needs crews to list",
  // These two render INSIDE the openGroupId group view, not at App level: their JSX sits
  // within that IIFE and the `posts` they look up is a local (`var posts=groupPosts[cl.id]`),
  // so there is no App-scope expression that could open them. Reaching them means opening a
  // group first, which is a different walk from "set a flag and see what mounts".
  postMenuFor: "nested inside the openGroupId group view — `posts` is a local of that IIFE",
  reactPickerFor: "nested inside the openGroupId group view — `posts` is a local of that IIFE",
};

// ---------------------------------------------------------------------------------------
// Payloads for the dialog-shaped overlays.
//
// A boolean flag is opened with `true`. These are not flags — they hold the thing the modal
// is ABOUT, and several look that thing up in live state and `return null` when it misses,
// so a wrong payload does not throw, it renders nothing and reads exactly like a broken
// modal. Every expression below is therefore lifted from the app's own setter call sites
// rather than invented; the comment on each records where the shape comes from.
//
// `expr` is evaluated INSIDE App, at open time, so it can name App scope (ROUTES, CLIMBERS,
// ME, crews, …).
//
// `needsData` names the lookup a modal does, for the ones that resolve an id in live state.
// Whether that lookup can succeed is NOT declared here — it is MEASURED at runtime, because
// the answer differs per guard and a static list would be wrong for two of the three:
// check:zero has nothing, check:overlay-scroll has the seeded demo (a crew, but `events` and
// `GROUPS` sit behind DEMO_FILLERS, which is permanently false), and check:signed-in has a
// real account that owns a crew and a DB-backed group. So the opener evaluates `expr` and,
// when it comes out empty, records the name on `window.__overlayNoPayload` with this reason
// instead of setting state. The guards then report it as skipped rather than as a modal that
// mounted nothing — and a modal whose payload DID resolve still has to render, so this
// cannot excuse a broken one.
//
// This registry is NOT the overlay list — discovery still comes from the source. It is only
// the payload, and it is FAIL-CLOSED: a dialog state that is neither listed here nor exempt
// in NEEDS_EXTRA_STATE fails the run (assertKnownOverlays), so a modal added tomorrow cannot
// quietly go unwalked. That is the property the name-shape discovery lost.
export const OVERLAY_PAYLOADS = {
  // NOTE: a dialog state initialised to `false` needs no entry here — it is a flag whatever
  // it is called, and is opened with `true`. `confirmDelete` and `pastExpand` are the two
  // today. Only state that HOLDS something needs a payload.

  // A climber object. Every call site passes a CLIMBERS-shaped record (`c`, `fr`, `host`).
  connectModal: { expr: "CLIMBERS[0]" },
  giveVouchWith: { expr: "CLIMBERS[0]" },
  logCatchWith: { expr: "CLIMBERS[0]" },
  mutualModal: { expr: "CLIMBERS[0]" },
  profileModal: { expr: "CLIMBERS[0]" },
  reportUser: { expr: "CLIMBERS[0]" },
  // Resume is also opened on yourself (`setResumeFor(ME)`), and that is the branch that
  // matters — `logs={resumeFor.id===0?logs:[]}` and the seed-history gate both key on it.
  resumeFor: { expr: "ME" },

  // A route object.
  logModal: { expr: "ROUTES[0]" },
  sunCorrectFor: { expr: "ROUTES[0]" },

  // Composites, copied from the setter call sites verbatim.
  invitePrompt: { expr: "{climber:CLIMBERS[0],route:ROUTES[0]}" },
  quickLogFor: { expr: "{route:ROUTES[0],crewId:undefined,partners:[]}" },

  // Blank drafts — exactly what the "create" buttons open.
  eventForm: { expr: '{groupId:(createdGroups.concat(GROUPS)[0]||{}).id,title:"",date:"",time:"",location:"",desc:"",capacity:""}' },
  groupForm: { expr: '{name:"",disciplines:[],location:ME.location,blurb:"",policy:"open",eventPolicy:"anyone"}' },

  // A trip report. The call sites pass an activity row with `route`/`mtn` grafted on, so a
  // bare row would render a modal missing everything the real one has.
  report: {
    expr: "(function(){var r=ROUTES.find(function(x){return (x.activity||[]).length;});" +
      "return r?Object.assign({},r.activity[0],{route:r,mtn:MOUNTAINS.find(function(m){return m.id===r.mountainId;})||{}}):null;})()",
  },

  // ---- resolve an id in live state, so an empty fixture cannot open them at all ----
  crewInvite: {
    expr: "(crews.length?{crewId:crews[0].id,climber:CLIMBERS[0]}:null)",
    needsData: "`crews.find(id)` must hit AND that crew's route must resolve",
  },
  recapId: { expr: "(crews[0]||{}).id", needsData: "`crews.find(x=>x.id===recapId)` — needs a crew" },
  groupInvite: {
    expr: "(createdGroups.concat(GROUPS)[0]||{}).id",
    needsData: "`createdGroups.concat(GROUPS).find(...)` — needs a group",
  },
  eventInvite: {
    expr: "(function(){var g=Object.keys(events)[0];var l=g?(events[g]||[]):[];return l.length?{groupId:g,id:l[0].id}:null;})()",
    needsData: "`events[groupId].find(id)` — needs a group with an event on it",
  },
};

// A name that is exempted but no longer exists is a stale exemption, and a stale exemption
// is how an overlay quietly stops being checked forever. The payload registry is held to the
// same standard in both directions: an unregistered dialog state fails (it would go unwalked),
// and a registered name that is no longer a dialog fails (it is stale bookkeeping).
export function assertKnownOverlays(discovered, fail) {
  for (const name of Object.keys(NEEDS_EXTRA_STATE)) {
    if (!discovered.includes(name)) {
      fail("scaffold", `NEEDS_EXTRA_STATE lists ${JSON.stringify(name)}, which is no longer an overlay state — remove it from scripts/lib/overlay-scaffold.mjs`);
    }
  }
  for (const name of Object.keys(OVERLAY_PAYLOADS)) {
    if (!discovered.includes(name)) {
      fail("scaffold", `OVERLAY_PAYLOADS lists ${JSON.stringify(name)}, which no longer renders a dialog — remove it from scripts/lib/overlay-scaffold.mjs`);
    }
  }
}

// ---------------------------------------------------------------------------------------
// Shape 1: the boolean flag. `[xOpen,setX]=useState(false)`.
export function flagOverlays(code) {
  const found = [];
  for (const m of code.matchAll(/\[([a-zA-Z][\w$]*Open),(set[A-Z][\w$]*)\]=useState\(false\)/g)) {
    found.push({ name: m[1], setter: m[2], at: m.index, kind: "flag" });
  }
  return found;
}

// Components whose body contains a `role="dialog"` element — i.e. rendering one IS opening a
// modal. Bodies are delimited by the next top-level declaration, which is crude but safe
// here: both app files are one-declaration-per-line by house style.
function dialogComponents(...sources) {
  const out = new Set();
  for (const s of sources) {
    for (const m of s.matchAll(/function ([A-Z][\w$]*)\s*\(/g)) {
      const start = m.index;
      const rest = s.slice(start + 1);
      const nxt = rest.search(/\nfunction [A-Z][\w$]*\s*\(|\nconst [A-Z][\w$]*=/);
      const end = start + 1 + (nxt < 0 ? rest.length : nxt);
      if (s.slice(start, end).includes('role="dialog"')) out.add(m[1]);
    }
  }
  return out;
}

// Brace-match forward from an opening `{`. Deliberately run over RAW source, not over the
// comment/string-blanked copy that check:seed-history and check:dead-flag-gates use: that
// blanker treats every quote as a string delimiter, and JSX body text is full of apostrophes
// ("don't", "you're"), so it desynchronises and swallows braces. Blanking is safe for asking
// "does this pattern appear"; it is not safe for balancing.
function matchBrace(s, i) {
  let d = 0;
  for (let k = i; k < s.length; k++) {
    if (s[k] === "{") d++;
    else if (s[k] === "}" && --d === 0) return k;
  }
  return -1;
}

const TAG = /<([A-Za-z][\w$.]*)/;

// Shape 2: state of any name or initial value whose JSX renders a dialog.
//
// Two precision rules, both of which were wrong in the first draft:
//
//   * Balance the braces, do not take a fixed window. Half these modals are wrapped in an
//     IIFE — `{crewInvite&&(()=>{ …lookup… return <Modal/> })()}` — so the dialog can be
//     thousands of characters past the state name, and a window big enough to reach it in
//     one case swallows the next overlay in another. On a file with 428,000 characters on a
//     handful of physical lines there is no safe window size.
//
//   * The dialog must be the region's OWN first element. `openGroupId` renders a full-screen
//     group view that contains a nested ReactionPicker: its `role="dialog"` sits 24,227
//     characters in, behind 107 open tags. Counting that would classify every screen large
//     enough to contain a modal as a modal.
export function dialogOverlays(appCode, coreCode) {
  const dlg = dialogComponents(coreCode, appCode);
  const found = [];
  for (const m of appCode.matchAll(/\[([a-zA-Z][\w$]*),(set[A-Z][\w$]*)\]=useState\(([^)]{0,30})/g)) {
    const [name, setter, init] = [m[1], m[2], m[3].trim()];
    if (name.endsWith("Open") && init === "false") continue; // shape 1
    let evidence = null;
    for (const r of appCode.matchAll(new RegExp("\\{\\s*" + name + "\\s*(?:&&|\\?)", "g"))) {
      const end = matchBrace(appCode, r.index);
      if (end < 0) continue;
      const seg = appCode.slice(r.index, end);
      const t = TAG.exec(seg);
      if (!t) continue;
      if (dlg.has(t[1])) { evidence = "renders <" + t[1] + ">"; break; }
      const d = seg.indexOf('role="dialog"');
      if (d >= 0 && (seg.slice(0, d).match(/<[A-Za-z][\w$.]*/g) || []).length <= 1) {
        evidence = 'inline role="dialog"'; break;
      }
    }
    // A dialog state initialised to `false` is a flag that simply was not named `*Open` —
    // `confirmDelete`, `pastExpand`. The INITIAL VALUE decides how you open it; the name
    // decides nothing, which is the whole point of discovering these by behaviour. Requiring
    // a registered payload for one would be busywork that invites a wrong answer.
    if (evidence) found.push({ name, setter, at: m.index, kind: init === "false" ? "flag" : "dialog", evidence, init });
  }
  return found;
}

// Overlay states are discovered from the SOURCE, never listed, so a modal added tomorrow is
// walked without anyone remembering to register it.
export function overlayStates(code, coreCode) {
  const core = coreCode != null ? coreCode : readFileSync(new URL("../../ClimbMatchCore.jsx", import.meta.url), "utf8");
  return [...flagOverlays(code), ...dialogOverlays(code, core)];
}

// Build the opener effect. `?zt=<tab>` selects a tab, `?z=<overlayName>` opens an overlay.
//
// Only setters declared ABOVE the injection point are in scope. Anything below is named in
// the output rather than silently dropped — a modal that quietly stops being walked is
// exactly the blind spot these checks exist to close.
export function buildOpener(code, anchor, label, coreCode) {
  const at = code.indexOf(anchor);
  if (at < 0) throw new Error(`buildOpener: anchor not found: ${anchor}`);
  const all = overlayStates(code, coreCode);
  const usable = all.filter((s) => s.at < at);
  const skipped = all.filter((s) => s.at >= at).map((s) => s.name);
  if (skipped.length) {
    console.error(`${label} — these overlays are declared below the injection point and cannot be opened: ${skipped.join(", ")}`);
  }

  const missing = usable.filter((s) => s.kind === "dialog" && !OVERLAY_PAYLOADS[s.name] && !NEEDS_EXTRA_STATE[s.name]);
  if (missing.length) {
    // Fail closed. Skipping it would put the guards straight back in the state this whole
    // change exists to end: a modal nothing opens, and no row to say so.
    throw new Error(
      `${label} — these states render a dialog but have no entry in OVERLAY_PAYLOADS, so nothing can open them: ` +
      missing.map((s) => `${s.name} (${s.evidence})`).join(", ") +
      `. Add each to scripts/lib/overlay-scaffold.mjs with the payload its own setter call sites pass, ` +
      `or to NEEDS_EXTRA_STATE with the gate that makes it unreachable by flag alone.`
    );
  }

  // Each entry is a THUNK, not a setter: a dialog payload has to be evaluated at open time,
  // in App scope. Three things it has to get right, each of which would otherwise read as a
  // modal that mounted nothing — the one failure this walk is supposed to detect:
  //
  //   * a payload that THROWS is recorded by name, instead of killing the effect and leaving
  //     every later overlay looking like it never opened;
  //   * a payload that resolves EMPTY (no crew, no group, no event in this fixture) is
  //     recorded as such and state is left alone, so the guard reports "skipped, nothing to
  //     open it about" rather than a failure — measured per fixture, not declared;
  //   * an overlay with no payload at all (exempt in NEEDS_EXTRA_STATE) still appears in
  //     window.__overlays, so the guards enumerate and skip it rather than losing the row.
  const map = usable.map((s) => {
    const q = JSON.stringify(s.name);
    if (s.kind === "dialog" && !OVERLAY_PAYLOADS[s.name]) return q + ":function(){}";
    const arg = s.kind === "flag" ? "true" : OVERLAY_PAYLOADS[s.name].expr;
    const why = JSON.stringify(s.kind === "flag" ? "" : (OVERLAY_PAYLOADS[s.name].needsData || "its payload resolved empty in this fixture"));
    return q + ":function(){try{var v=(" + arg + ");" +
      "if(v==null||v===\"\"){(window.__overlayNoPayload=window.__overlayNoPayload||{})[" + q + "]=" + why + ";return;}" +
      s.setter + "(v);}catch(e){" +
      "(window.__overlayOpenErrors=window.__overlayOpenErrors||{})[" + q + "]=String(e&&e.message||e);}}";
  }).join(",");

  // The thunks are rebuilt EVERY RENDER and reached through a ref, not captured once in a
  // mount effect. A payload reads live state, and the effect fires 1200ms after mount — by
  // which point check:zero's sign-in reset has emptied `crews`. A mount-time closure built
  // `{crewId:crews[0].id}` from the seeded value that no longer existed, so `crews.find(...)`
  // missed and crewInvite and recapId reported "added nothing on any of 6 tabs" — a guard
  // failure indistinguishable from a broken modal, which is the one confusion this walk must
  // not introduce. Assigning through a ref during render keeps the payload current.
  const names = usable.map((s) => JSON.stringify(s.name)).join(",");
  return {
    usable,
    skipped,
    inject:
      "var __ovOpen=useRef(null);" +
      "__ovOpen.current=function(z){var M={" + map + "};if(M[z])M[z]();};" +
      "useEffect(function(){window.__overlays=[" + names + "];" +
      "var p=new URLSearchParams(location.search);var t=p.get('zt');var z=p.get('z');" +
      "if(t)setTab(t);" +
      // __overlaysReady means "the opener has RUN", not "the effect mounted". Every guard
      // waits on this flag and then asks what happened; setting it synchronously while the
      // opener fires 1200ms later meant they were asking before there was an answer. The
      // two guards that survived it only did so because their settle windows (3400ms and
      // 2200ms) happen to exceed 1200 — a coincidence, not a guarantee, and one that would
      // break silently the first time someone tightened a timeout.
      //
      // The 1200ms is still a race against the app's own mount-time effects, and at zero it
      // is visible: check:zero's sign-in reset empties `crews`, so crewInvite's payload is
      // occasionally built before that lands and the overlay opens instead of being skipped.
      // Both outcomes are correct — it either renders properly or is correctly reported as
      // having nothing to open it about — so the skip count at zero can differ by one
      // between runs. Do not treat that as a flake to chase; treat a FAILURE as one.
      "if(z)setTimeout(function(){__ovOpen.current(z);window.__overlaysReady=true;},1200);" +
      "else window.__overlaysReady=true;},[]);",
  };
}

// Warm the LAZY children, not just the entry.
//
// #693 raised the goto timeout to 120s because the Climbs tab lazily imports DbAreaBrowser
// and the dev server compiles that chunk on the first request for it. A bigger budget is
// not a fix: on a machine held at high load by a parallel session the run still died at
// 120s on the FIRST navigation. Vite's own warmup starts transforming these at server boot,
// overlapping with Playwright launching Chrome, so the chunks are largely built before the
// first goto instead of being paid for inside its timeout.
//
// Discovered from the source for the same reason the overlay list is: a hardcoded file list
// silently narrows every time the code moves.
export function lazyChunks(label) {
  const files = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "main.jsx"];
  const out = new Set();
  for (const f of files) {
    let src;
    try { src = readFileSync(new URL("../../" + f, import.meta.url), "utf8"); } catch { continue; }
    for (const m of src.matchAll(/lazy\(\s*\(\)\s*=>\s*import\("([^"]+)"\)/g)) {
      // warmup.clientFiles takes real file paths, not module specifiers: most of these are
      // written extensionless ("./lib/DbAreaBrowser") and would warm NOTHING if passed
      // through. Resolve against disk and say so if one does not exist, rather than
      // shipping a warm list that quietly covers one file out of six.
      const spec = m[1];
      const cand = [spec, spec + ".jsx", spec + ".js", spec + "/index.jsx", spec + "/index.js"];
      const hit = cand.find((c) => existsSync(new URL("../../" + c.replace(/^\.\//, ""), import.meta.url)));
      if (hit) out.add(hit);
      else console.error(`${label} — lazy import ${JSON.stringify(spec)} did not resolve to a file; it will not be warmed.`);
    }
  }
  if (!out.size) {
    console.error(`${label} — no lazy imports found to warm; if the app still uses lazy(), the pattern in scripts/lib/overlay-scaffold.mjs needs updating.`);
  }
  return [...out];
}

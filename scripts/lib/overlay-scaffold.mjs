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
  // `sessionRestoring` deliberately gets NO entry — it is a derived const
  // (`realAuthGate && session===undefined`), not state, so discovery cannot return it and an
  // exemption naming it would be the stale bookkeeping this registry fails on. `editDraft` is
  // no longer here either: it is opened with a LIFTED literal, see `lift` in OVERLAY_PAYLOADS.
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
  // ---- reachable only by building the screen they live inside ----
  //
  // These two render INSIDE the openGroupId group view, and the `posts` they look up is a
  // local of that IIFE — which is why they were exempt as unreachable. They are not
  // unreachable; they need the screen around them to exist first, and every piece of that
  // screen is App state the opener can set.
  //
  // `prep` runs before the payload: inject a group, give it a post, open the group. The view
  // does createdGroups.concat(GROUPS).find(id) and returns null on a miss, so the group must
  // be in createdGroups; ownerId:0 satisfies its non-_db isCreator branch; groupPosts[id] is
  // what becomes the `posts` local. None of this is DB-backed — group posts are client state —
  // so no fixture could seed them, and this is the only way to reach these two in any walk.
  postMenuFor: { prep: 'setCreatedGroups([{id:"__ov_group",name:"Overlay probe group",blurb:"",location:"",disciplines:["alpine"],visibility:"public",ownerId:0,memberIds:[0],moderatorIds:[]}]);setGroupPosts({__ov_group:[{id:"__ov_post",authorId:0,text:"Overlay probe post.",date:"2026-01-01"}]});setOpenGroupId("__ov_group");', expr: '"__ov_post"' },
  reactPickerFor: { prep: 'setCreatedGroups([{id:"__ov_group",name:"Overlay probe group",blurb:"",location:"",disciplines:["alpine"],visibility:"public",ownerId:0,memberIds:[0],moderatorIds:[]}]);setGroupPosts({__ov_group:[{id:"__ov_post",authorId:0,text:"Overlay probe post.",date:"2026-01-01"}]});setOpenGroupId("__ov_group");', expr: '"__ov_post"' },

  // NOTE: a dialog state initialised to `false` needs no entry here — it is a flag whatever
  // it is called, and is opened with `true`. `confirmDelete` and `pastExpand` are the two
  // today. Only state that HOLDS something needs a payload.

  // A data-rights request KIND, not an object. Both setter call sites pass a bare string —
  // setDataReq("export") and setDataReq("optout") — and the sheet's copy branches on which,
  // so an object here would render the opt-out wording under the export heading rather than
  // fail loudly. "export" is the one reached from Settings → Your data.
  dataReq: { expr: '"export"' },

  // A legal document KIND, not an object — `<LegalView kind={legal}/>` is an App early-return
  // SCREEN (shape 3), so it replaces the nav rather than layering over it. The only two setter
  // call sites are setLegal("terms") and setLegal("privacy"); "terms" is the one the sign-in
  // gate links to. Lifted from the app, not invented, like every entry here.
  legal: { expr: '"terms"' },

  // The profile editor, an App early-return SCREEN whose payload is a 386-character
  // ME-derived object literal. `lift` EXTRACTS that literal from the app's own setter call
  // site by balancing braces, rather than copying it here.
  //
  // Copying would satisfy "lifted, not invented" on the day it was written and then rot: it
  // is a second copy of a shape that lives elsewhere, so adding a field to the draft would
  // leave this one silently stale, opening a half-filled editor that reads like a broken
  // screen rather than failing loudly. check:anniversary records exactly this trap and solves
  // it the same way — extract the literal, never hand-write it.
  //
  // The expression references ME, weekOf and showRealName, all App scope, and the opener is
  // injected inside App, so it evaluates where the app itself evaluates it.
  editDraft: { lift: "setEditDraft({" },


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
// Shape 3: an App EARLY-RETURN SCREEN — `if(state)return <…>` at App's top level.
//
// Shapes 1 and 2 both look for something that renders a DIALOG. These do not: they replace
// the whole screen, nav included, so a behavioural dialog test cannot see them and never
// could. Measured before this existed: discovery found 51 states and `legal`, `editDraft`
// and `sessionRestoring` were in none of them, while `calOpen`, `inboxOpen`, `dashOpen` and
// `guideAppOpen` — early returns that ALSO render dialog-ish content — were already caught
// by shape 2. So the hole was exactly the screens that are only screens.
//
// That matters more than an uncovered overlay: these are early returns from App, so a crash
// in one blanks the entire app — the #317/#359 failure the whole guard suite exists for —
// and the terms/privacy screen was rendered by no browser guard at all.
//
// Deliberately NOT Babel-scoped to App the way check:toast-reachable is. Every match is
// intersected with the App-level `useState` names shapes 1 and 2 already parse, so an
// `if(x)return <…>` inside a nested component cannot enter the list unless that component
// also declares a same-named App-level state — and the fail-closed payload registry would
// catch that on the next run rather than silently walking something meaningless.
export function screenOverlays(appCode) {
  // `at` must be the DECLARATION offset, not the offset of the early return. buildOpener
  // keeps only states declared ABOVE its injection anchor, and the return that renders a
  // screen sits in App's render section tens of thousands of characters BELOW that anchor.
  // Recording the return's offset therefore reported both screens as unreachable when both
  // are declared at ~15,900 against an anchor at ~113,400 — a wrong position, not a wrong
  // list, and it failed loudly rather than silently only because check:overlay-discovery
  // treats an unopenable overlay as a defect.
  const declared = new Map();
  for (const m of appCode.matchAll(/\[([a-zA-Z][\w$]*),(set[A-Z][\w$]*)\]=useState\(/g))
    if (!declared.has(m[1])) declared.set(m[1], m.index);
  const found = [];
  const seen = new Set();
  for (const m of appCode.matchAll(/if\(([a-zA-Z][\w$]*)\)return\s*</g)) {
    const name = m[1];
    if (!declared.has(name) || seen.has(name)) continue;
    seen.add(name);
    found.push({ name, setter: "set" + name[0].toUpperCase() + name.slice(1), at: declared.get(name), kind: "screen", evidence: "App early-return screen" });
  }
  return found;
}

export function overlayStates(code, coreCode) {
  const core = coreCode != null ? coreCode : readFileSync(new URL("../../ClimbMatchCore.jsx", import.meta.url), "utf8");
  const first = [...flagOverlays(code), ...dialogOverlays(code, core)];
  const have = new Set(first.map((o) => o.name));
  // Shapes 1 and 2 win: an early return that also renders a dialog is already opened
  // correctly by them, and re-listing it would walk the same state twice.
  return [...first, ...screenOverlays(code).filter((o) => !have.has(o.name))];
}

// Build the opener effect. `?zt=<tab>` selects a tab, `?z=<overlayName>` opens an overlay.
//
// Only setters declared ABOVE the injection point are in scope. Anything below is named in
// the output rather than silently dropped — a modal that quietly stops being walked is
// exactly the blind spot these checks exist to close.
// ---------------------------------------------------------------------------------------
// RouteDetail's own overlays.
//
// The App-level opener cannot reach these: it injects into App, and these flags are local to
// components in RouteDetail.jsx, so no `?z=` can set them. check:overlay-discovery printed
// the count as a known hole from 2026-08-09; this closes it by injecting a second opener into
// each component that owns one.
//
// Two components own overlays today, which is why this is keyed by component rather than
// assuming one injection site. Each anchor must appear EXACTLY once and must sit BELOW every
// flag that component declares, so they are all in scope where the effect is spliced in.
// `?z=rd:shareOpen` opens RouteDetail's share sheet; `?z=shareOpen` opens App's. Both exist.
export const RD_PREFIX = "rd:";

export const ROUTE_DETAIL_ANCHORS = {
  RouteDetail: "const [quickPhotoPick,setQuickPhotoPick]=useState([]);",
};

// Which component encloses a given offset — the nearest preceding top-level declaration.
function ownerAt(code, pos) {
  let best = null;
  for (const m of code.matchAll(/function ([A-Z][\w$]*)\s*\(/g)) {
    if (m.index < pos) best = m[1]; else break;
  }
  return best;
}

export function routeDetailSource() {
  return readFileSync(new URL("../../RouteDetail.jsx", import.meta.url), "utf8");
}

// Discovered by BEHAVIOUR, exactly like the App side — and the first draft of this function
// did not, which is worth recording because it made the same mistake this whole guard exists
// to catch. Matching `*Open` + useState(false) returned five names, and two of them are not
// modals at all: `trackHistOpen` is a "See N older tracks" expander (`trackHistOpen?ct:ct.slice(0,2)`)
// and `notesOpen` is a "Data notes ▾" disclosure inside ProvenancePanel. Both were duly
// "opened", rendered no dialog, and were reported as overlays that never mounted — noise that
// looks exactly like a real finding. A name is not evidence; what it renders is.
export function routeDetailOverlays(rdCode) {
  const dlg = dialogComponents(rdCode);
  const out = [];
  for (const m of rdCode.matchAll(/\[([a-zA-Z][\w$]*),(set[A-Z][\w$]*)\]=useState\(([^)]{0,30})/g)) {
    const [name, setter, init] = [m[1], m[2], m[3].trim()];
    if (init !== "false") continue; // RouteDetail's modals are all plain flags today
    let evidence = null;
    for (const r of rdCode.matchAll(new RegExp("\\{\\s*" + name + "\\s*(?:&&|\\?)", "g"))) {
      const end = matchBrace(rdCode, r.index);
      if (end < 0) continue;
      const seg = rdCode.slice(r.index, end);
      const t = TAG.exec(seg);
      if (!t) continue;
      if (dlg.has(t[1])) { evidence = "renders <" + t[1] + ">"; break; }
      const d = seg.indexOf('role="dialog"');
      if (d >= 0 && (seg.slice(0, d).match(/<[A-Za-z][\w$.]*/g) || []).length <= 1) { evidence = 'inline role="dialog"'; break; }
    }
    if (evidence) out.push({ name, setter, at: m.index, component: ownerAt(rdCode, m.index), kind: "flag", evidence });
  }
  return out;
}

// Returns the transformed RouteDetail source plus the names it can open.
//
// The opener sets `__overlaysReady` ITSELF rather than letting App set it. That is the whole
// point: readiness has to mean "the thing that opens THIS overlay has run", and for a
// RouteDetail modal that is this effect, which cannot run until App has navigated into a
// route and the component has mounted. App setting it would put the guards back to asking
// what happened before anything had — the #768 bug, one level down.
export function buildRouteDetailOpener(rdCode, label) {
  const all = routeDetailOverlays(rdCode);
  const byComponent = new Map();
  for (const s of all) {
    if (!byComponent.has(s.component)) byComponent.set(s.component, []);
    byComponent.get(s.component).push(s);
  }
  const homeless = [...byComponent.keys()].filter((c) => !ROUTE_DETAIL_ANCHORS[c]);
  if (homeless.length) {
    // Fail closed, same principle as the payload registry: an overlay in a component with no
    // anchor is one nothing opens, and silence about it is exactly what this closes.
    throw new Error(
      `${label} — RouteDetail.jsx declares overlays in component(s) with no injection anchor: ` +
      homeless.map((c) => `${c} (${byComponent.get(c).map((s) => s.name).join(", ")})`).join("; ") +
      `. Add an anchor to ROUTE_DETAIL_ANCHORS in scripts/lib/overlay-scaffold.mjs, below every flag that component declares.`
    );
  }

  // An anchor for a component that no longer owns an overlay is stale bookkeeping, and stale
  // bookkeeping is how these lists rot. Same standard as NEEDS_EXTRA_STATE and OVERLAY_PAYLOADS.
  const unused = Object.keys(ROUTE_DETAIL_ANCHORS).filter((c) => !byComponent.has(c));
  if (unused.length) {
    throw new Error(`${label} — ROUTE_DETAIL_ANCHORS lists ${unused.join(", ")}, which no longer owns an overlay. Remove it from scripts/lib/overlay-scaffold.mjs.`);
  }

  let out = rdCode;
  const names = [];
  for (const [component, states] of byComponent) {
    const anchor = ROUTE_DETAIL_ANCHORS[component];
    const n = out.split(anchor).length - 1;
    if (n !== 1) {
      throw new Error(`${label} — ANCHOR LOST in RouteDetail.jsx: expected exactly 1 occurrence of\n  ${anchor}\nbut found ${n}. Nothing below was actually checked.`);
    }
    const at = out.indexOf(anchor);
    const below = states.filter((s) => s.at >= at + anchor.length);
    if (below.length) {
      throw new Error(`${label} — ${component}'s anchor sits above ${below.map((s) => s.name).join(", ")}, so they are not in scope where the opener is injected. Move the anchor below them.`);
    }
    // NAMESPACED, because the two files collide: `shareOpen` is declared in ClimbMatch.jsx
    // AND in RouteDetail.jsx, and they are different sheets. Un-prefixed, whichever opener
    // was consulted first won and the other was never walked at all — the first run of this
    // silently stopped checking App's share sheet and reported RouteDetail's twice.
    for (const s of states) names.push(RD_PREFIX + s.name);
    const map = states.map((s) => JSON.stringify(RD_PREFIX + s.name) + ":" + s.setter).join(",");
    const inject =
      "useEffect(function(){var M={" + map + "};" +
      "var z=new URLSearchParams(location.search).get('z');" +
      "if(z&&M[z]){M[z](true);window.__overlaysReady=true;}},[]);";
    out = out.replace(anchor, anchor + inject);
  }
  return { code: out, names, states: all };
}

// One line for a config's transform hook: hand it every module, it claims RouteDetail.jsx and
// returns null for everything else.
//
// This exists because passing the wiring by hand did not survive contact. FIVE configs call
// buildOpener and #779 wired THREE — a11y-badges and anniversary silently kept walking without
// RouteDetail's modals, so check:a11y-badges and check:overflow were narrower than the other
// three and nothing said so. That is the exact drift the shared scaffold was factored out to
// prevent, reintroduced as per-config boilerplate. Anything a config has to remember is
// something a config will forget.
export function routeDetailTransform(code, id, label) {
  if (!id.endsWith("/RouteDetail.jsx")) return null;
  return buildRouteDetailOpener(code, label).code;
}

// Same reasoning, the other half: the names DEFAULT to the ones on disk, so a config that does
// not pass them still opens a route rather than walking a quietly narrower set.
let _rdNames = null;
export function routeDetailNames() {
  if (!_rdNames) _rdNames = buildRouteDetailOpener(routeDetailSource(), "overlay-scaffold").names;
  return _rdNames;
}

// Resolve a payload to a JS expression. `expr` is written here; `lift` is EXTRACTED from the
// app's own source by balancing braces from a setter call site, so it cannot drift from the
// shape the app actually sets. Fails loudly rather than returning a truncated literal, because
// a half-extracted object would open a half-filled screen that reads like a product bug.
function payloadExpr(name, code) {
  const p = OVERLAY_PAYLOADS[name];
  if (p.expr) return p.expr;
  const at = code.indexOf(p.lift);
  if (at < 0) throw new Error(`overlay-scaffold: payload for ${name} lifts from ${JSON.stringify(p.lift)}, which is not in the app source — the call site was renamed`);
  const open = at + p.lift.length - 1;
  const end = matchBrace(code, open);
  if (end < 0) throw new Error(`overlay-scaffold: payload for ${name} lifts from ${JSON.stringify(p.lift)} but its braces do not balance`);
  return code.slice(open, end + 1);
}

export function buildOpener(code, anchor, label, coreCode, routeDetailNames_) {
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
    // Any NON-FLAG kind without a payload is a no-op opener, not just a dialog. Shape 3
    // (screens) added a second payload-taking kind, and testing for "dialog" by name meant an
    // exempt screen fell through to `OVERLAY_PAYLOADS[name].expr` and died on undefined. The
    // kind decides how you OPEN it; only `flag` opens with plain `true`.
    if (s.kind !== "flag" && !OVERLAY_PAYLOADS[s.name]) return q + ":function(){}";
    const arg = s.kind === "flag" ? "true" : payloadExpr(s.name, code);
    const why = JSON.stringify(s.kind === "flag" ? "" : (OVERLAY_PAYLOADS[s.name].needsData || "its payload resolved empty in this fixture"));
    const prep = (s.kind === "flag" ? "" : (OVERLAY_PAYLOADS[s.name].prep || ""));
    // `prep` builds the screen a nested modal lives inside, before its payload is evaluated.
    return q + ":function(){try{" + prep + "var v=(" + arg + ");" +
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
  const rdNames = routeDetailNames_ || routeDetailNames();
  const names = usable.map((s) => JSON.stringify(s.name)).concat(rdNames.map((n) => JSON.stringify(n))).join(",");
  const rdSet = JSON.stringify(rdNames);
  return {
    usable,
    skipped,
    inject:
      "var __ovOpen=useRef(null);" +
      // RouteDetail's overlays are opened by RouteDetail's own effect, but that component
      // does not exist until a route is selected — so App's job for those names is only to
      // navigate. It deliberately does NOT set __overlaysReady: RouteDetail does, once it has
      // actually opened the thing. Setting it here would mean "App has navigated", which is
      // not the question any guard is asking.
      "var __rdOv=" + rdSet + ";" +
      "__ovOpen.current=function(z){if(__rdOv.indexOf(z)>=0){openRoute(__zrPick());return;}var M={" + map + "};if(M[z])M[z]();};" +
      "useEffect(function(){window.__overlays=[" + names + "];" +
      "var p=new URLSearchParams(location.search);var t=p.get('zt');var z=p.get('z');" +
      "if(t)setTab(t);" +
      // `?zr=1` opens the route detail screen and nothing else. check:overflow reached it by
      // driving the UI — select a state, tap Routes, tap the first row — and that drill-in did
      // not complete under the scaffold config, so the richest layout in the app, and the one
      // where both recorded overflow bugs lived, printed NOT REACHED on every run. CLAUDE.md
      // calls fixing it the top follow-up. Navigating directly is deterministic and cannot be
      // defeated by a row that renders differently or a list that is slow.
      // Readiness is deferred here for the same reason it is everywhere else in this file,
      // and getting it wrong once more is what the first CI run caught: with `?zr=1` and no
      // `z`, the `else` at the bottom set __overlaysReady SYNCHRONOUSLY while this navigation
      // waits 900ms, so the guard read window.__routeOpen before it could exist and reported
      // the route page as unreachable. Ready must mean "the thing that opens THIS screen has
      // run" — see the note below and #768.
      "var _zr=p.get('zr');var _zrp=p.get('zrp');" +
"function __zrPick(){if(!_zrp)return ROUTES[0];" +
"for(var i=0;i<ROUTES.length;i++){var _pd=ROUTES[i].pitchDetail;if(Array.isArray(_pd)&&_pd.length&&_pd.some(function(x){return x&&x.crux;}))return ROUTES[i];}" +
"window.__zrNoPitched=true;return ROUTES[0];}" +
"if(_zr){setTimeout(function(){openRoute(__zrPick());window.__routeOpen=true;window.__overlaysReady=true;},900);}" +
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
      // For a RouteDetail overlay, RouteDetail's effect sets readiness the moment it opens.
      // The 2500ms here is only a FLOOR for the case where it never does — without it a
      // broken RouteDetail opener would hang each guard on its 60s waitForFunction, six tabs
      // deep, and turn one defect into a half-hour run. Tripping the floor lets the guard
      // judge the screen and fail properly, which is the useful outcome.
      "if(z)setTimeout(function(){var _rd=__rdOv.indexOf(z)>=0;__ovOpen.current(z);" +
      "if(_rd)setTimeout(function(){window.__overlaysReady=true;},2500);" +
      "else window.__overlaysReady=true;},1200);" +
      "else if(!_zr)window.__overlaysReady=true;},[]);",
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

// check:crew — guards the crew "Ready" calculation.
//
// A crew reaching Ready is the signal that day, time and place are locked in for
// EVERYONE — it's what tells a climber their partners are committed to an alpine
// start. Getting it wrong is safety-adjacent, not cosmetic.
//
// It broke once already: useMyCrews fetches crew_members(*) and crew_day_acks(*),
// but the hydration discarded both — members was hardcoded to [{climberId:0}] and
// only the current user's acks were kept. That made need=[0] and dayAcks=[0], so
// datesAgreed() returned true unconditionally: every DB-backed crew reported Ready
// on the creator's ack alone (fixed in #414). datesAgreed itself was always correct;
// only its input was wrong, which is why a unit test on the function alone would
// have missed it. This checks the hydration AND the calculation together.
//
// Both are extracted from the real ClimbMatch.jsx source rather than reimplemented,
// so this fails if either is edited into a wrong shape.
import { readFileSync } from "node:fs";

// The app is split across ClimbMatch.jsx (App) and ClimbMatchCore.jsx (helpers,
// seed data, presentational components); markers may live in either. Core is
// optional so this also works on pre-split checkouts.
const readOpt = (u) => { try { return readFileSync(u, "utf8"); } catch { return ""; } };
const SRC = readFileSync(new URL("../ClimbMatch.jsx", import.meta.url), "utf8") +
  "\n" + readOpt(new URL("../ClimbMatchCore.jsx", import.meta.url));

function extractBraced(marker) {
  const i = SRC.indexOf(marker);
  if (i < 0) throw new Error(`could not find ${marker} in ClimbMatch.jsx`);
  let depth = 0, start = SRC.indexOf("{", i);
  for (let k = start; k < SRC.length; k++) {
    if (SRC[k] === "{") depth++;
    else if (SRC[k] === "}" && --depth === 0) return SRC.slice(i, k + 1);
  }
  throw new Error(`unbalanced braces after ${marker}`);
}

// the crew-row -> app-crew mapping inside the useMyCrews effect
// (the mapper no longer reads row.dismissed — archiving is per-user/local-only —
// so the end marker is the meet_time field, the mapper's last)
const H_END = 'meetTime:row.meet_time||""};';
const hStart = SRC.indexOf("var mid=function(u)");
const hEnd = SRC.indexOf(H_END, hStart);
if (hStart < 0 || hEnd < 0) {
  console.error("check:crew FAILED — could not locate the crew hydration block.");
  console.error("If it was intentionally restructured, update this script's markers.");
  process.exit(1);
}
const hydrationBody = SRC.slice(hStart, hEnd + H_END.length);

const mod = new Function(
  "row", "uid",
  `${extractBraced("function datesAgreed(c)")}
   const __c = (function(){ ${hydrationBody} })();
   return { crew: __c, ready: datesAgreed(__c) };`
);

const UID = "me-uuid-0000", PARTNER = "partner-uuid-1111";
const base = {
  id: "crew1", route_id: "wa_x", area_id: null, discipline: null, cap: 4, dates: ["2026-08-01"], dismissed: false,
  meet_place: "Trailhead", meet_time: "Dawn", float_plan: null,
  crew_members: [
    { user_id: UID, status: "confirmed", note: "" },
    { user_id: PARTNER, status: "confirmed", note: "" },
  ],
  crew_day_acks: [{ user_id: UID, date: "2026-08-01" }],
};

const cases = [
  ["confirmed partner has NOT acked -> NOT ready", base, false],
  ["partner acks the same day -> ready",
    { ...base, crew_day_acks: [...base.crew_day_acks, { user_id: PARTNER, date: "2026-08-01" }] }, true],
  ["each acked a DIFFERENT day -> NOT ready",
    { ...base, dates: ["2026-08-01", "2026-08-02"],
      crew_day_acks: [{ user_id: UID, date: "2026-08-01" }, { user_id: PARTNER, date: "2026-08-02" }] }, false],
  ["partner still 'invited' -> ready on my ack alone",
    { ...base, crew_members: [{ user_id: UID, status: "confirmed" }, { user_id: PARTNER, status: "invited" }] }, true],
  ["solo crew -> ready on my ack", { ...base, crew_members: [{ user_id: UID, status: "confirmed" }] }, true],
];

const failures = [];
for (const [name, row, want] of cases) {
  let got;
  try { got = mod(row, UID).ready; }
  catch (e) { failures.push(`${name} — threw: ${e.message}`); continue; }
  if (got !== want) failures.push(`${name} — got ${got}, want ${want}`);
  console.log(`  ${got === want ? "ok  " : "FAIL"}  ${name}`);
}

// the hydration must carry every member through, not just the current user
const { crew } = mod(base, UID);
if (crew.members.length !== 2) failures.push(`hydration dropped members — got ${crew.members.length}, want 2`);
if (!crew.members.some(m => m.climberId === 0)) failures.push("current user not mapped to climberId 0");
if (!crew.members.some(m => m.climberId === PARTNER)) failures.push("partner not carried through hydration");
console.log(`  ${crew.members.length === 2 ? "ok  " : "FAIL"}  hydration carries all crew_members`);

// A crew has ONE place (0302): a route, or an area + the session's discipline. The hydration must carry
// both halves, and Ready must not care which — the day/meet/confirm rules read neither.
{
  const areaRow = { ...base, route_id: null, area_id: "ut_hellgate_cliffs", discipline: "sport", crew_day_acks: [...base.crew_day_acks, { user_id: PARTNER, date: "2026-08-01" }] };
  let a;
  try { a = mod(areaRow, UID); } catch (e) { failures.push(`area crew — hydration threw: ${e.message}`); }
  if (a) {
    const okA = a.crew.areaId === "ut_hellgate_cliffs" && a.crew.discipline === "sport" && a.crew.routeId === null && a.ready === true;
    if (!okA) failures.push(`area crew — got areaId=${a.crew.areaId} discipline=${a.crew.discipline} routeId=${a.crew.routeId} ready=${a.ready}; want the area, the discipline, no route, ready`);
    console.log(`  ${okA ? "ok  " : "FAIL"}  an AREA crew hydrates areaId + discipline, no routeId, and still computes Ready`);
    const r = mod(base, UID).crew;
    const okR = r.areaId === null && r.discipline === null && r.routeId === "wa_x";
    if (!okR) failures.push(`route crew — got areaId=${r.areaId} discipline=${r.discipline} routeId=${r.routeId}; want null, null, wa_x`);
    console.log(`  ${okR ? "ok  " : "FAIL"}  a ROUTE crew hydrates with no area and no discipline`);
  }
}

// THE CREW JOURNEY (crewStage, 2026-11-14). The card's 7-step strip and its ONE next step are derived
// from the crew, so each rule the owner signed off is a case here: proposing a day is not agreeing to
// it, the Meet-up step needs a SAVED time, Ready is exactly its parts (the card once showed "3 / 3" and
// "Not ready yet" together), a join request never holds a step up, and Climb takes over on the day.
{
  let stageFn;
  try {
    stageFn = new Function(
      `const DLOCALE="en-US";
       ${extractBraced("function localYmd(d)")}
       ${extractBraced("function crewInCrew(c)")}
       ${extractBraced("function datesAgreed(c)")}
       ${extractBraced("function dayRankPos(c)")}
       ${extractBraced("function rankAgreedDays(c,days,need)")}
       ${extractBraced("function agreedDate(c)")}
       ${extractBraced("function dayWaitingOnMe(c)")}
       ${extractBraced("function crewTimeLabel(t)")}
       ${extractBraced("function crewStage(c,ctx)")}
       crewStage.dayWaitingOnMe = dayWaitingOnMe;
       return crewStage;`
    )();
  } catch (e) { failures.push(`crewStage — could not extract/compile: ${e.message}`); }
  if (stageFn) {
    const D = "2026-08-01", D2 = "2026-08-02";
    const mates = [{ climberId: 0, status: "confirmed" }, { climberId: 7, status: "confirmed" }];
    const both = { [D]: [0, 7] };
    const full = { id: "c", members: mates, dates: [D], dayAcks: both, meetPlace: "Trailhead", meetTime: "05:00" };
    const before = { today: "2026-07-20" };
    const keys = (st) => st.steps.filter((s) => s.done).map((s) => s.key).join(",");
    const sc = [
      ["a PROPOSED day (only I picked it) is not agreed, and Day is the current step",
        { ...full, dayAcks: { [D]: [0] }, date: null }, before,
        (st) => st.current === "day" && st.agreed === null && !st.steps[1].done && st.steps[1].waitingOn.join() === "7"],
      ["a day carried in crew.date WITHOUT everyone's pick is still not agreed (proposing never locks)",
        { ...full, dayAcks: { [D]: [0] }, date: D }, before,
        (st) => st.agreed === null && !st.steps[1].done],
      ["the organiser's Lock anyway agrees the day",
        { ...full, dayAcks: { [D]: [0] }, date: D, dateForced: true }, before,
        (st) => st.agreed === D && st.steps[1].done],
      ["meet PLACE without a TIME leaves Meet-up open, and its summary names the place",
        { ...full, meetTime: "" }, { ...before, hasMessages: true },
        (st) => st.current === "meet" && !st.steps[2].done && /Trailhead/.test(st.steps[2].summary) && /no time/.test(st.steps[2].summary)],
      ["a saved 24h time reads as 12h in the summary",
        full, before, (st) => /5:00 AM/.test(st.steps[2].summary)],
      ["everything set but nobody has said hi: Ready is NOT done and names the chat part",
        full, before, (st) => !st.ready && st.current === "ready" && /crew chat/.test(st.steps[3].summary)],
      ["everything set and the chat started: Ready, and Climb is next",
        full, { ...before, hasMessages: true }, (st) => st.ready && st.current === "climb" && keys(st) === "crew,day,meet,ready"],
      ["Backcountry: Ready also waits on each member's safety check",
        { ...full, safetyDone: [0] }, { ...before, hasMessages: true, backcountry: true },
        (st) => !st.ready && st.parts.some((p) => p.key === "safety" && !p.done && p.waitingOn.join() === "7")],
      ["a pending JOIN REQUEST does not hold the Crew step up",
        { ...full, members: [...mates, { climberId: 9, status: "pending" }] }, { ...before, hasMessages: true },
        (st) => st.steps[0].done && st.ready],
      ["an INVITED member does hold the Crew step up, and is named as who it waits on",
        { ...full, members: [...mates, { climberId: 9, status: "invited" }] }, before,
        (st) => !st.steps[0].done && st.current === "crew" && st.steps[0].waitingOn.join() === "9"],
      ["ON the agreed day, Climb is current even with Ready unfinished",
        full, { today: D }, (st) => st.dayReached && st.current === "climb" && !st.ready],
      ["after the day, unlogged: Log is current",
        full, { today: D2 }, (st) => st.current === "log"],
      ["a crew of JUST YOU is not Crew ✓, and its summary asks you to invite (walkthrough 2026-11-14)",
        { ...full, members: [{ climberId: 0, status: "confirmed" }], dayAcks: { [D]: [0] } }, before,
        (st) => !st.steps[0].done && st.current === "crew" && /invite/.test(st.steps[0].summary)],
      ["logged: Vouch is current",
        full, { today: D2, logged: true, hasMessages: true }, (st) => st.current === "vouch"],
    ];
    for (const [name, crew, ctx, want] of sc) {
      let st, ok = false;
      try { st = stageFn(crew, ctx); ok = !!want(st); } catch (e) { failures.push(`crewStage: ${name} — threw: ${e.message}`); continue; }
      // READY IS EXACTLY ITS PARTS, in every case: the card reads both, so they must never disagree.
      const consistent = st.ready === st.parts.every((p) => p.done) && st.steps[3].done === st.ready;
      if (!consistent) failures.push(`crewStage: ${name} — Ready (${st.ready}) disagrees with its parts`);
      if (!ok) failures.push(`crewStage: ${name} — got current=${st.current} done=[${keys(st)}] agreed=${st.agreed}`);
      console.log(`  ${ok && consistent ? "ok  " : "FAIL"}  crewStage: ${name}`);
    }
    // THE DAY THAT WAITS ONLY ON YOU (late joiner): everyone else can make it, you have not answered.
    const w = stageFn.dayWaitingOnMe;
    const three = [...mates, { climberId: 9, status: "confirmed" }];
    const wc = [
      ["a late joiner: the other two picked D, the newcomer (you) has not -> D waits on you", { ...full, members: three, dayAcks: { [D]: [7, 9] } }, D],
      ["an agreed day does not wait on you", { ...full, dayAcks: { [D]: [0, 7] } }, null],
      ["a day another member has not picked does not wait on you", { ...full, members: three, dayAcks: { [D]: [7] } }, null],
      ["a crew of just you has nothing waiting on you", { ...full, members: [{ climberId: 0, status: "confirmed" }], dayAcks: { [D]: [] } }, null],
    ];
    for (const [name, crew, want] of wc) {
      let got; try { got = w(crew); } catch (e) { failures.push(`dayWaitingOnMe: ${name} — threw: ${e.message}`); continue; }
      const ok = got === want;
      if (!ok) failures.push(`dayWaitingOnMe: ${name} — got ${got}`);
      console.log(`  ${ok ? "ok  " : "FAIL"}  dayWaitingOnMe: ${name}`);
    }
  }
}

// BACKUP DAYS (0477, owner 2026-11-19: "3rd, 4th, 5th, etc back up days"). A member's order of the
// proposed days is crew_day_acks.rank. It used to be device-only state with two places (1st choice,
// Backup), each allowed on ONE day, so nobody else ever saw it. Pinned here: the order is hydrated
// for EVERY member, read as positions (a gap or a rank on a day taken back means nothing), named past
// "2nd backup", used to choose between days everyone can make -- and it never makes a day agreed.
{
  const D = "2026-08-01", D2 = "2026-08-02", D3 = "2026-08-03", D4 = "2026-08-04";
  let h; try {
    h = mod({ ...base, dates: [D, D2, D3], crew_members: [{ user_id: UID, status: "confirmed" }, { user_id: PARTNER, status: "confirmed" }],
      crew_day_acks: [{ user_id: UID, date: D, rank: 2 }, { user_id: UID, date: D2, rank: 1 }, { user_id: PARTNER, date: D2, rank: 3 }, { user_id: PARTNER, date: D3, rank: null }] }, UID).crew;
  } catch (e) { failures.push(`backup days — hydration threw: ${e.message}`); }
  if (h) {
    const r = h.dayRanks || {};
    const ok = (r[D] || {})[0] === 2 && (r[D2] || {})[0] === 1 && (r[D2] || {})[PARTNER] === 3 && !(r[D3] && PARTNER in r[D3]);
    if (!ok) failures.push(`backup days — hydration dropped a member's order: dayRanks=${JSON.stringify(h.dayRanks)}`);
    console.log(`  ${ok ? "ok  " : "FAIL"}  every member's order of the days (crew_day_acks.rank) is hydrated, a crewmate's included`);
  }
  let R; try { R = new Function(`${extractBraced("function dayRankPos(c)")}
    ${extractBraced("function dayRankLabel(pos,short)")}
    ${extractBraced("function rankAgreedDays(c,days,need)")}
    ${extractBraced("function agreedDate(c)")}
    return { dayRankPos, dayRankLabel, rankAgreedDays, agreedDate };`)(); } catch (e) { failures.push(`backup days — could not extract: ${e.message}`); }
  if (R) {
    const mates = [{ climberId: 0, status: "confirmed" }, { climberId: 7, status: "confirmed" }];
    const all = { [D]: [0, 7], [D2]: [0, 7], [D3]: [0, 7], [D4]: [0, 7] };
    const cases = [
      ["positions come from the ORDER, so ranks 2, 5, 9 read 1st, 2nd, 3rd",
        () => { const p = R.dayRankPos({ dayAcks: all, dayRanks: { [D]: { 0: 5 }, [D2]: { 0: 2 }, [D3]: { 0: 9 } } }); return p[D2][0] === 1 && p[D][0] === 2 && p[D3][0] === 3; }],
      ["a rank on a day the member no longer says they can make is ignored",
        () => { const p = R.dayRankPos({ dayAcks: { [D]: [7], [D2]: [0, 7] }, dayRanks: { [D]: { 0: 1 }, [D2]: { 0: 2 } } }); return !(p[D] && p[D][0]) && p[D2][0] === 1; }],
      ["places are named past the second backup: 1st choice, Backup, 2nd, 3rd, 4th backup",
        () => R.dayRankLabel(1) === "1st choice" && R.dayRankLabel(2) === "Backup" && R.dayRankLabel(3) === "2nd backup" && R.dayRankLabel(4) === "3rd backup" && R.dayRankLabel(5) === "4th backup" && R.dayRankLabel(10) === "9th backup" && R.dayRankLabel(0) === ""],
      ["of two days everyone can make, the agreed day is the one the crew ranked best, not the earliest",
        () => R.agreedDate({ dates: [D, D2], members: mates, dayAcks: all, dayRanks: { [D]: { 0: 2, 7: 2 }, [D2]: { 0: 1, 7: 1 } } }) === D2],
      ["a day one member did not order counts as their LAST choice",
        () => R.rankAgreedDays({ dates: [D, D2, D3], dayAcks: all, dayRanks: { [D]: { 0: 2 }, [D2]: { 0: 1, 7: 1 }, [D3]: { 0: 3, 7: 2 } } }, [D, D2, D3], [0, 7]).join() === [D2, D3, D].join()],
      ["with no order at all, or a tie, the earlier day wins (the rule as it stood)",
        () => R.agreedDate({ dates: [D, D2], members: mates, dayAcks: all }) === D && R.agreedDate({ dates: [D, D2], members: mates, dayAcks: all, dayRanks: { [D]: { 0: 1, 7: 2 }, [D2]: { 0: 2, 7: 1 } } }) === D],
      ["an order never AGREES a day: a 1st choice that one member cannot make is not agreed",
        () => R.agreedDate({ dates: [D, D2], members: mates, dayAcks: { [D]: [0], [D2]: [0] }, dayRanks: { [D]: { 0: 1 }, [D2]: { 0: 2 } } }) === null],
      ["the organiser's locked day still wins over the ranking",
        () => R.agreedDate({ date: D, dates: [D, D2], members: mates, dayAcks: all, dayRanks: { [D]: { 0: 2, 7: 2 }, [D2]: { 0: 1, 7: 1 } } }) === D],
    ];
    for (const [name, fn] of cases) {
      let ok = false; try { ok = !!fn(); } catch (e) { failures.push(`backup days: ${name} — threw: ${e.message}`); continue; }
      if (!ok) failures.push(`backup days: ${name}`);
      console.log(`  ${ok ? "ok  " : "FAIL"}  backup days: ${name}`);
    }
  }
  // The wiring: the card offers a place per day you can make, and the pick is WRITTEN (crew_rank_day).
  const card = readOpt(new URL("../lib/CrewCard.jsx", import.meta.url));
  const db = readOpt(new URL("../lib/db.js", import.meta.url));
  const wired = [
    ["the Day sheet offers as many places as the days you can make (not two fixed chips)", /Array\.from\(\{length:myDayN\}/.test(card) && /dayRankLabel\(n\)/.test(card) && !/\[\[1,"1st choice"\],\[2,"Backup"\]\]/.test(card)],
    ["the card reads the order through dayRankPos, never crew.dayRanks raw", /dayRankPos\(crew\)/.test(card) && !/crew\.dayRanks/.test(card)],
    ["lib/db.js writes the order through crew_rank_day", /rpc\("crew_rank_day",\s*\{\s*p_crew:\s*crewId,\s*p_date:\s*day,\s*p_rank:\s*rank\s*\}\)/.test(db)],
    ["App's meRankDate sends the order to the database and reverts a refused write", /const meRankDate=[^\n]*rankCrewDay\(_cc\._dbId,day,at\)[^\n]*\.catch\([^\n]*dayRanks:prev\.dayRanks/.test(SRC)],
  ];
  for (const [name, ok] of wired) {
    if (!ok) failures.push(`backup days: ${name}`);
    console.log(`  ${ok ? "ok  " : "FAIL"}  backup days: ${name}`);
  }
}

// PROPOSING A DAY MUST NOT WRITE THE AGREED DAY. The card's addDay/rmDay once sent `date: nd[0]`,
// which updateCrew writes to crews.agreed_date -- one proposed day became "Coming up" for everyone.
{
  const card = readOpt(new URL("../lib/CrewCard.jsx", import.meta.url));
  const m = /const addDay=v=>\{[^\n]*?\};/.exec(card);
  const ok = !!m && !/date:\s*nd\[/.test(m[0]) && !/\bdate:nd/.test(card);
  if (!ok) failures.push("CrewCard's addDay/rmDay write `date` (crews.agreed_date) when a day is only PROPOSED");
  console.log(`  ${ok ? "ok  " : "FAIL"}  proposing a day on the crew card does not set the agreed day`);
}

if (failures.length) {
  console.error(`\n${failures.length} crew-ready check failure(s):\n`);
  failures.forEach(f => console.error("  - " + f));
  console.error("\nA crew must not report Ready until every CONFIRMED member has acked the same day.");
  process.exit(1);
}
console.log("\ncrew Ready calculation: ok");

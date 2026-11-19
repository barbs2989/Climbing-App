#!/usr/bin/env node
// audit:optimal-season — does a route page say ONE thing about when to go?
//
// A route page can state its season three times: the HEADER strap (`routes.season`, else the
// route's own Optimal window, else its area's months — lib/seasonText.js routeSeasonShort), the
// OPTIMAL WINDOW sentence and the 12-month CALENDAR of SEASONAL GUIDANCE
// (`seasonal_guidance.{optimalWindow, monthBreakdown}`, src/components/SeasonalGuidancePanel.tsx).
// They were written by different passes and nothing compared them. The first run (owner note
// "Audit optimal season", 2026-11-18) found Tye Peak's header saying Nov-Apr above a window and a
// calendar that both said Jul-Oct, and eight more like it — every one a snow or ice line whose
// header held a summer season, or the reverse.
//
// It also reads the window's VOICE: "per prior research", "only two dated data points exist" and
// first-ascent dates are the pipeline talking to itself, printed in a green box to a climber.
//
// REPORT-ONLY, exit 0 (non-zero only when the read fails — an empty read is never "no findings").
//   npm run audit:optimal-season                 the four checks, with denominators
//   npm run audit:optimal-season -- --json f     ...and every finding to a file
//   npm run audit:optimal-season -- --shoulders  every range that ENDS on a month its own calendar calls risky
//   npm run audit:optimal-season -- --headers    what the header prints for routes whose own window feeds it
//   npm run audit:optimal-season -- --selftest   the parser on the shapes that fooled the first draft; no DB
//
// WHAT IT CANNOT SEE: which side of a contradiction is RIGHT. It reports that two surfaces
// disagree; deciding needs sources (the first run's nine were researched one by one). A window
// in season WORDS only ("Mid to late summer") is read as those seasons' months, coarsely, and only
// for the no-overlap test. A risky month at the very END of a range ("Jun-Oct" with October risky)
// is a SHOULDER and is counted, not listed as a contradiction.
import fs from "node:fs";
import { monthRank, MONTH_ABBR } from "../lib/seasonWindow.js";
import { routeSeasonShort } from "../lib/seasonText.js";

const argv = process.argv.slice(2);
const MON = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const Q = "(?:(early|mid|late)(?:[- ]to[- ](?:early|mid|late))?[- ])?";
const SEP = "\\s*(?:\\([^)]*\\)\\s*)?(?:[-–—]|to|through|thru|into|until)\\s*";
const RANGE = new RegExp("\\b" + Q + MON + SEP + Q + MON + "\\b", "gi");
const ONE = new RegExp("\\b" + Q + MON + "\\b", "gi");
// Each end is ONE group (a month or a season word), so m[1..4] read as Q, end, Q, end like RANGE.
const END = "((?:" + MON.slice(1) + "|winter|spring|summer|autumn|fall)";
const SRANGE = new RegExp("\\b" + Q + END + SEP + Q + END + "\\b", "gi");
const SEASONS = { winter: [11, 0, 1], spring: [2, 3, 4], summer: [5, 6, 7], autumn: [8, 9, 10], fall: [8, 9, 10] };
const NEG = /\b(avoid|not|except|outside|never)\b/i;

/* Every month a window names, clause by clause. A clause that says to AVOID its months is skipped
   (seasonWin's rule, lib/seasonText.js). A range counts its ends as PARTIAL when they carry
   early/mid/late. "May" as a month is matched case-sensitively, so the verb "may" is not a month. */
export function monthsOf(text) {
  const months = new Set(), partial = new Set(), ends = new Set();
  let words = false;
  for (const clause of String(text || "").split(/[;.]/)) {
    if (NEG.test(clause)) continue;
    if (/(^|[^a-z])(year[- ]round|all year)/i.test(clause) && !/\b(nearly|almost|near)\s+year/i.test(clause)) { for (let i = 0; i < 12; i++) months.add(i); continue; }
    let rest = clause;
    for (const m of clause.matchAll(RANGE)) {
      if (/^may$/.test(m[2]) || /^may$/.test(m[4])) continue;
      const a = monthRank(m[2]), b = monthRank(m[4]);
      if (a > 11 || b > 11) continue;
      for (let i = a, g = 0; g < 12; g++, i = (i + 1) % 12) { months.add(i); if (i === b) break; }
      ends.add(a); ends.add(b);
      if (m[1]) partial.add(a); if (m[3]) partial.add(b);
      rest = rest.replace(m[0], " ");
    }
    /* A range with a SEASON at one end: "Late autumn through May" (Colfax's Polish Route, an ice
       line: header Nov-May, calendar best in April) read as May alone and was reported as sharing
       no optimal month with its own calendar. The season end is pinned to one month by its
       qualifier (early = the season's first month, late = its last, none = its first as a start
       and its last as an end). Coarse, so the result counts as WORDS: used only for no-overlap. */
    for (const m of rest.matchAll(SRANGE)) {
      const end = (q, w, isEnd) => { const s = SEASONS[String(w).toLowerCase()]; if (s) { words = true; return /late/i.test(q || "") ? s[2] : /mid/i.test(q || "") ? s[1] : /early/i.test(q || "") ? s[0] : isEnd ? s[2] : s[0]; } return /^may$/.test(w) ? 99 : monthRank(w); };
      const a = end(m[1], m[2], false), b = end(m[3], m[4], true);
      if (a > 11 || b > 11 || !(SEASONS[m[2].toLowerCase()] || SEASONS[m[4].toLowerCase()])) continue;
      for (let i = a, g = 0; g < 12; g++, i = (i + 1) % 12) { months.add(i); if (i === b) break; }
      ends.add(a); ends.add(b);
      rest = rest.replace(m[0], " ");
    }
    for (const m of rest.matchAll(ONE)) {
      if (/^may$/.test(m[2])) continue;
      const i = monthRank(m[2]); if (i > 11) continue;
      months.add(i); ends.add(i); if (m[1]) partial.add(i);
    }
    if (!months.size) for (const [w, ms] of Object.entries(SEASONS)) if (new RegExp("\\b" + w + "\\b", "i").test(clause)) { ms.forEach((i) => months.add(i)); words = true; }
  }
  return months.size ? { months: [...months].sort((x, y) => x - y), partial: [...partial], ends: [...ends], words } : null;
}

const VOICE = /\b(per (?:prior |our )?research|data points?|according to|first ascent|FA:|known ascents?|guidebooks? (?:say|says|give|gives)|mountain project|summitpost|peakbagger|cascadeclimbers|sources? (?:say|says|give|gives|agree|disagree))\b/i;
export const voiceOf = (t) => { const m = String(t || "").match(VOICE); return m ? m[0] : null; };

function selftest() {
  const lbl = (r) => r ? r.months.map((i) => MONTH_ABBR[i]).join(" ") : "null";
  const cases = [
    ["August and September, once the basin is dry", "Aug Sep"],
    ["Late May (ski) through August", "May Jun Jul Aug"],
    ["June–September; described as 'nearly year-round' once SR-20 is open", "Jun Jul Aug Sep"],
    ["Late July through early September, before fall cold sets in", "Jul Aug Sep"],
    ["good in cold weather; avoid May-Sep", "null"],
    ["Year-round", "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec"],
    ["Mid to late summer", "Jun Jul Aug"],
    ["Late autumn through May in sustained cold, once the crux dagger has formed", "Jan Feb Mar Apr May Nov Dec"],
    ["Winter to early spring in a stable spell", "Jan Feb Mar Dec"],
    ["Late August into September", "Aug Sep"],
    ["Jul-Oct; core dry-talus conditions are most reliable August-September", "Jul Aug Sep Oct"],
    ["you may go in July", "Jul"],
  ];
  let bad = 0;
  for (const [t, want] of cases) { const got = lbl(monthsOf(t)); if (got !== want) { bad++; console.log(`  FAIL  monthsOf(${JSON.stringify(t)}) = ${got}, want ${want}`); } else console.log(`  ok    ${t.slice(0, 50)} -> ${got}`); }
  for (const [t, want] of [["Mid-July through October, per prior research on this route", true], ["after the Source Lake basin sheds its snow", false], ["only two dated route-specific data points exist", true]]) {
    if (!!voiceOf(t) !== want) { bad++; console.log(`  FAIL  voiceOf(${JSON.stringify(t)})`); } else console.log(`  ok    voice ${want ? "caught" : "clear"}: ${t.slice(0, 50)}`);
  }
  process.exit(bad ? 1 : 0);
}
if (argv.includes("--selftest")) selftest();

const { selectAll } = await import("./lib/supabase-env.mjs");
const EMBED = "areas(season_months,parent:parent_id(season_months,parent:parent_id(season_months,parent:parent_id(season_months,parent:parent_id(season_months)))))";
const rows = await selectAll("routes", "id,name,discipline,season,seasonal_guidance," + EMBED, "seasonal_guidance=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("audit:optimal-season: EMPTY READ — refusing to report zero findings."); process.exit(2); }

const ancestor = (a) => { let p = a && a.parent; while (p) { if (Array.isArray(p.season_months) && p.season_months.length) return p.season_months; p = p.parent; } return null; };
const lbl = (ms) => ms.map((i) => MONTH_ABBR[i]).join(" ");
const F = { headerVsWindow: [], headerVsCalendar: [], windowVsCalendar: [], windowVoice: [] };
const shoulder = { header: 0, window: 0 }, shoulders = [];
const N = { rows: rows.length, window: 0, windowMonths: 0, calendar: 0, header: 0, headerFromWindow: 0, headerFromArea: 0 };
const headers = [];

for (const r of rows) {
  const sg = r.seasonal_guidance || {};
  const win = typeof sg.optimalWindow === "string" ? sg.optimalWindow.trim() : "";
  const a = r.areas;
  const route = { season: r.season, discipline: r.discipline, seasonalGuidance: sg, _dbArea: a ? { seasonMonths: a.season_months, ancestorSeasonMonths: ancestor(a) } : null };
  const header = routeSeasonShort(route);
  const from = r.season && r.season.trim() ? "route.season" : header && routeSeasonShort({ ...route, _dbArea: null }) ? "window" : header ? "area" : "";
  if (header) { N.header++; if (from === "window") { N.headerFromWindow++; headers.push({ id: r.id, header, window: win }); } if (from === "area") N.headerFromArea++; }
  const base = { id: r.id, name: r.name, discipline: r.discipline };
  if (win) { N.window++; const v = voiceOf(win); if (v) F.windowVoice.push({ ...base, says: v, window: win }); }
  const wm = monthsOf(win); if (wm) N.windowMonths++;
  const hm = from === "window" ? null : monthsOf(header); // a header read off the window cannot disagree with it
  const cal = {};
  for (const [k, v] of Object.entries(sg.monthBreakdown && typeof sg.monthBreakdown === "object" ? sg.monthBreakdown : {})) { const i = monthRank(k); if (i < 12 && v) cal[i] = String(v.status || "").toLowerCase(); }
  const optimal = Object.keys(cal).filter((i) => cal[i] === "optimal").map(Number);
  if (optimal.length || Object.keys(cal).length) N.calendar++;
  const calTxt = MONTH_ABBR.map((m, i) => cal[i] ? `${m}:${cal[i]}` : null).filter(Boolean).join(" ");

  if (wm && hm && !wm.months.some((i) => hm.months.includes(i)))
    F.headerVsWindow.push({ ...base, header, headerFrom: from, window: win });
  // A risky month at an unqualified END of a range is a shoulder; inside it, or with no optimal
  // month shared at all, it is a contradiction.
  const judge = (m, key, list, extra) => {
    if (!m || m.words || !Object.keys(cal).length) return;
    const risky = m.months.filter((i) => cal[i] === "risky");
    const inner = risky.filter((i) => !m.ends.includes(i));
    const endRisky = risky.filter((i) => m.ends.includes(i) && !m.partial.includes(i));
    const noOpt = optimal.length > 0 && !optimal.some((i) => m.months.includes(i));
    if (inner.length || noOpt) list.push({ ...base, ...extra, months: lbl(m.months), calendar: calTxt, riskyInside: lbl(inner), noOptimalShared: noOpt });
    else if (endRisky.length) { shoulder[key]++; shoulders.push({ ...base, on: key, ...extra, riskyEnd: lbl(endRisky), calendar: calTxt }); }
  };
  judge(hm, "header", F.headerVsCalendar, { header, headerFrom: from });
  judge(wm, "window", F.windowVsCalendar, { window: win });
}

console.log(`audit:optimal-season — ${N.rows} routes with SEASONAL GUIDANCE; ${N.window} have a window (${N.windowMonths} name months), ${N.calendar} a calendar.`);
console.log(`  header: ${N.header} show one (${N.headerFromWindow} read off the route's own window, ${N.headerFromArea} off its area).`);
const show = (k, title, fmt) => { console.log(`\n${title}: ${F[k].length}`); for (const f of F[k]) console.log("  " + fmt(f)); };
show("headerVsWindow", "HEADER vs OPTIMAL WINDOW — no month in common", (f) => `${f.id} [${f.discipline}] header "${f.header}" (${f.headerFrom}) · window "${f.window.slice(0, 100)}"`);
show("headerVsCalendar", "HEADER vs CALENDAR — shares no optimal month, or a risky month inside it", (f) => `${f.id} [${f.discipline}] header "${f.header}" (${f.headerFrom}) · ${f.calendar}`);
show("windowVsCalendar", "OPTIMAL WINDOW vs its own CALENDAR", (f) => `${f.id} window "${f.window.slice(0, 80)}" · ${f.calendar}`);
show("windowVoice", "OPTIMAL WINDOW written as research notes", (f) => `${f.id} "${f.says}" · "${f.window.slice(0, 110)}"`);
console.log(`\nshoulders (a risky month at the unqualified end of a range; listed with --shoulders): header ${shoulder.header}, window ${shoulder.window}`);
if (argv.includes("--shoulders")) { console.log("\nSHOULDERS:"); for (const f of shoulders) console.log(`  ${f.id} [${f.discipline}] ${f.on} "${f.on === "header" ? f.header : f.window.slice(0, 60)}" ends on risky ${f.riskyEnd} · ${f.calendar}`); }
if (argv.includes("--headers")) { console.log("\nHEADERS READ OFF THE ROUTE'S OWN WINDOW:"); for (const h of headers) console.log(`  ${h.id}: "${h.header}"  <=  "${h.window.slice(0, 90)}"`); }
const j = argv.indexOf("--json"); if (j >= 0) fs.writeFileSync(argv[j + 1], JSON.stringify({ N, shoulder, F, headers, shoulders }, null, 1));

// probe:compat-variations (hand-run, no DB). Owner note 2026-11-26: "I have set my availability but it still says
// 'Availability: not set by both of you'. I have listed areas as well." Builds 14 profile variations (empty,
// chips only, week grid only, flexible, weekend mornings vs evenings, areas only, nested areas, mountain objectives,
// every grade kind, pace, verified, reliability) and scores every ordered pair through the SAME
// compatParts/compatWhy/compat/compatUnknown the profile sheet and partner rows use, asserting:
//  1. a line marked unknown names WHO left it blank (you / they / neither) -- never "not set by both of you"
//  2. a side that DID set a value is never reported as the one who left it blank
//  3. the % is one number for the pair (symmetric) and inside 20..99
//  4. every unknown term scores exactly half its maximum
//  5. the "limited info" count equals the number of unknown lines among disc / where / pace / avail
//  6. availability is compared in the profile's own four blocks: weekend mornings vs weekend evenings do NOT overlap
//
//   node scripts/oneoff/probe-compat-variations.mjs [--lines]
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module"; import { build } from "esbuild";
const ROOT = process.cwd(), req = createRequire(import.meta.url);
const outdir = fs.mkdtempSync(path.join(ROOT, ".cm-variations-")); process.on("exit", () => fs.rmSync(outdir, { recursive: true, force: true }));
await build({ stdin: { contents: `export { compat, compatParts, compatWhy, compatUnknown, compatSummary, __set_MY_PACE } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};`, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" }, outfile: path.join(outdir, "b.cjs"), logLevel: "error" });
const M = req(path.join(outdir, "b.cjs"));
const IDX = "usa.washington.wa_centralwest.wa_stevens_pass_region.wa_index", SQ = "usa.washington.wa_cascades.wa_leavenworth";
const WKND_AM = ["sat_am", "sun_am"], WKND_PM = ["sat_pm", "sun_pm"];
const V = {
  empty:       {},
  ownerLike:   { disciplines: ["trad", "bouldering"], tradGrade: "5.9", boulderGrade: "V3", availWeek: [...WKND_AM, ...WKND_PM], availability: ["weekends"], partnerAreaPaths: [IDX], hikingSpeedFtHr: 1500, verified: true },
  wkndAmGrid:  { disciplines: ["trad"], tradGrade: "5.8", availWeek: WKND_AM, availability: ["weekends"], partnerAreaPaths: [IDX + ".wa_lower_town_wall"], hikingSpeedFtHr: 1400 },
  wkndPmGrid:  { disciplines: ["trad"], tradGrade: "5.8", availWeek: WKND_PM, availability: ["weekends"], partnerAreaPaths: [IDX], hikingSpeedFtHr: 1450 },
  noAvail:     { disciplines: ["trad"], tradGrade: "5.8", partnerAreaPaths: [IDX], hikingSpeedFtHr: 1600, verified: true },
  flexible:    { disciplines: ["sport"], sportGrade: "5.11a", availability: ["flexible"], partnerAreaPaths: [SQ] },
  weekdays:    { disciplines: ["sport", "trad"], sportGrade: "5.10b", tradGrade: "5.9", availability: ["weekday_am", "weekday_pm"], partnerAreaPaths: [SQ], hikingSpeedFtHr: 2000 },
  mountaineer: { disciplines: ["mountaineering", "alpine"], climbGrades: { alpine: { grade: "5.6" } }, availability: ["weekends"], objectiveIds: ["dc", "nr"], hikingSpeedFtHr: 1200 },
  mtnShareOne: { disciplines: ["alpine"], climbGrades: { alpine: { grade: "5.7" } }, availability: ["weekends"], objectiveIds: ["dc"], hikingSpeedFtHr: 1300, verified: true },
  iceOnly:     { disciplines: ["ice"], climbGrades: { ice: { grade: "WI4" } }, availability: ["weekday_pm"] },
  boulderer:   { disciplines: ["bouldering"], boulderGrade: "V6", availability: ["weekday_pm"], partnerAreaPaths: [IDX + ".wa_bouldering_at_index"], verified: true },
  hard:        { disciplines: ["sport", "trad"], sportGrade: "5.13a", tradGrade: "5.12a", availability: ["weekends", "weekday_pm"], partnerAreaPaths: [IDX], hikingSpeedFtHr: 2600, reliability: { trips: 5, showed: 5 } },
  areasOnly:   { partnerAreaPaths: [IDX] },
  availOnly:   { availability: ["weekends"] },
};
const names = Object.keys(V); const issues = {}; const note = (k, s) => (issues[k] = issues[k] || []).push(s); const S = {};
const BLANK_WORDS = /not set by both|not listed by both|not on both profiles|have not both|not .{0,20}by both of you/i;
const filled = (c, k) => k === "avail" ? !!((c.availability || []).length || (c.availWeek || []).length) : k === "pace" ? !!c.hikingSpeedFtHr : k === "disc" ? !!(c.disciplines || []).length : k === "where" ? !!((c.objectiveIds || []).length || (c.partnerAreaPaths || []).length) : null;
const score = (a, b) => { M.__set_MY_PACE(a.hikingSpeedFtHr || null); return { parts: M.compatParts(a, b), why: M.compatWhy(a, b), s: M.compat(a, b), unk: M.compatUnknown(a, b) }; };
for (const a of names) for (const b of names) { if (a === b) continue;
  const me = { id: 0, ...V[a] }, them = { id: "t-" + b, ...V[b] };
  const { parts, why, s, unk } = score(me, them); const s2 = score({ ...V[b], id: 0 }, { ...V[a], id: "t-" + a }).s;
  S[a + ">" + b] = unk < 3 ? s : null;
  if (s < 20 || s > 99) note("% outside 20..99", `${a}>${b}: ${s}`);
  if (s !== s2) note("% not one number for the pair", `${a}>${b}: ${s} vs ${s2}`);
  for (const x of parts) if (!x.known && ["disc", "pace", "avail", "where", "grade"].includes(x.k) && x.pts !== x.max / 2) note("unknown term not scored half", `${a}>${b} ${x.k}: ${x.pts}/${x.max}`);
  const unkLines = parts.filter(x => ["disc", "pace", "avail", "where"].includes(x.k) && !x.known).length;
  if (unkLines !== unk) note("limited-info count != unknown lines", `${a}>${b}: ${unk} vs ${unkLines}`);
  for (const w of why) {
    if (w.tone === "unk" && BLANK_WORDS.test(w.text)) note("unknown line does not say WHO left it blank", `${a}>${b}: "${w.text}"`);
    const fa = filled(me, w.k), fb = filled(them, w.k);
    if (w.tone !== "unk" || fa == null) continue;
    if (fa && /\b(you have not|you haven.t|neither of you)\b/i.test(w.text)) note("line says YOU left it blank, but you set it", `${a}>${b}: "${w.text}"`);
    if (fb && /\b(they have not|they haven.t|neither of you)\b/i.test(w.text)) note("line says THEY left it blank, but they set it", `${a}>${b}: "${w.text}"`);
    if (!fa && !fb && !/neither of you/i.test(w.text)) note("both blank but line does not say neither", `${a}>${b}: "${w.text}"`);
  }
}
// 6. weekend mornings vs weekend evenings: the profile shows two different blocks, so they share no time.
{ const av = score({ id: 0, ...V.wkndAmGrid }, { id: "t", ...V.wkndPmGrid }).parts.find(x => x.k === "avail");
  if (av.pts !== 0 || av.shared.length) note("weekend mornings vs weekend evenings scored as overlapping", `pts ${av.pts}/${av.max}, shared ${JSON.stringify(av.shared)}`); }
const pr = (a, b) => { const { why, s, unk } = score({ id: 0, ...V[a] }, { id: "t-" + b, ...V[b] }); console.log(`\n${a} -> ${b}: ${s}%  (unknown ${unk})`); why.forEach(w => console.log(`  [${w.tone}] ${w.text}`)); const sm = M.compatSummary({ id: 0, ...V[a] }, { id: "t-" + b, ...V[b] }, {}); if (sm) console.log("  summary: " + sm); };
if (process.argv.includes("--lines")) for (const b of names) if (b !== "ownerLike") pr("ownerLike", b);
M.__set_MY_PACE(null);
console.log("\n% as the profile shows it (viewer down, target across; '-' = held back for limited info)\n" + "".padEnd(13) + names.map(l => l.slice(0, 6).padStart(7)).join(""));
for (const a of names) console.log(a.padEnd(13) + names.map(b => a === b ? "      ." : String(S[a + ">" + b] ?? "-").padStart(7)).join(""));
const k = Object.keys(issues); console.log(k.length ? "\nISSUES" : "\nISSUES: none");
for (const x of k) { console.log(`## ${x} (${issues[x].length})`); issues[x].slice(0, 6).forEach(s => console.log("  " + s)); }
process.exit(k.length ? 1 : 0);

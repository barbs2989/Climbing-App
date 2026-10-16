// IS THE CAMP PROSE ITSELF GOOD? — the dimension the camp sweep had not covered.
//
// The camp work so far has asked: is the elevation right, is the camp on the right route, does the
// section reach a screen, does a chip hold a paragraph. It never asked what the camp TEXT says.
// `bivy[].notes` / `.water` / `.permit` / `.capacity` render on the Planner tab, and
// measure-pipeline-voice-in-route-prose's column list does NOT include `bivy` — so every needle
// this repo has pointed at prose has been pointed somewhere else.
//
// Three questions, in the order they matter:
//   1. a CITATION — the standing rule is no sources anywhere in the app;
//   2. PIPELINE VOICE — a sentence about our own record rather than about the place;
//   3. a DATED CLAIM that will age into a lie, the audit:expiring-closures class, in a field with
//      no expiry and nothing that re-reads it.
//
// REPORT-ONLY. The repair for each is different and is a judgement per value: a citation is
// rewritten to keep the fact, pipeline voice is usually cut whole, and a dated claim needs the date
// kept and the claim re-checked. Sweeping them together is how a hedge gets deleted.
import { selectAll } from "../lib/supabase-env.mjs";

const NEEDLES = [
  [/\b(mountain project|summitpost|wikipedia|peakbagger|alltrails|wta|gaia|caltopo|beckey)\b/i,
    "names a publisher"],
  // A CATEGORY is not a publisher — "per trip reports" names nobody, and this repo already records
  // that treating it as a citation reported its own convention as a defect.
  [/\b(?:per|according to|via) (?:the )?(?:guidebook|guide)\b/i, "attributes to a guidebook"],
  [/\b(?:this|our) (?:record|dataset|catalog|database)\b/i, "names our own record"],
  [/\bno (?:source|record|reference)s? (?:found|located|available|documents?)\b/i, "sourcing verdict"],
  [/\bshould not be (?:presented|treated) as (?:a )?(?:fact|verified|confirmed)\b/i,
    "instruction about the record"],
  // A DATED CLAIM IS THE ACCEPTABLE FORM, NOT A DEFECT — audit:expiring-closures' standing
  // instruction is "date it or drop the claim". The tiers that are actually bad are the ones this
  // does NOT match: "as of this research date" (dates the researcher, not the world) and
  // "indefinitely" / "no reopening estimate" (open-ended, nothing to judge it by). Counted so the
  // camp store's exposure is known, and reported as CONTEXT rather than as work.
  [/\b(?:as of|current as of|verified) (?:early |mid-|late )?(?:20\d\d|january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    "dated claim (the ACCEPTABLE form — context, not a defect)"],
  // These two ARE the defect tiers — but only when the value does NOT bound itself. Adding them
  // reported 14 "open-ended" claims that all read "...through the END OF 2027, with no reopening
  // estimate...": the sentence names its own end date, and the needle fired on the fragment
  // without it. audit:expiring-closures carries a SELF_LIMITING exclusion for exactly this, and
  // omitting it here manufactured 14 findings on correct prose. See SELF_LIMITING below.
  [/\bas of (?:this|the) (?:research|writing|enrichment)\b/i, "dates the RESEARCH ACT, not the world"],
  [/\bclosed indefinitely|no (?:reopening|reopen) (?:estimate|date)\b/i, "open-ended, nothing to judge it by"],
];

const rows = await selectAll("routes", "id,bivy", "bivy=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes with a bivy list"); process.exit(1); }

const leaves = (v, path, out) => {
  if (typeof v === "string") { if (v.trim()) out.push([path, v]); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => leaves(x, `${path}[${i}]`, out)); return; }
  if (v && typeof v === "object") { for (const k of Object.keys(v)) leaves(v[k], `${path}.${k}`, out); }
};

// A value that names an explicit end date bounds itself, so a reader can judge it — the same
// exclusion audit:expiring-closures applies. Matched as a DATE RANGE as well as a "through/until"
// clause, because a closure order states its expiry both ways.
const SELF_LIMITING = /\b(?:through|until|expires?|effective)\b[^.]{0,60}\b(?:20\d\d)\b|\b(?:20\d\d)\s*[-–]\s*(?:20\d\d)\b/i;

let scanned = 0, sites = 0;
const hits = [];
for (const r of rows) {
  sites += (r.bivy || []).length;
  const out = [];
  leaves(r.bivy, "bivy", out);
  for (const [path, text] of out) {
    scanned++;
    const bounded = SELF_LIMITING.test(text);
    const fired = NEEDLES.map(([re, w]) => [re.exec(text), w])
      .filter(([m]) => m)
      // a self-bounded value is not an open-ended claim, whatever fragment matched inside it
      .filter(([, w]) => !(bounded && w.startsWith("open-ended")));
    if (fired.length) hits.push({
      id: r.id, path,
      why: [...new Set(fired.map(([, w]) => w))],
      // Print the MATCH, not just the verdict: a needle that cannot show what fired is a needle
      // nobody can audit, and one of mine already manufactured 27 findings on correct prose.
      matched: fired.map(([m]) => text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 50)
        .replace(/\s+/g, " ")),
    });
  }
}
if (!scanned) { console.log("FAIL CLOSED: zero bivy prose leaves parsed"); process.exit(1); }

console.log(`${sites} camp site(s) across ${rows.length} routes; ${scanned} prose leaf/leaves scanned\n`);
console.log(`${hits.length} value(s) on ${new Set(hits.map((h) => h.id)).size} route(s) flagged\n`);

const by = new Map();
for (const h of hits) for (const w of h.why) by.set(w, (by.get(w) || 0) + 1);
for (const [w, n] of [...by].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${w}`);

const N = process.argv.includes("--full") ? hits.length : 15;
if (hits.length) console.log(`\nfirst ${Math.min(N, hits.length)} (--full for all):\n`);
for (const h of hits.slice(0, N)) {
  console.log(`  ${h.id}  ${h.path}   [${h.why.join(", ")}]`);
  for (const m of h.matched) console.log(`     ...${m}...`);
}

// Separate the two, because they read as one number and are not one thing.
const REAL = hits.filter((h) => h.why.some((w) => !w.startsWith("dated claim")));
const CONTEXT = hits.length - REAL.length;
console.log(`\n${REAL.length} value(s) worth acting on; ${CONTEXT} properly-dated claim(s) as context.`);
console.log(REAL.length
  ? "REPORT-ONLY. Each class wants a different repair — read the value before touching it."
  : "ok — no camp prose names a publisher, talks about our own record, or carries an UNDATED claim.");

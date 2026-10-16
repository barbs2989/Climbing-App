// Does rendered prose credit a PERSON as its source? The citation audit lists PUBLISHERS.
//
// Found as a residual of #1451, in a rendered rack bullet:
//
//   Other — 8 long slings + 1 triple-length sling; an alternate account from the free ascent
//   (Herrington) lists doubles TCU/C3 #00-3, ...
//
// audit:prose-citations' NAMED pattern is WTA / SummitPost / Mountain Project / guidebook and so
// on — organisations. A surname in brackets matches none of them. This sizes that gap; it does
// NOT change the audit, because #1484 is open on those needles and two sessions editing one
// regex is how a merge silently drops half of it.
//
// REPORT-ONLY, and the precision problem is the whole difficulty: this catalog is FULL of proper
// nouns that are places, and a first ascensionist's name in `fa` is a FACT about the climb rather
// than a citation. "Beckey Route" is a route name; "per Beckey's guidebook" is a citation.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dead = (w) => { console.error(`\nmeasurement FAILED — ${w}. Nothing below was measured.\n`); process.exit(1); };

// Lift the audit's own publisher list so anything it ALREADY reports is excluded — the question
// here is strictly what it CANNOT see.
const audit = fs.readFileSync(path.join(ROOT, "scripts/audit-prose-citations.mjs"), "utf8");
const liftRe = (n) => {
  const m = new RegExp("^const " + n + "\\s*=\\s*(/.*/[gimsuy]*);$", "m").exec(audit);
  if (!m) dead(`ANCHOR LOST: const ${n}`);
  return new Function("return " + m[1])();
};
const NAMED = liftRe("NAMED"), ACT = liftRe("ACT");
if (!NAMED.test("per Mountain Project")) dead("the lifted NAMED pattern is wrong");

// An ATTRIBUTION FRAME plus a capitalised surname. The frame is what separates a citation from a
// place name: "(Herrington)" after "an alternate account from the free ascent" is a credit;
// "Herrington Peak" would not be, and neither is a bare capitalised word anywhere in a sentence.
const FRAMES = [
  ["parenthetical credit after an account/report", /\b(?:account|report|description|beta|topo|trip report)[^.()]{0,60}\(([A-Z][a-z]{3,})\)/g],
  ["per <Surname>", /\bper ([A-Z][a-z]{3,})(?:'s)?\b/g],
  ["according to <Surname>", /\baccording to ([A-Z][a-z]{3,})(?:'s)?\b/g],
  ["<Surname> reports/describes/notes", /\b([A-Z][a-z]{3,})(?:'s)? (?:reports?|describes?|notes?|writes?|lists?) \b/g],
];

// Words that pass the shape test and are never a cited person here.
/* A CAPITALISED WORD IS NOT A SURNAME, and the first run proved how badly: of 29 hits, 22 were
   common nouns or place names that happen to start a clause — "Trip Reports describe", "Climbers
   report", "Several parties note", "per Wilderness rules", and the peak CINDERELLA matched by its
   own name. This is the deny-list shape CLAUDE.md records: one more capitalised noun defeats it,
   and every entry below was added because it actually fired. The residual precision is stated in
   the output rather than tuned away. */
const NOT_A_PERSON = /^(The|This|That|These|Those|There|Class|Grade|Route|Peak|Ridge|Face|Glacier|North|South|East|West|Mount|Lake|Creek|Pass|Trail|Camp|Some|Most|Many|Both|Each|Every|Trip|Late|Early|Snow|Rock|Ice|Also|From|With|When|While|After|Before|Bring|Note|Expect|Descend|Climb|Approach|Summit|Green|Forest|Park|Ranger|Sources?|Guidebooks?|Parties|Party|Reports?|Climbers?|Several|Multiple|Independent|Text|Buttress|Chimney|Couloir|Wilderness|Cinderella|Bulger|Descriptions?|Accounts?|Published|Recent|Other|Both)$/;

/* CLUBS ARE ORGANISATIONS, NOT PEOPLE, and they are counted separately rather than dropped: this
   catalog cites the Mountaineers and the Mazamas as the bodies whose GUIDANCE a party follows,
   which is the live-reference class the owner decided to KEEP. They are not part of the
   individuals gap, and lumping them in would have inflated it. */
const CLUB = /^(Mountaineers|Mazamas|Alpine|Sierra)$/;

const COLS = ["sling_rack", "detailed_rack", "pro_needs", "rope_note", "gear", "what_to_bring",
  "beta", "overview", "watch_out", "climbing_route", "descent_text", "rappel_count_note",
  "rappel_detail", "approach", "hazards", "pro_tips"];

const leaves = (v, out = []) => {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => leaves(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => leaves(x, out));
  return out;
};

let cols = 0, total = 0, alreadySeen = 0, noise = 0, clubs = 0;
const byName = {};
const hits = [];
for (const col of COLS) {
  const rows = await selectAll("routes", `id,${col}`, `${col}=not.is.null`, { pageSize: 1000 }).catch(() => null);
  if (!rows) { console.log(`  (${col} unreadable — skipped, NOT counted clean)`); continue; }
  cols++;
  for (const r of rows) {
    for (const s of leaves(r[col])) {
      for (const [label, re] of FRAMES) {
        re.lastIndex = 0;   // these carry /g, so .exec state persists between strings
        let m;
        while ((m = re.exec(s))) {
          const who = m[1];
          if (NOT_A_PERSON.test(who)) { noise++; continue; }
          if (CLUB.test(who)) { clubs++; continue; }
          // If the audit already reports this value, it is not part of the gap.
          if (NAMED.test(s) || ACT.test(s)) { alreadySeen++; continue; }
          total++;
          byName[who] = (byName[who] || 0) + 1;
          if (hits.length < 12) hits.push({ id: r.id, col, who, label, s: s.length > 200 ? s.slice(0, 200) + "…" : s });
        }
      }
    }
  }
}
if (cols !== COLS.length) console.log(`\nread ${cols} of ${COLS.length} columns.`);
if (!cols) dead("no column was readable — an empty run, not a clean result");

console.log(`\nvalues crediting a PERSON that the audit does not already report: ${total}`);
console.log(`(a further ${alreadySeen} are ALREADY reported for a publisher; ${clubs} credit a CLUB, which is the`);
console.log(` live-reference class the owner kept; ${noise} were capitalised common nouns the frames matched)\n`);
if (total) {
  console.log("names, by frequency:");
  for (const [n, c] of Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(c).padStart(4)}  ${n}`);
  console.log("\nsamples:");
  for (const h of hits) console.log(`  [${h.label}] ${h.id} ${h.col} — ${h.who}\n    ${h.s}\n`);
}
console.log(`A first ascensionist's NAME is a fact about the climb; "per <name>'s guidebook" is a`);
console.log(`citation. Only the FRAME separates them, which is why this is report-only and why the`);
console.log(`audit's own needles are lifted rather than re-implemented.`);

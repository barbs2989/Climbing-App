// Validate enrichment-wip/camping-zones/*.json BEFORE building a batch from them.
//
// These files are written by research agents, and the product rules they have to obey are not
// things a reviewer reliably catches by reading nine files: NO SOURCE may be named anywhere in
// the app, `elev` is FEET and never metres, and an area may be claimed by only one zone. Each
// of those has been got wrong at least once.
//
// Static — no DB, no network. Run it before make-camping-batch-from-zones.mjs.
import fs from "fs";
import path from "path";

const DIR = "enrichment-wip/camping-zones";
const files = fs.readdirSync(DIR).filter(f => f.endsWith(".json")).sort();
if (files.length < 10) { console.log(`FAIL: only ${files.length} zone files — the walk broke`); process.exit(1); }

// A source named anywhere in this data reaches the route page. The rule is absolute, so the
// vocabulary is deliberately broad and a false positive is cheap to reword.
const SOURCE = /\bhttps?:\/\/|\bwww\.|\baccording to\b|\bsummitpost\b|\bmountain project\b|\bmountainproject\b|\bpeakbagger\b|\bwta\b|\bwashington trails\b|\bper the (guidebook|website|site)\b|\bsource[sd]?:/i;
// Emoji-presentation codepoints only — an arrow or a degree sign is ordinary punctuation.
const EMOJI = /\p{Emoji_Presentation}/u;
const TYPES = new Set(["camp", "bivy", "hut"]);

const claimed = new Map();
let problems = 0, sites = 0, zones = 0;
const say = (f, m) => { console.log(`  ${f}: ${m}`); problems++; };

for (const f of files) {
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")); }
  catch (e) { say(f, `UNPARSEABLE — ${e.message}`); continue; }
  zones++;

  if (!j.zone || typeof j.zone !== "string") say(f, "no `zone` name");
  if (!Array.isArray(j.areas) || !j.areas.length) say(f, "no `areas` declared");
  if (!Array.isArray(j.sites) || !j.sites.length) say(f, "no `sites`");

  for (const a of j.areas || []) {
    if (!/^[a-z0-9_]+$/.test(a)) say(f, `area id looks wrong: ${JSON.stringify(a)}`);
    if (claimed.has(a)) say(f, `area ${a} ALSO claimed by ${claimed.get(a)} — fix at source, never let the builder pick`);
    else claimed.set(a, f);
  }

  for (const s of j.sites || []) {
    sites++;
    const where = `${f} / ${s && s.name ? s.name : "(unnamed site)"}`;
    if (!s || typeof s !== "object") { say(where, "not an object"); continue; }
    if (!s.name) say(where, "no name");
    if (!TYPES.has(s.type)) say(where, `type ${JSON.stringify(s.type)} is not camp/bivy/hut`);
    for (const k of ["capacity", "water", "permit", "notes"])
      if (!s[k] || !String(s[k]).trim()) say(where, `empty ${k}`);
    if (s.notes && String(s.notes).length < 120) say(where, "notes too thin to help anyone decide");

    // elev is FEET. The column already holds two conventions and a metric number written here
    // would add a third reading to a field the app treats as feet.
    if ("elev" in s) {
      if (!Number.isInteger(s.elev)) say(where, `elev ${JSON.stringify(s.elev)} is not an integer`);
      else if (s.elev < 100 || s.elev > 15000) say(where, `elev ${s.elev} is outside any plausible WA range — metres?`);
    }
    if ("elevM" in s) say(where, "elevM must never be written by research — convert to feet");

    for (const [k, v] of Object.entries(s)) {
      if (typeof v !== "string") continue;
      if (SOURCE.test(v)) say(where, `names a SOURCE in \`${k}\`: ${v.match(SOURCE)[0]}`);
      if (EMOJI.test(v)) say(where, `emoji in \`${k}\``);
    }
  }
  const noteTxt = [j.zone, j._areas_note].filter(Boolean).join(" ");
  if (SOURCE.test(noteTxt)) say(f, `names a SOURCE in zone/_areas_note: ${noteTxt.match(SOURCE)[0]}`);
}

console.log(`\n${zones} zones, ${sites} sites, ${claimed.size} distinct areas claimed`);
if (problems) { console.log(`${problems} problem(s)`); process.exit(1); }
console.log("ok — every zone file is shaped right, names no source, and claims its areas alone");

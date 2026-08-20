// Four notes tell a climber what was done to the database.
//
// "The five stations previously listed were one party's descent on two 25 m ropes",
// "so it has been removed as unsupported", "the 7 stations previously listed were not sourced",
// "The previously claimed 55m length ... could not be independently corroborated and have been
// removed". All four render: three in `rappel_count_note` (the note above the rappel table) and
// one in a `rappel_detail` station note under its own number.
//
// THREE OF THESE ARE IN COLUMNS #1188 DECLARED CLEAN, and that is the point worth keeping. That
// sweep measured seven columns with six needles and reported "0 of 7". It was honest about its
// denominator and still missed this, because none of its needles covered changelog voice of the
// "previously listed" shape. An audit reporting zero is a statement about its needles as much as
// about the data -- the rule this repo already records, arriving one PR later on my own work.
//
// EVERY REWRITE KEEPS THE CLIMBER FACT. These notes are not noise: that a five-station list came
// from one party on short ropes really does explain why it disagrees with everything else; that
// no verifiable coordinate exists for a station really does mean find it on the ground. Only the
// "we removed it" framing goes. Where the retracted item was a SAFETY claim -- Torment-Forbidden's
// waterfall-slab fatality caution -- it was checked to survive elsewhere first: that route's own
// `hazards` array still carries it, correctly scoped to the walk-out rather than the rappel.
//
// Each row is asserted against a distinctive fragment of its current value, so a row that has
// moved since this was written is refused rather than overwritten.
import { loadEnv, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const env = loadEnv();
const U = env.VITE_SUPABASE_URL;
const K = APPLY ? requireServiceKey() : env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const EDITS = [
  {
    id: "wa_american_border_peak_southeast_face", col: "rappel_count_note",
    expect: "The five stations previously listed were one party's descent",
    to: "Accounts disagree on the count. A Mountaineers trip report has “the team rappelled three "
      + "times on the way down”; another party “rappelled twice from the top of the keyhole to reach "
      + "the bottom”. A third account describes five rappels, but that is one party’s descent on two "
      + "25 m ropes rather than a list of fixed stations — which is why its lengths (about 23 m / 75 ft) "
      + "look so precise and why its count disagrees with the others. That party’s final rappel off the "
      + "southeast rib jammed and they sacrificed a rope; the standard line threads the low keyhole "
      + "beneath the chockstone for a cleaner pull.",
  },
  {
    id: "wa_dragontail_peak_backbone_ridge", col: "rappel_count_note",
    expect: "so it has been removed as unsupported",
    to: "This 2-rappel line is an icy/late-season alternate to the standard walk-off descent via the "
      + "east ledges and summit gully, confirmed by independent trip reports. No verifiable coordinate "
      + "is published for the rappel station — the one that circulates sits almost exactly on the "
      + "peak’s own summit coordinates, which is not a real station fix — so none is given here. "
      + "Find the station on the ground rather than by GPS.",
  },
  {
    id: "wa_the_scoop_2", col: "rappel_count_note",
    expect: "the 7 stations previously listed were not sourced",
    to: "Two different descents are described for this route, and they are not the same line. The "
      + "standard walk-off IS available to parties who climbed The Scoop — Steph Abegg’s party did "
      + "exactly that: “Make a 30m rappel to east from slung horn, then scramble down scree or snow "
      + "rightward and back to the base of the climb.” The first-ascent report notes the route “can be "
      + "rappelled with two 60m ropes, to avoid the loose descent” and that they left “only natural "
      + "anchors for the descent”, but publishes no station count, so none is given here.",
  },
  {
    id: "wa_garfield_mountain_scramble", col: "gear",
    expect: "not optional as previously listed",
    to: null, sub: ["not optional as previously listed", "not optional"],
  },
  {
    id: "wa_forbidden_peak_east_ledges", col: "descent",
    expect: "see beta/descent_text",
    to: null, sub: ["This route is itself a descent line - see beta/descent_text.", "This route is itself a descent line."],
  },
  {
    id: "wa_baring_mountain_r1", col: "itinerary",
    expect: "(see descent_text)",
    to: null, sub: ["the non-technical south-side walk-off (see descent_text)", "the non-technical south-side walk-off"],
  },
  {
    // A station note inside a jsonb array, so this one is patched by index rather than wholesale.
    id: "wa_mount_torment_torment_forbidden_traverse", col: "rappel_detail", idx: 9, key: "notes",
    expect: "The previously claimed 55m length",
    to: "Final rappel onto the snowfield/glacier remnant below Forbidden’s South Face. No source found "
      + "documents its exact length. Treat the moat and the glacier edge below with general caution.",
  },
];

// These five columns hold FOUR different JS shapes between them: a plain string
// (`rappel_count_note`, `descent`), an array of strings (`gear`), an array of objects
// (`rappel_detail`), and an object (`itinerary`). A `sub` edit therefore walks STRING LEAVES
// rather than special-casing each shape -- a fourth special case was one shape short, which is
// what this repo records as `routes` columns holding two JS shapes at once.
function deepSub(v, from, to) {
  if (typeof v === "string") return v.split(from).join(to);
  if (Array.isArray(v)) return v.map((x) => deepSub(x, from, to));
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepSub(x, from, to)]));
  }
  return v;
}
function deepText(v, out = []) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => deepText(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => deepText(x, out));
  return out;
}

const cur = new Map();
const fails = [];
const skipped = [];
for (const e of EDITS) {
  const r = await fetch(`${U}/rest/v1/routes?id=eq.${e.id}&select=id,${e.col}`, { headers: H });
  if (!r.ok) { fails.push(`${e.id}: read ${r.status}`); continue; }
  const [row] = await r.json();
  if (!row) { fails.push(`${e.id}: no row`); continue; }
  const v = row[e.col];
  const val = e.idx != null ? (Array.isArray(v) && v[e.idx] ? v[e.idx][e.key] : undefined)
    : deepText(v).join("\u0000");
  // IDEMPOTENT: a row already carrying the repaired text is SKIPPED, not failed. Without this a
  // re-run of an applied script reports "REFUSING TO WRITE" and reads as a broken repair.
  if (typeof val === "string" && !val.includes(e.expect)) {
    const done = e.sub ? !val.includes(e.sub[0]) : val.includes(e.to.slice(0, 50));
    if (done) { skipped.push(`${e.id}.${e.col}`); continue; }
  }
  if (typeof val !== "string" || !val.includes(e.expect)) {
    fails.push(`${e.id}.${e.col}${e.idx == null ? "" : `[${e.idx}].${e.key}`}: no longer contains ${JSON.stringify(e.expect)} — re-read before writing`);
    continue;
  }
  cur.set(e.id, { row, val });
}
if (fails.length) {
  console.error("REFUSING TO WRITE — rows are not what this was written against:");
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}

for (const s2 of skipped) console.log(`  (already repaired, skipped) ${s2}`);
for (const e of EDITS) {
  if (!cur.has(e.id)) continue;
  const before = cur.get(e.id).val;
  const after = e.sub ? before.split(e.sub[0]).join(e.sub[1]) : e.to;
  console.log(`### ${e.id}.${e.col}${e.idx == null ? "" : `[${e.idx}].${e.key}`}`);
  console.log(`  - ${before.replace(/\u0000/g, " | ").replace(/\s+/g, " ")}`);
  console.log(`  + ${after.replace(/\u0000/g, " | ").replace(/\s+/g, " ")}\n`);
}
if (!APPLY) { console.log("DRY RUN — pass --apply to write."); process.exit(0); }

// Nothing may still be talking about the record rather than the mountain.
const STILL = /\bpreviously (?:listed|claimed|published|stored)\b|removed as unsupported|were not sourced|rename is pending/i;
let bad = 0;
for (const e of EDITS) {
  if (!cur.has(e.id)) continue;
  const raw = cur.get(e.id).row[e.col];
  const apply = (t) => (e.sub ? t.split(e.sub[0]).join(e.sub[1]) : e.to);
  let body;
  if (e.idx != null) {
    body = { [e.col]: raw.map((s, i) => (i === e.idx ? { ...s, [e.key]: apply(s[e.key]) } : s)) };
  } else if (e.sub) {
    body = { [e.col]: deepSub(raw, e.sub[0], e.sub[1]) };
  } else body = { [e.col]: e.to };
  await patchRow("routes", e.id, body);
  const [after] = await (await fetch(`${U}/rest/v1/routes?id=eq.${e.id}&select=${e.col}`, { headers: H })).json();
  const flat = typeof after[e.col] === "string" ? after[e.col] : JSON.stringify(after[e.col]);
  const ok = e.sub ? !flat.includes(e.sub[0]) : flat.includes(e.to.slice(0, 60));
  if (!ok || STILL.test(flat)) { console.log(`  MISMATCH ${e.id}.${e.col}`); bad++; }
  else console.log(`  ok ${e.id}.${e.col}`);
}
console.log(bad ? `\n${bad} did not take` : "\nall verified on re-read");
process.exit(bad ? 1 : 0);

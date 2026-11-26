#!/usr/bin/env node
/* ONE ROPE IS THE DEFAULT (owner, 2026-11-26): "fix the rappels so that the default is only using
   1 rope ... audit and review so that the info given is always and only using 1 rope."

   The RAPPELS section is built from three routes columns — `rappels`, `rappel_count_note` and the
   station table `rappel_detail` — and this asks, of every route that carries any of them:

     1. STATION   a station longer than one rope reaches (> 37 m, a single 70 m's reach). That table
                  is a two-rope sequence whatever its prose says (lib/rappels.js rappelRopeNeed).
     2. WORDING   a sentence in any of the three that describes rappelling on two ropes: "double-rope",
                  "two 60 m ropes", "2 x 60 m", "twin ropes", "a second rope", "halves the number".

   Neither is a guess: a finding is a string or a number stored on the row. A single rope "doubled
   through the anchor" is how every rappel works and is NOT a finding, nor is a pull that "jams
   ropes" (the plural of any party's ropes), nor a rope a party carries for the glacier.

   Read-only, service key (the catalog is public, but a count that decides "done" is read with the
   key that cannot be silently filtered). Exits 1 on any finding. --selftest needs no DB.
   --json prints the findings for a batch builder. */
import { selectAll, requireServiceKey } from "./lib/supabase-env.mjs";
import { rappelRopeNeed } from "../lib/rappels.js";

export const TWO_ROPE_TEXT = new RegExp([
  String.raw`\bdouble[- ]ropes?\b`,
  String.raw`\b(?:two|2|twin|pair of|both)\s+(?:(?:30|40|45|50|60|70|80)\s?-?\s?(?:m|meter|metre)s?\s+|(?:half|full[- ]length|joined|tied|shorter|longer)\s+)?ropes\b`,
  String.raw`\bdouble\s+(?:30|40|50|60|70|80)\s?-?\s?(?:m|meter|metre)s?\s+ropes\b`,
  String.raw`\b(?:join|link|tie)\s+two\b`,
  String.raw`\btwo\s+(?:50|60|70)s\b`,
  String.raw`\b2\s?[x×]\s?(?:30|50|60|70)\s?m?\b`,
  String.raw`\b(?:50|60|70)\s?m?\s?[x×]\s?2\b`,
  String.raw`\btwin ropes?\b`,
  String.raw`\bsecond rope\b`,
  String.raw`\btag line\b`,
  String.raw`\bdoubled ropes\b`,
  String.raw`\btwo-rope\b`,
  String.raw`\bhalves (?:it|the (?:number|count|rappels))\b`,
  String.raw`\bhalf (?:as many|the (?:number of )?rappels)\b`,
].join("|"), "i");

const ONE_ROPE_MAX_M = 37;

export function findings(r) {
  const out = [];
  const d = Array.isArray(r.rappel_detail) ? r.rappel_detail : [];
  const need = rappelRopeNeed({ rappelDetail: d, rappelCountNote: r.rappel_count_note });
  const long = d.filter((x) => x && typeof x.lengthM === "number" && x.lengthM > ONE_ROPE_MAX_M);
  if (long.length) out.push({ kind: "station", detail: long.map((x) => `R${x.n ?? "?"} ${x.lengthM} m`).join(", ") });
  else if (need && need.needs === "double") out.push({ kind: "station", detail: "row states one rope does not reach" });
  const texts = [["rappels", typeof r.rappels === "string" ? r.rappels : r.rappels == null ? null : JSON.stringify(r.rappels)],
    ["rappel_count_note", r.rappel_count_note],
    ...d.flatMap((x, i) => ["station", "notes", "pull", "anchor"].map((k) => [`rappel_detail[${i}].${k}`, x && x[k]])),
    ...d.flatMap((x, i) => (Array.isArray(x && x.hazards) ? x.hazards : []).map((h, j) => [`rappel_detail[${i}].hazards[${j}]`, h]))];
  for (const [where, t] of texts) {
    if (!t) continue;
    const m = String(t).match(TWO_ROPE_TEXT);
    if (m) out.push({ kind: "wording", detail: `${where}: "${m[0]}"` });
  }
  return out;
}

function selftest() {
  let fail = 0;
  const t = (label, got, want) => { const ok = got === want; if (!ok) fail++; console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : ` got ${got} want ${want}`}`); };
  const w = (s) => TWO_ROPE_TEXT.test(s);
  t("double-rope rappels", w("4 double-rope rappels"), true);
  t("two 60 m ropes", w("on two 60 m ropes"), true);
  t("2 x 60m", w("2 x 60m ropes recommended"), true);
  t("2×30m", w("2×30m"), true);
  t("two 60s", w("a single 70 m rope or two 60s"), true);
  t("a second rope", w("A second rope makes linking easier"), true);
  t("halves it", w("Two ropes roughly halves it"), true);
  t("double 60m ropes", w("tree-anchor rappels with double 60m ropes"), true);
  t("link two 30 m ropes", w("or plan to link two 30 m ropes"), true);
  t("two shorter ropes", w("a double rappel with two shorter ropes"), true);
  t("NOT: a single 60 m rope doubled", w("on a single 70m rope used doubled"), false);
  t("NOT: jammed ropes", w("a documented history of jammed ropes"), false);
  t("NOT: the party ropes up", w("after which the party ropes up again"), false);
  t("NOT: pulling ropes in the gully", w("take care pulling ropes in the gully"), false);
  t("NOT: two single-rope rappels", w("two single-rope rappels to the notch"), false);
  t("NOT: two rope-lengths of downclimbing", w("about two rope-lengths of steep downclimbing"), false);
  const f = (r) => findings(r).map((x) => x.kind).join(",");
  t("46 m station", f({ rappel_detail: [{ n: 1, lengthM: 30 }, { n: 2, lengthM: 46 }] }), "station");
  t("35 m station on a 70 is fine", f({ rappel_detail: [{ n: 1, lengthM: 35 }] }), "");
  t("clean single-rope row", f({ rappels: "4 rappels on a single 60 m rope", rappel_detail: [{ n: 1, lengthM: 30, notes: "2 bolts" }] }), "");
  t("wording in a station note", f({ rappel_detail: [{ n: 1, lengthM: 25, notes: "with double ropes this links" }] }), "wording");
  console.log(fail ? `audit:rappel-one-rope selftest: ${fail} FAILURE(S)` : "audit:rappel-one-rope selftest: ok");
  process.exit(fail ? 1 : 0);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (!isMain) { /* imported for its rules */ }
else if (process.argv.includes("--selftest")) selftest();
else {
  const key = requireServiceKey();
  const sel = "id,name,rappel_detail,rappels,rappel_count_note";
  const seen = new Map();
  for (const f of ["rappel_detail=not.is.null", "rappels=not.is.null", "rappel_count_note=not.is.null"]) {
    for (const r of await selectAll("routes", sel, f, { key, pageSize: 500 })) seen.set(r.id, r);
  }
  if (!seen.size) { console.error("audit:rappel-one-rope: read ZERO rows carrying rappel data — refusing to call that clean"); process.exit(1); }
  const bad = [...seen.values()].map((r) => ({ id: r.id, name: r.name, f: findings(r) })).filter((x) => x.f.length);
  if (process.argv.includes("--json")) { console.log(JSON.stringify(bad, null, 1)); process.exit(bad.length ? 1 : 0); }
  for (const b of bad) console.log(`${b.id} (${b.name}): ${b.f.map((x) => `${x.kind} — ${x.detail}`).join("; ")}`);
  console.log(`\naudit:rappel-one-rope: ${seen.size} routes carry rappel data; ${bad.length} describe more than one rope ` +
    `(${bad.filter((b) => b.f.some((x) => x.kind === "station")).length} by a station length, ${bad.filter((b) => b.f.some((x) => x.kind === "wording")).length} by wording).`);
  process.exit(bad.length ? 1 : 0);
}

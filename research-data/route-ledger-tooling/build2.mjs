// Builds batch IC2 (Indian Creek, next 150): guarded SQL, rollback, ledger batch for enrich:apply, held list.
// Same rules as IC1 (../ic/build.mjs). The corridor access object and its official evidence are IC1's, already
// verified against BLM (2026-11-23) and copy-checked; reused unchanged.
import fs from "node:fs";
const here = (f) => new URL(f, import.meta.url);
const rd = (f) => JSON.parse(fs.readFileSync(here(f), "utf8"));
const stored = Object.fromEntries(rd("routes.json").routes.map((r) => [r.id, r]));
const F = rd("facts-verified.json"), P = rd("prose.json"), held = rd("held-facts.json");
const IC1P = rd("../ic/prose.json"), ACC = rd("../ic/access.json").facts.filter((f) => f.official && !/2016/.test(f.page_date || "") && !/press/i.test(f.url));
const HOLD_LEN = new Set(fs.existsSync(here("hold-length.json")) ? rd("hold-length.json") : []);
const DAY = "2026-11-24", EXPIRES = "2027-11-23T00:00:00Z";
const q = (s) => "$q$" + s + "$q$";
const sql = ["-- Indian Creek batch IC4 (2026-11-24): writes enrich:apply cannot make. Old value in every WHERE.", "begin;", ""];
const rollback = [], batch = {};
const fix = (id, col, from, to, why, isJson) => {
  const where = from === null ? `${col} is null` : `${col} = ${typeof from === "number" ? from : q(from)}`;
  const val = typeof to === "number" ? to : isJson ? q(JSON.stringify(to)) + "::jsonb" : q(to);
  sql.push(`-- ${why}`, `update routes set ${col} = ${val} where id = '${id}' and ${where};`, "");
  rollback.push({ table: "routes", id, column: col, restore: from, applied: to });
};
const accessObj = { land_manager: IC1P.access.land_manager, fees: IC1P.access.fees, rules: IC1P.access.rules };
const accessUrls = [...new Set(ACC.map((f) => f.url))];
const accEv = ACC.slice(0, 6).map((a) => ({ url: a.url, official: true, fact: a.fact.slice(0, 120), retrieved_at: "2026-11-23" }));
for (const [id, s] of Object.entries(stored)) {
  const f = F[id];
  const led = [], pr = P[id] || {};
  // the access object needs no route page: every route in the corridor gets it
  if (s.access == null) fix(id, "access", null, accessObj, "access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.", true);
  led.push({ field: "access", value: accessObj, method: "official-1", level: "locked", expires_at: EXPIRES, evidence: accEv });
  if (!f) { batch[id] = { area: s.area_id, ledger: led, review: { sources: accessUrls } }; continue; }
  const url = f.url, ev = (fact) => [{ url, fact, retrieved_at: DAY }];
  const m = /\((\d+) m\)/.exec(f.type_line || "");
  const pg = String(f.page_grade || "").replace(/\s*YDS.*/, "").trim();
  if (pg && pg === String(s.grade).trim()) led.push({ field: "grade", value: s.grade, method: "single-source", level: "locked-1src", evidence: ev(`${pg}, ${f.type_line}`) });
  else held.push({ route: id, field: "grade", claim: `stored ${s.grade}`, verdict: "one source differs", page_says: pg || "(no grade read)" });
  // A page whose type line gives one length but whose TEXT describes a second pitch is not a single pitch
  // (IC4, Amaretto Corner): hold the count rather than write 1.
  const morePitches = /\b(p2|pitch(?:es)? ?2|2(?:nd)? pitch|second pitch|[2-9] pitches|two pitches)\b/i.test(JSON.stringify(f.facts || {}));
  if (s.pitches === 0 && morePitches) held.push({ route: id, field: "pitches", claim: "stored 0 (invalid)", verdict: "text describes more than one pitch; type line gives no count", page_says: f.type_line });
  else if (s.pitches === 0 && m && !/pitch/i.test(f.type_line)) {
    fix(id, "pitches", 0, 1, `pitches 0 is invalid. Page type line "${f.type_line}": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.`);
    led.push({ field: "pitches", value: 1, method: "single-source", level: "unconfirmed", evidence: ev(`type line "${f.type_line}" (no pitch count)`) });
  } else if (s.pitches === 0) held.push({ route: id, field: "pitches", claim: "stored 0 (invalid)", verdict: "no count on the page", page_says: f.type_line });
  if (m && HOLD_LEN.has(id)) held.push({ route: id, field: "length_m", claim: f.type_line, verdict: "page contradicts itself", page_says: "" });
  else if (m) {
    const pm = Number(m[1]);
    if (s.length_m == null) { fix(id, "length_m", null, pm, `length empty. Page type line "${f.type_line}". Single source; locked-1src after apply.`); led.push({ field: "length_m", value: pm, method: "single-source", level: "locked-1src", evidence: ev(f.type_line) }); }
    else if (Math.abs(s.length_m - pm) <= Math.max(0.1 * pm, 15)) led.push({ field: "length_m", value: s.length_m, method: "single-source", level: "locked-1src", evidence: ev(f.type_line) });
    else held.push({ route: id, field: "length_m", claim: `stored ${s.length_m} m`, verdict: "one source differs", page_says: f.type_line });
  }
  if (pr.detailed_rack && s.detailed_rack == null) {
    fix(id, "detailed_rack", null, pr.detailed_rack, "Rack empty. Written from the verified rack facts. Paragraph, not lockable.");
    led.push({ field: "detailed_rack", value: pr.detailed_rack, method: "single-source", level: "unconfirmed", evidence: ev("protection section") });
  }
  const set = {};
  if (pr.overview && s.overview == null) { set.overview = pr.overview; led.push({ field: "overview", value: pr.overview, method: "single-source", level: "unconfirmed", evidence: ev("route description and location") }); }
  if (pr.descent_text && s.descent_text == null) { set.descent_text = pr.descent_text; led.push({ field: "descent_text", value: pr.descent_text, method: "single-source", level: "unconfirmed", evidence: ev("descent") }); }
  batch[id] = { area: s.area_id, ...(Object.keys(set).length ? { set } : {}), ledger: led, review: { sources: [url, ...accessUrls] } };
}
sql.push("commit;");
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(`${out}/batch-ic4-fix-routes.sql`, sql.join("\n") + "\n");
fs.writeFileSync(`${out}/batch-ic4-indian-creek.json`, JSON.stringify(batch, null, 1) + "\n");
fs.writeFileSync(`${out}/batch-ic4-rollback.json`, JSON.stringify(rollback, null, 1) + "\n");
fs.writeFileSync(`${out}/batch-ic4-held.json`, JSON.stringify(held, null, 1) + "\n");
const n = (c) => rollback.filter((r) => r.column === c).length;
console.log(`fixes: pitches ${n("pitches")}, length_m ${n("length_m")}, detailed_rack ${n("detailed_rack")}, access ${n("access")}; prose via enrich:apply ${Object.values(batch).filter((b) => b.set).length}; ledger rows ${Object.values(batch).reduce((s, b) => s + b.ledger.length, 0)}; held ${held.length}`);

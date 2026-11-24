// node stage.mjs claims  -> research*.json  => research-all.json, claims1..4.json (url + fact VALUES only)
// node stage.mjs facts   -> verify*.json    => facts-verified.json, held-facts.json, facts1..3.json (writer input)
// node stage.mjs prose   -> prose1..3.json  => prose.json
import fs from "node:fs";
const D = new URL(".", import.meta.url);
const rd = (f) => JSON.parse(fs.readFileSync(new URL(f, D), "utf8"));
const wr = (f, v) => fs.writeFileSync(new URL(f, D), JSON.stringify(v, null, 1));
const files = (re) => fs.readdirSync(D).filter((f) => re.test(f)).sort();
const stored = Object.fromEntries(rd("routes.json").routes.map((r) => [r.id, r]));
const split = (ids, n) => { const out = Array.from({ length: n }, () => []); ids.forEach((id, i) => out[i % n].push(id)); return out; };
const step = process.argv[2];
if (step === "claims") {
  const all = Object.assign({}, ...files(/^research\d+\.json$/).map(rd));
  wr("research-all.json", all);
  const found = Object.keys(all).filter((id) => all[id].url);
  split(found, 4).forEach((ids, i) => wr(`claims${i + 1}.json`, Object.fromEntries(ids.map((id) => [id, { url: all[id].url, wall: stored[id].wall, name: stored[id].name,
    facts: Object.fromEntries(Object.entries(all[id].facts || {}).filter(([, v]) => Array.isArray(v) && v.length).map(([k, v]) => [k, v.map((x) => String(x.value ?? x))])) }]))));
  console.log(`${Object.keys(all).length} researched, ${found.length} found, missing from chunks: ${Object.keys(stored).filter((id) => !all[id]).length}`);
} else if (step === "facts") {
  const R = rd("research-all.json"), V = Object.assign({}, ...files(/^verify\d+\.json$/).map(rd));
  const out = {}, held = [];
  // IC3 identity holds: generic names where two MP pages could be this row, and a page MP marks "To Be Deleted".
  const HOLD = new Set(JSON.parse(fs.existsSync(new URL("hold.json", D)) ? fs.readFileSync(new URL("hold.json", D), "utf8") : "[]"));
  // Racks only partly read (tool output cut): a partial rack would under-state the gear.
  const HOLD_RACK = new Set(JSON.parse(fs.existsSync(new URL("hold-rack.json", D)) ? fs.readFileSync(new URL("hold-rack.json", D), "utf8") : "[]"));
  for (const [id, r] of Object.entries(R)) {
    if (HOLD.has(id)) { held.push({ route: id, field: "*", claim: stored[id].name, verdict: "identity not certain", page_says: "" }); continue; }
    if (HOLD_RACK.has(id) && r.facts) { if (r.facts.rack) held.push({ route: id, field: "rack", claim: "partly read", verdict: "incomplete", page_says: "" }); delete r.facts.rack; }
    if (!r.url) { held.push({ route: id, field: "*", claim: "no page", verdict: "not found", page_says: "" }); continue; }
    const v = V[id];
    if (!v || !v.right_page) { held.push({ route: id, field: "*", claim: r.url, verdict: v ? "wrong page" : "not verified", page_says: "" }); continue; }
    const o = { url: r.url, type_line: v.type_line, page_grade: v.page_grade, facts: {} };
    for (const [k, arr] of Object.entries(r.facts || {})) {
      if (!Array.isArray(arr)) continue;
      const vv = (v.facts || {})[k] || [];
      arr.forEach((f, i) => {
        const val = String(f.value ?? f), verdict = (vv[i] || {}).verdict;
        if (verdict === "confirmed") (o.facts[k] ||= []).push(val);
        else held.push({ route: id, field: k, claim: val, verdict: verdict || "unverified", page_says: (vv[i] || {}).page_says || "" });
      });
    }
    out[id] = o;
  }
  wr("facts-verified.json", out); wr("held-facts.json", held);
  split(Object.keys(out), 3).forEach((ids, i) => wr(`facts${i + 1}.json`, Object.fromEntries(ids.map((id) => [id, { ...out[id], url: undefined,
    skip_overview: stored[id].overview != null }]))));
  console.log(`${Object.keys(out).length} routes with verified facts; ${held.length} held`);
} else if (step === "prose") {
  const P = Object.assign({}, ...files(/^prose\d+\.json$/).map(rd));
  wr("prose.json", P);
  console.log(`${Object.keys(P).length} routes with prose`);
}

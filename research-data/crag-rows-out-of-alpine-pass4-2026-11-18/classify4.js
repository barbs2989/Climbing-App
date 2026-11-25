// Pass 4 (2026-11-18): the 894 alpine 5.x rows never judged by passes 1-3 (crag4/unjudged.json), using the per-area
// research crag4/q-out-*.json. Same strict rule as pass 2/3: an area is crag only when a page STATES <=60 min on foot
// from the car (or roadside wording), no summit/glacier; a route moves only with an exact MP Sport/Trad/TR type and no
// strong alpine signal in its own text (signals.js over the row's text columns, crag4/rowtext.json).
// Usage: node classify4.js -> decisions4.json + review4.json
const fs = require("fs"), path = require("path");
const D = __dirname, C = path.join(D, "../crag4");
const { scan } = require("./signals");
const rows = JSON.parse(fs.readFileSync(path.join(C, "unjudged.json")));
const text = fs.existsSync(path.join(C, "rowtext.json")) ? Object.fromEntries(JSON.parse(fs.readFileSync(path.join(C, "rowtext.json"))).map((r) => [r.id, r])) : {};
const areas = {};
for (const f of fs.readdirSync(C).filter((f) => /^q-out-\d+\.json$/.test(f)))
  for (const r of JSON.parse(fs.readFileSync(path.join(C, f)))) if (r && r.area_id) areas[r.area_id] = { ...r, file: f };
const O = JSON.parse(fs.readFileSync(path.join(C, "overrides4.json")));
const unsureByName = O.unsure || {}, skip = O._skip_routes || [];
const STRONG = /^(summit|glacier|crampon\/axe|snow travel|bivy\/camp|heli\/fly\/hut|peak\/ridge finish|long walk \(hours\)|long walk \(miles\)|pass crossing|wilderness\/backcountry)/;
const BAD_TIMING = /\b(tram|gondola|chair ?lift|ski lift|lift top|top of the lift|photo caption|caption)\b/i;
const ROADSIDE = /\b(roadside|road ?side|next to the road|off the road|from the car|from the road in (a )?(few|couple) minutes|minutes away|pullout (sits )?(just )?above|right off the road|steps from|above the parking lot|parking (all )?along the base)\b/i;
function statedMinutes(s) {
  const W = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, "forty-five": 45, fifty: 50 };
  const t = String(s || "").toLowerCase()
    .replace(/\b(forty-five|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty|fifty)\b(?=[\s-]*(min|minute|hour|hr))/g, (m) => W[m])
    .replace(/(\d)-(min|minute|hour|hr)/g, "$1 $2");
  const mins = [];
  if (/\b\d+\s*(sec|second)s?\b/.test(t) || /virtually no approach|a couple of minutes|couple minutes/.test(t)) mins.push(5);
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(min|minute|h|hr|hour)/g)) mins.push(+m[2] * (/^h/.test(m[3]) ? 60 : 1));
  for (const m of t.matchAll(/(?<![\d.\-–])(\d+(?:\.\d+)?)\s*\+?\s*(min|minute|h\b|hr|hour)/g)) mins.push(+m[1] * (/^h/.test(m[2]) ? 60 : 1));
  if (/\b(an|one) hour\b|hour-ish/.test(t)) mins.push(60);
  if (/\bhalf[- ]an? hour|half-hour\b/.test(t)) mins.push(30);
  if (/\ba few minutes\b/.test(t)) mins.push(5);
  return mins;
}
const nameHold = (a) => Object.entries(unsureByName).find(([n]) => String(a.place_name || "").toLowerCase().includes(n.toLowerCase()));
function judge(a) {
  if (!a) return { v: "unsure", why: "no area research" };
  const h = nameHold(a); if (h) return { v: "unsure", why: "hand: " + h[1] };
  if (a.verdict !== "crag") return { v: a.verdict === "alpine" ? "stay_alpine" : "unsure", why: `area research ${a.verdict}: ${a.approach_stated || ""}`.slice(0, 200) };
  const sg = a.summit_or_glacier;
  if (sg && !(typeof sg === "string" && /^(no|none)\b/i.test(sg.trim()))) return { v: "unsure", why: "crag call but summit/glacier noted: " + String(sg).slice(0, 100) };
  const s = a.approach_stated || "";
  if (BAD_TIMING.test(s)) return { v: "unsure", why: "timed from a lift/tram/gondola or a photo caption" };
  const mins = statedMinutes(s);
  if (mins.length) { const max = Math.max(...mins); if (max > 60) return { v: "unsure", why: `a stated time exceeds 60 min (${max})` }; return { v: "crag", why: `stated ${s}`.slice(0, 200), min: max }; }
  if (ROADSIDE.test(s)) return { v: "crag", why: `stated roadside: ${s}`.slice(0, 200), min: 5 };
  return { v: "unsure", why: `crag call without a stated time (${s.slice(0, 120)})` };
}
const typeOf = (s) => { const t = String(s || "").toLowerCase(); if (/\btrad\b/.test(t)) return "trad"; if (/\bsport\b/.test(t)) return "sport"; if (/\b(tr|top ?rope)\b/.test(t)) return "toprope"; return null; };
const out = [], aj = {};
for (const d of rows) {
  const a = areas[d.area_id]; const j = aj[d.area_id] || (aj[d.area_id] = judge(a));
  const o = { id: d.id, area_id: d.area_id, name: d.name, grade: d.grade, state: d.state, pass: 4, old_disciplines: d.disciplines, signals: [] };
  if (j.v === "stay_alpine") { o.verdict = "stay_alpine"; o.signals.push("PASS4 " + j.why); }
  else if (j.v !== "crag") { o.verdict = "unsure"; o.signals.push("PASS4 " + j.why); }
  else {
    const rt = a.route_types && a.route_types[d.id]; const t = typeOf(rt);
    const sc = text[d.id] ? scan(text[d.id]) : { alp: [] };
    const strong = sc.alp.filter((x) => STRONG.test(x) && !(/^summit/.test(x) && /tower|perch|pillar|block|formation|boulder|dome|pinnacle|top of the (wall|cliff|crag)/i.test(x)));
    const guessed = new RegExp("\\b" + d.id + "\\b[^.]*\\b(probably|likely|matched by grade|by grade)\\b", "i").test(a.note || "");
    if (!text[d.id]) { o.verdict = "unsure"; o.signals.push("PASS4 row text not loaded"); }
    else if (strong.length) { o.verdict = "unsure"; o.signals.push("PASS4 crag area but the row text carries a strong alpine signal: " + strong.join("; ")); }
    else if (skip.includes(d.id)) { o.verdict = "unsure"; o.signals.push("PASS4 route skipped by hand"); }
    else if (t && guessed) { o.verdict = "unsure"; o.signals.push("PASS4 MP match guessed"); }
    else if (!t) { o.verdict = "unsure"; o.signals.push("PASS4 crag area (" + j.why + ") but no Sport/Trad/TR type for this route"); }
    else {
      o.verdict = "to_" + (t === "toprope" ? "tr" : t); o.new_discipline = t;
      const tagD = String(rt).toLowerCase().split(/[ ,]+/).flatMap((x) => x === "trad" ? ["trad"] : x === "sport" ? ["sport"] : x === "tr" ? ["toprope"] : []);
      const old = (Array.isArray(d.disciplines) ? d.disciplines : []).filter((x) => !["alpine", "mountaineering", "scrambling", "scramble"].includes(x));
      o.new_disciplines = [...new Set([t, ...tagD, ...old])];
      o.signals.push(`AREA RESEARCH: crag, ~${j.min} min on foot — ${j.why}`, `MP TYPE: ${rt}`);
      o.evidence_urls = (a.evidence || []).map((e) => e.url);
    }
  }
  out.push(o);
}
fs.writeFileSync(path.join(D, "decisions4.json"), JSON.stringify(out, null, 1));
const cnt = {}; for (const o of out) cnt[o.verdict] = (cnt[o.verdict] || 0) + 1;
const ac = {}; for (const j of Object.values(aj)) ac[j.v] = (ac[j.v] || 0) + 1;
console.log("routes", cnt, "| areas", ac, "| researched", Object.keys(areas).length, "of", new Set(rows.map((r) => r.area_id)).size);
const review = Object.entries(aj).filter(([k, j]) => j.v === "unsure" && areas[k] && areas[k].verdict === "crag").map(([k, j]) => ({ area_id: k, place: areas[k].place_name, why: j.why }));
fs.writeFileSync(path.join(D, "review4.json"), JSON.stringify(review, null, 1));
console.log("crag calls held:", review.length); for (const r of review) console.log("  ", r.place, "|", r.why.slice(0, 110));

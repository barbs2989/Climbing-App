// Pass 2 (2026-11-18): the 2,159 "unsure" rows of decisions.json, using the crag-area research (crag/c-out-*.json).
// Owner rule: crag = <=1 h on foot from the car; "accurate and correct" -> a crag verdict counts only when the page STATES
// a time <=60 min (or roadside wording). Distance-only, lift/tram/gondola-timed, photo-caption, or conflicting times -> unsure.
// Usage: node classify2.js  -> decisions2.json + review2.json + stats
const fs = require("fs"), path = require("path");
const D = __dirname, C = path.join(D, "../crag");
const dec = JSON.parse(fs.readFileSync(path.join(D, "decisions.json")));
const unsure = dec.filter((d) => d.verdict === "unsure");
const areas = {};
for (const f of fs.readdirSync(C).filter((f) => /^c-out-\d+\.json$/.test(f))) {
  let a; try { a = JSON.parse(fs.readFileSync(path.join(C, f))); } catch { console.log("bad json", f); continue; }
  for (const r of a) if (r && r.area_id) areas[r.area_id] = { ...r, file: f };
}
// Hand decisions from reading each agent's note (2026-11-18). value: "crag" | "unsure" | "alpine", with the reason.
const OVERRIDE = JSON.parse(fs.existsSync(path.join(D, "overrides2.json")) ? fs.readFileSync(path.join(D, "overrides2.json")) : "{}");
const STRONG = /^(summit|glacier|crampon\/axe|snow travel|bivy\/camp|heli\/fly\/hut|peak\/ridge finish|long walk \(hours\)|long walk \(miles\)|pass crossing|wilderness\/backcountry)/;
const BAD_TIMING = /\b(tram|gondola|chair ?lift|ski lift|lift top|top of the lift|photo caption|caption)\b/i;
const ROADSIDE = /\b(roadside|road ?side|next to the road|from the road in (a )?(few|couple) minutes|minutes away|pullout (sits )?(just )?above|right off the road|steps from)\b/i;
function statedMinutes(s) {
  // every "N min" / "N-M min" / "N h(our)" figure stated; the LARGEST bound decides
  const W = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, "forty-five": 45, fifty: 50 };
  const t = String(s || "").toLowerCase()
    .replace(/\b(forty-five|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty|fifty)\b(?=[\s-]*(min|minute|hour|hr))/g, (m) => W[m])
    .replace(/(\d)-(min|minute|hour|hr)/g, "$1 $2");
  const mins = [];
  if (/\b\d+\s*(sec|second)s?\b/.test(t) || /virtually no approach|a couple of minutes|couple minutes/.test(t)) mins.push(5);
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(min|minute|h|hr|hour)/g)) mins.push(+m[2] * (/^h/.test(m[3]) ? 60 : 1));
  for (const m of t.matchAll(/(?<![\d.\-–])(\d+(?:\.\d+)?)\s*\+?\s*(min|minute|h\b|hr|hour)/g)) mins.push(+m[1] * (/^h/.test(m[2]) ? 60 : 1));
  if (/\b(an|one) hour\b/.test(t)) mins.push(60);
  if (/\bhalf[- ]an? hour|half-hour\b/.test(t)) mins.push(30);
  if (/\ba few minutes\b/.test(t)) mins.push(5);
  return mins;
}
function judge(a) {
  if (!a) return { v: "unsure", why: "no area research" };
  if (OVERRIDE[a.area_id]) return { v: OVERRIDE[a.area_id].v, why: "hand: " + OVERRIDE[a.area_id].why };
  if (a.verdict !== "crag") return { v: a.verdict === "alpine" ? "stay_alpine" : "unsure", why: `area research ${a.verdict}: ${a.approach_stated || ""}`.slice(0, 200) };
  const txt = `${a.approach_stated || ""} ${a.note || ""}`;
  if (BAD_TIMING.test(a.approach_stated || "")) return { v: "unsure", why: "timed from a lift/tram/gondola or a photo caption, not on foot from the car" };
  if (/\b(time not stated|no time stated|not timed|no minutes)\b/i.test(a.approach_stated || "") && !ROADSIDE.test(a.approach_stated || ""))
    return { v: "unsure", why: "only part of the approach is timed; no total stated" };
  const mins = statedMinutes(a.approach_stated);
  if (mins.length) {
    const max = Math.max(...mins);
    if (max > 60) return { v: "unsure", why: `crag call but a stated time exceeds 60 min (${max})` };
    return { v: "crag", why: `stated ${a.approach_stated}`.slice(0, 200), min: max };
  }
  if (ROADSIDE.test(a.approach_stated || "")) return { v: "crag", why: `stated roadside: ${a.approach_stated}`.slice(0, 200), min: 5 };
  return { v: "unsure", why: `crag call without a stated time (${(a.approach_stated || "").slice(0, 120)})` };
}
function typeOf(s) {
  const t = String(s || "").toLowerCase();
  if (/\btrad\b/.test(t)) return "trad"; if (/\bsport\b/.test(t)) return "sport"; if (/\b(tr|top ?rope)\b/.test(t)) return "toprope"; return null;
}
const out = [], review = [], aj = {};
for (const d of unsure) {
  const a = areas[d.area_id]; const j = aj[d.area_id] || (aj[d.area_id] = judge(a));
  const o = { ...d, pass: 2, signals: [...d.signals] };
  if (j.v === "stay_alpine") { o.verdict = "stay_alpine"; o.signals.push("PASS2 " + j.why); }
  else if (j.v === "crag") {
    const strong = d.signals.filter((s) => s.startsWith("ALPINE: ")).map((s) => s.slice(8)).filter((x) => STRONG.test(x) && !(/^summit/.test(x) && /tower|perch|pillar|block|formation|boulder|dome|pinnacle|top of the (wall|cliff|crag)/i.test(x)));
    const rt = a.route_types && a.route_types[d.id]; const t = typeOf(rt);
    const guessed = new RegExp("\\b" + d.id + "\\b[^.]*\\b(probably|likely|matched by grade|by grade)\\b|\\b(probably|likely)\\b[^.]*" + String(d.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(a.note || "");
    if (strong.length) { o.verdict = "unsure"; o.signals.push("PASS2 crag area but the row text carries a strong alpine signal: " + strong.join("; ")); }
    else if (OVERRIDE._skip_routes && OVERRIDE._skip_routes[d.id]) { o.verdict = "unsure"; o.signals.push("PASS2 route skipped by hand: " + OVERRIDE._skip_routes[d.id]); }
    else if (t && guessed) { o.verdict = "unsure"; o.signals.push("PASS2 crag area but this route's MP match was guessed (substitute name/grade)"); }
    else if (!t) { o.verdict = "unsure"; o.signals.push("PASS2 crag area (" + j.why + ") but no Sport/Trad/TR type found for this route"); }
    else {
      o.verdict = "to_" + (t === "toprope" ? "tr" : t); o.new_discipline = t;
      const tagD = String(rt).toLowerCase().split(/[ ,]+/).flatMap((x) => x === "trad" ? ["trad"] : x === "sport" ? ["sport"] : x === "tr" ? ["toprope"] : []);
      const old = (Array.isArray(d.old_disciplines) ? d.old_disciplines : []).filter((x) => !["alpine", "mountaineering", "scrambling", "scramble"].includes(x));
      o.new_disciplines = [...new Set([t, ...tagD, ...old])];
      o.signals.push(`AREA RESEARCH: crag, ~${j.min} min on foot — ${j.why}`, `MP TYPE: ${rt}`);
      o.evidence_urls = [...new Set([...(d.evidence_urls || []), ...(a.evidence || []).map((e) => e.url)])];
    }
  } else { o.verdict = "unsure"; o.signals.push("PASS2 " + j.why); }
  out.push(o);
}
fs.writeFileSync(path.join(D, "decisions2.json"), JSON.stringify(out, null, 1));
const cnt = {}; for (const o of out) cnt[o.verdict] = (cnt[o.verdict] || 0) + 1;
const areaCnt = {}; for (const [k, j] of Object.entries(aj)) areaCnt[j.v] = (areaCnt[j.v] || 0) + 1;
console.log("routes", cnt, "| areas", areaCnt, "| researched areas", Object.keys(areas).length);
for (const [k, j] of Object.entries(aj)) if (j.v === "unsure" && areas[k] && areas[k].verdict === "crag") review.push({ area_id: k, place: areas[k].place_name, why: j.why });
fs.writeFileSync(path.join(D, "review2.json"), JSON.stringify(review, null, 1));
console.log("crag calls demoted to unsure:", review.length);

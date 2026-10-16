// Cross-field contradiction detector over the WA snapshot. Reads wa-routes.json / wa-areas.json,
// writes findings.json. Every check compares TWO records of ONE fact on the same row.
import fs from "node:fs";
const T = new URL("../../../audits/route-tab-contradictions", import.meta.url).pathname;
const R = JSON.parse(fs.readFileSync(`${T}/wa-routes.json`));
const A = Object.fromEntries(JSON.parse(fs.readFileSync(`${T}/wa-areas.json`)).map(a => [a.id, a]));

const MON = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const monIdx = s => { const i = MON.indexOf(String(s).slice(0, 3).toLowerCase()); return i < 0 ? null : i; };
const num = v => (v == null || v === "" ? null : (isFinite(+v) ? +v : null));
const str = v => (v == null ? "" : typeof v === "string" ? v : JSON.stringify(v));
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 };

// "Jun-Sep", "Late June - September", "mid-July through September", "July-August"
// -> [startMonth, endMonth] with half-month resolution (late/mid = +0.5).
function window(s) {
  if (!s || typeof s !== "string") return null;
  const re = /\b(early|mid|late)?[-\s]?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(?:[-–—]|to|through|thru|into|until|and|or)\s*(early|mid|late)?[-\s]?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/i;
  const m = s.match(re);
  if (!m) return null;
  const adj = w => (w ? ({ early: 0, mid: 0.5, late: 0.5 })[w.toLowerCase()] : 0);
  return [monIdx(m[2]) + adj(m[1]), monIdx(m[4]) + (m[3] && m[3].toLowerCase() === "early" ? -0.5 : 0)];
}
function ydsVal(g) { // "5.10b" -> 10.5 ; "5.9+" -> 9.3
  const m = String(g).match(/5\.(\d{1,2})([abcd])?([+-])?/);
  if (!m) return null;
  let v = +m[1];
  if (m[2]) v += { a: 0, b: 0.25, c: 0.5, d: 0.75 }[m[2]];
  if (m[3] === "+") v += 0.3; if (m[3] === "-") v -= 0.1;
  return v;
}
function maxYds(s) {
  let best = null;
  for (const m of String(s).matchAll(/5\.\d{1,2}[abcd]?[+-]?(?:\/[abcd])?/g)) { const v = ydsVal(m[0]); if (v != null && (best == null || v > best.v)) best = { v, t: m[0] }; }
  return best;
}
const clean = s => String(s).toLowerCase().replace(/\b(the|trail ?head|th|trailhead|parking|lot|road|rd|fr|nf|forest)\b/g, " ").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

const findings = [];
const add = (r, check, detail, fields) => findings.push({ id: r.id, name: r.name, area: r.area_id, check, fields, detail });

for (const r of R) {
  const area = A[r.area_id] || {};
  const it = r.itinerary && Array.isArray(r.itinerary.days) ? r.itinerary.days : null;
  const tm = r.timing && typeof r.timing === "object" ? r.timing : null;

  // A. commitment grade: roman numeral leading `grade` vs `commitment` / roman `alpine_grade`
  const gRom = String(r.grade || "").match(/^(?:grade\s+)?(VII|VI|IV|V|III|II|I)\b/i);
  const cRom = String(r.commitment || "").match(/^(?:grade\s+)?(VII|VI|IV|V|III|II|I)\b/i);
  const aRom = String(r.alpine_grade || "").match(/^(?:grade\s+)?(VII|VI|IV|V|III|II|I)\b/i);
  const roms = [["grade", gRom], ["commitment", cRom], ["alpine_grade", aRom]].filter(x => x[1]);
  if (new Set(roms.map(x => x[1][1].toUpperCase())).size > 1)
    add(r, "commitment-grade", roms.map(x => `${x[0]}=${x[1][1]}`).join(" vs "), roms.map(x => x[0]));

  // B. rock grade: hardest YDS in `grade` vs `rock_grade`; and pitch_detail harder than both
  const gY = maxYds(r.grade || ""), rY = maxYds(r.rock_grade || "");
  if (gY && rY && Math.abs(gY.v - rY.v) >= 0.5) add(r, "rock-grade", `grade "${r.grade}" vs rock_grade "${r.rock_grade}"`, ["grade", "rock_grade"]);
  if (Array.isArray(r.pitch_detail)) {
    const top = [gY, rY].filter(Boolean).reduce((a, b) => (b.v > a ? b.v : a), -1);
    const pd = r.pitch_detail.map(p => maxYds(str(p && p.grade))).filter(Boolean).reduce((a, b) => (!a || b.v > a.v ? b : a), null);
    if (top >= 0 && pd && pd.v - top >= 0.5) add(r, "pitch-harder-than-route", `pitch_detail max ${pd.t} vs route ${gY ? gY.t : ""}/${rY ? rY.t : ""}`, ["pitch_detail", "grade", "rock_grade"]);
    if (top >= 0 && pd && top - pd.v >= 1.5 && r.pitch_detail.length >= 2) add(r, "route-harder-than-every-pitch", `route ${Math.max(gY?.v || 0, rY?.v || 0)} but hardest pitch ${pd.t}`, ["pitch_detail", "grade", "rock_grade"]);
  }

  // C. pitch count: `pitches` vs numbered pitch_detail rows, and vs "N pitches" in prose
  const P = num(r.pitches);
  if (Array.isArray(r.pitch_detail) && P) {
    const numbered = r.pitch_detail.filter(p => /^(p|pitch)\s*\d+/i.test(str(p && p.pitch)));
    if (numbered.length >= 2 && numbered.length === r.pitch_detail.length && numbered.length !== P)
      add(r, "pitch-count", `pitches=${P} but pitch_detail has ${numbered.length} numbered pitches`, ["pitches", "pitch_detail"]);
  }
  if (P) {
    for (const f of ["overview", "beta", "climbing_route", "detailed_rack", "pro_needs", "descent_text"]) {
      for (const m of str(r[f]).matchAll(/(?<![\d.\/])\b(\d{1,2})(?:\s*(?:-|–|to)\s*(\d{1,2}))?[- ](?:long |short |roped |technical |fifth-class |5th-class |moderate |easy |hard |more )?pitch(?:es)?\b/gi)) {
        const lo = +m[1], hi = m[2] ? +m[2] : lo;
        const ctx = str(r[f]).slice(Math.max(0, m.index - 60), m.index + 40);
        if (/rappel|rap |raps|abseil|lower|variation|alternat|other route|neighbo|next door|adjacent|last|final|first|top|upper|lower|bottom|crux|\bof the\b/i.test(ctx)) continue;
        if (P < lo - 1 || P > hi + 1) if (0) add(r, "pitch-count-prose", `pitches=${P} but ${f} says "${m[0]}" …${ctx.replace(/\s+/g, " ")}…`, ["pitches", f]);
      }
    }
  }

  // D. high point above the peak it is filed on
  const hp = num(r.high_point_ft), pe = num(area.elevation_ft);
  if (hp && pe && area.area_type === "peak" && hp > pe + 150) add(r, "high-point-above-peak", `high_point_ft ${hp} > peak ${area.name} ${pe}`, ["high_point_ft", "areas.elevation_ft"]);
  // summit elevation stated in overview prose "(9,415 ft)" for the peak vs areas.elevation_ft
  if (pe && area.area_type === "peak") {
    const nm = String(area.name).replace(/^mount |^mt\.? /i, "").split(/\s+/)[0];
    for (const f of ["overview", "beta"]) {
      const re = new RegExp(String(area.name).replace(/[^a-z ]/gi, ".") + "\\s*\\((?:~|about |approx\\.? )?([0-9],?[0-9]{3})\\s*(?:ft|feet|')\\)", "i");
      const m = str(r[f]).match(re);
      if (m) { const v = +m[1].replace(",", ""); if (v >= 3000 && Math.abs(v - pe) > 100 && !/gain|of climbing|vertical|route|feet of/i.test(m[0])) add(r, "summit-elev-prose", `${f} gives ${area.name} ${v} ft, area says ${pe}`, [f, "areas.elevation_ft"]); }
    }
  }

  // E/F/G. itinerary totals vs row columns
  if (it && it.length) {
    const sum = k => it.reduce((a, d) => a + (num(d && d[k]) || 0), 0);
    const has = k => it.every(d => num(d && d[k]) != null);
    const g = num(r.gain_ft), l = num(r.loss_ft);
    if (g && has("gainFt") && sum("gainFt") > 0 && Math.abs(sum("gainFt") - g) / g > 0.15 && Math.abs(sum("gainFt") - g) > 400)
      add(r, "gain-vs-itinerary", `gain_ft ${g} vs itinerary gainFt sum ${sum("gainFt")}`, ["gain_ft", "itinerary"]);
    if (l && has("lossFt") && sum("lossFt") > 0 && Math.abs(sum("lossFt") - l) / l > 0.15 && Math.abs(sum("lossFt") - l) > 400)
      add(r, "loss-vs-itinerary", `loss_ft ${l} vs itinerary lossFt sum ${sum("lossFt")}`, ["loss_ft", "itinerary"]);
    const dk = num(r.dist_km);
    if (dk && has("miles") && sum("miles") > 0) {
      const mi = dk * 0.621371, im = sum("miles");
      const near = x => Math.abs(x - im) / im <= 0.2 || Math.abs(x - im) < 1;
      if (!near(mi) && !near(mi * 2) && !near(mi / 2)) add(r, "distance-vs-itinerary", `dist_km ${dk} (${mi.toFixed(1)} mi) vs itinerary miles ${im}`, ["dist_km", "itinerary"]);
    }
    if (tm && num(tm.totalHrs) && has("hours")) {
      const ih = sum("hours"), th = num(tm.totalHrs);
      if (Math.abs(ih - th) > Math.max(2, 0.2 * th)) add(r, "hours-vs-itinerary", `timing.totalHrs ${th} vs itinerary hours ${ih}`, ["timing", "itinerary"]);
    }
    // start time: timing.recommendedStart vs itinerary day-1 first schedule time
    const s0 = it[0] && Array.isArray(it[0].schedule) && it[0].schedule[0] && it[0].schedule[0].time;
    const rs = tm && tm.recommendedStart;
    const hm = x => { const m = String(x || "").match(/(\d{1,2})(?::(\d\d))?\s*([ap])\.?m/i); return m ? ((+m[1] % 12) + (m[3].toLowerCase() === "p" ? 12 : 0)) * 60 + (+m[2] || 0) : null; };
    if (s0 && rs && hm(s0) != null && hm(rs) != null && Math.abs(hm(s0) - hm(rs)) > 60 && !/camp/i.test(rs + " " + str(it[0].schedule[0]))) add(r, "start-time", `timing.recommendedStart "${rs}" vs itinerary day 1 "${s0}"`, ["timing", "itinerary"]);
    // trailhead: itinerary names a TH the waypoints / logistics never mention
    const thWp = (Array.isArray(r.waypoints) ? r.waypoints : []).filter(w => /trail ?head/i.test(str(w.type) + " " + str(w.name))).map(w => w.name);
    const thAl = r.approach_logistics && r.approach_logistics.trailhead;
    const known = [...thWp, thAl, str(r.approach).slice(0, 400)].filter(Boolean).map(clean).join(" | ");
    for (const d of it) for (const s of (Array.isArray(d && d.schedule) ? d.schedule : [])) {
      const m = str(s.detail).match(/([A-Z][A-Za-z'.]+(?: [A-Z][A-Za-z'.]+){0,3}) (?:TH|Trailhead)\b/);
      if (m && d.n === 1 && known && !clean(m[1]).split(" ").filter(w => w.length > 3).some(w => known.includes(w)))
        add(r, "itinerary-trailhead", `itinerary starts at "${m[0]}" but trailhead elsewhere is ${JSON.stringify([...thWp, thAl].filter(Boolean))}`, ["itinerary", "waypoints", "approach_logistics"]);
    }
  }
  if (tm && Array.isArray(tm.sectionBreakdown) && num(tm.totalHrs)) {
    const s = tm.sectionBreakdown.reduce((a, x) => a + (num(x && x.hrs) || 0), 0);
    if (s && Math.abs(s - num(tm.totalHrs)) > 1.5) add(r, "hours-vs-breakdown", `timing.totalHrs ${tm.totalHrs} vs sectionBreakdown sum ${s}`, ["timing"]);
  }
  // partner_requirements "~13hr car-to-car" vs timing.totalHrs
  if (tm && num(tm.totalHrs) && r.partner_requirements) {
    const m = str(r.partner_requirements).match(/~?(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s*(?:hr|hour)s?\b[^"]{0,20}car[- ]to[- ]car/i);
    if (m) { const lo = +m[1], hi = m[2] ? +m[2] : lo, th = num(tm.totalHrs); if (th < lo - 2 || th > hi + 2) add(r, "hours-vs-partner-req", `timing.totalHrs ${th} vs partner_requirements "${m[0]}"`, ["timing", "partner_requirements"]); }
  }
  // approach hours: timing.approachTimeHrs vs approach_variants[0].hours
  if (tm && num(tm.approachTimeHrs) && Array.isArray(r.approach_variants) && r.approach_variants.length === 1) {
    const m = str(r.approach_variants[0].hours).match(/(\d+(?:\.\d)?)(?:\s*[-–]\s*(\d+(?:\.\d)?))?/);
    if (m) { const lo = +m[1], hi = m[2] ? +m[2] : lo, a = num(tm.approachTimeHrs); if (a < lo - 1.5 || a > hi + 1.5) add(r, "approach-hours", `timing.approachTimeHrs ${a} vs approach_variants hours "${r.approach_variants[0].hours}"`, ["timing", "approach_variants"]); }
  }

  // H. season windows
  const wins = [["season", window(r.season)], ["best_season", window(r.best_season)], ["seasonal_guidance.optimalWindow", window(r.seasonal_guidance && r.seasonal_guidance.optimalWindow)]].filter(x => x[1]);
  const sw = window(r.season);
  const best = wins.filter(x => x[0] !== "season");
  if (sw) for (const [k, b] of best) {
    if (b[0] < sw[0] - 0.5 || b[1] > sw[1] + 0.5) add(r, "season-window", `season "${r.season}" [${sw}] but ${k} [${b}] runs outside it: "${str(k === "best_season" ? r.best_season : r.seasonal_guidance.optimalWindow).slice(0, 120)}"`, ["season", k]);
  }
  if (best.length === 2 && (Math.abs(best[0][1][0] - best[1][1][0]) >= 1 || Math.abs(best[0][1][1] - best[1][1][1]) >= 1))
    add(r, "season-window", `best_season [${best[0][1]}] vs optimalWindow [${best[1][1]}]`, ["best_season", "seasonal_guidance"]);
  // monthBreakdown says a month inside the season is "poor"/"closed", or optimal outside it
  if (r.seasonal_guidance && r.seasonal_guidance.monthBreakdown && window(r.season)) {
    const [s, e] = window(r.season);
    for (const [mo, v] of Object.entries(r.seasonal_guidance.monthBreakdown)) {
      const i = monIdx(mo); if (i == null) continue;
      const st = String(v && v.status).toLowerCase();
      if (st === "optimal" && (i < Math.floor(s) || i > Math.ceil(e))) add(r, "season-vs-months", `season "${r.season}" but ${mo} is optimal`, ["season", "seasonal_guidance"]);
      if (/poor|closed|avoid|not recommended/.test(st) && i > Math.ceil(s) && i < Math.floor(e)) add(r, "season-vs-months", `season "${r.season}" but ${mo} is ${st}`, ["season", "seasonal_guidance"]);
    }
  }

  // K. named-place elevations across prose, waypoints, bivy
  const places = {};
  const put = (name, v, src) => {
    if (/trail ?head|\bth\b|trail\b|road|parking|junction|creek|outlet|inlet|shore|trail camp|basin/i.test(String(name))) return;
    const k = String(name).toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z ]/g, " ").replace(/\b(the|a|at|to|of|camp|near)\b/g, " ").replace(/\s+/g, " ").trim();
    if (!/\b(pass|col|saddle|notch|gap|lake|tarn|meadows?)\b/.test(k) || v < 1000 || v > 14500) return;
    const key = k.match(/((?:upper |lower |high |low )?[a-z]+ (?:[a-z]+ )?(?:pass|col|saddle|notch|gap|lake|tarn|meadows?))/);
    if (!key) return;
    (places[key[1]] ||= []).push({ v, src });
  };
  for (const w of (Array.isArray(r.waypoints) ? r.waypoints : [])) if (num(w.elev)) put(w.name, num(w.elev), "waypoint");
  for (const b of (Array.isArray(r.bivy) ? r.bivy : [])) if (num(b.elev)) put(b.name, num(b.elev), "bivy");
  for (const f of ["approach", "descent_text", "overview", "beta", "climbing_route", "bail", "turnaround"]) {
    const t = str(r[f]);
    for (const m of t.matchAll(/((?:[A-Z][a-z'.-]+ ){1,3}(?:Pass|Col|Saddle|Notch|Gap|Lake|Tarn|Meadows?))\s*(?:\(\s*(?:~|about |around |roughly |approx\.? |c\. )?|,?\s*(?:at|around|about|near) (?:~|about |roughly )?)(\d{1,2},\d{3}|\d{4,5})['’]?\s*(?:ft|feet|')(?!\s*(?:of|gain|loss|above|below|up|down|lower|higher|vertical|climb|descent|elevation gain))/g)) put(m[1], +m[2].replace(",", ""), f);
    for (const m of t.matchAll(/(\d{1,2},\d{3}|\d{4,5})[- ]?(?:ft|foot|')\s+((?:[A-Z][a-z'.-]+ ){1,3}(?:Pass|Col|Saddle|Notch|Gap|Lake|Tarn|Meadows?))/g)) put(m[2], +m[1].replace(",", ""), f);
  }
  for (const [k, vs] of Object.entries(places)) {
    const lo = Math.min(...vs.map(x => x.v)), hi = Math.max(...vs.map(x => x.v));
    if (hi - lo >= 300) add(r, "place-elevation", `${k}: ${vs.map(x => `${x.v}@${x.src}`).join(", ")}`, [...new Set(vs.map(x => x.src))]);
  }

  // L. rope length: column vs the rope every kit field names
  const rl = num(r.rope_length_m);
  if (rl) {
    for (const f of ["gear", "detailed_rack", "what_to_bring", "rope_note"]) {
      const ms = [...str(r[f]).matchAll(/\b(30|35|37|40|50|60|70|80)\s*-?\s*m(?:eter|etre)?s?\b\s*(?:single |dynamic |twin |half |double )?(?:rope|line)/gi)].map(m => +m[1]);
      if (ms.length && !ms.includes(rl)) add(r, "rope-length", `rope_length_m ${rl} vs ${f} names ${ms.join("/")} m rope`, ["rope_length_m", f]);
    }
  }

  // M. glacier / avalanche claims that the rest of the row refutes
  const sh = r.seasonal_hazards || {};
  const everything = [r.hazards, r.obj_haz, r.watch_out, r.approach, r.overview, r.beta, r.gear, r.detailed_rack, r.what_to_bring, r.climbing_route].map(str).join(" ").toLowerCase();
  if (/^n\/?a|no glacier|none/i.test(str(sh.crevasses)) && /\bcrevasse|glacier travel|crevasse rescue|rope up on the glacier|roped glacier/.test(everything))
    add(r, "glacier-claim", `seasonal_hazards.crevasses "${str(sh.crevasses).slice(0, 60)}" but row mentions crevasses/glacier travel`, ["seasonal_hazards", "hazards/gear/approach"]);
  if (sh.avalanche && /^n\/?a/i.test(str(sh.avalanche.zone)) && /avalanche/.test(str(r.hazards) + str(r.obj_haz) + str(r.watch_out).toLowerCase()))
    add(r, "avalanche-claim", `seasonal_hazards.avalanche.zone "${str(sh.avalanche.zone).slice(0, 50)}" but hazards list avalanche`, ["seasonal_hazards", "hazards"]);

  // N. first ascent year: `fa` vs overview
  const faY = str(r.fa).match(/\b(18|19|20)\d\d\b/);
  if (faY) {
    const m = str(r.overview).match(/first (?:climbed|ascent|ascended|done|made)[^.]{0,80}?\b((?:18|19|20)\d\d)\b/i);
    if (m && m[1] !== faY[0] && !/peak|summit|mountain|first ascent of the (?:peak|mountain)/i.test(m[0])) add(r, "fa-year", `fa "${r.fa}" vs overview "${m[0].slice(0, 90)}"`, ["fa", "overview"]);
  }

  // O. multi-day: itinerary days vs timing total vs "day" language in overview
  if (it && it.length === 1 && tm && num(tm.totalHrs) > 24) add(r, "days-vs-hours", `itinerary is 1 day but timing.totalHrs ${tm.totalHrs}`, ["itinerary", "timing"]);
}

const byCheck = {};
for (const f of findings) byCheck[f.check] = (byCheck[f.check] || 0) + 1;
console.log("findings", findings.length, "routes", new Set(findings.map(f => f.id)).size, byCheck);
fs.writeFileSync(`${T}/findings.json`, JSON.stringify(findings, null, 1));

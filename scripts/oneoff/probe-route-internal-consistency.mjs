// Ask a route whether it CONTRADICTS ITSELF -- no network, no gazetteer, no agent.
//
// WHY IT EXISTS. The WA field-accuracy audit's research phase needs subagents and an API that is
// answering; when the API is down (four consecutive 529s on batch 96), the audit stops. But a large
// share of this catalog's real defects need no external source at all, because the row already holds
// two records of one fact. Every finding this prints is decided from inside the row.
//
// WHAT IT ASKS, and each one has produced a real finding:
//   1. ROPE vs RAPPEL. A rope doubled through an anchor reaches HALF its length, so a stored rope
//      that cannot reach a station the same row describes is a rope-off-the-end claim. It reads
//      rappel_detail stations AND rope lengths named in seven prose fields -- the prose half matters,
//      because wa_luahna_peak_east_slopes states its 20-30 m rappel only in descent_text and was
//      therefore invisible to the station-based sweep.
//   2. GAIN vs THE ROW'S OWN PINS. A party standing on the summit has gained at least summit minus
//      trailhead. gain_ft holds THREE conventions in this catalog -- whole outing, approach-only
//      (credit pitches x 35 m, the app's own default), and the CLIMB's own height (equal to length_m
//      or the pitch_detail sum) -- so a figure is only impossible when it fails all three.
//   3. FABRICATED PINS. A surveyed coordinate is written to 4-6 decimals; 12+ is the residue of
//      dividing a segment into equal parts. Also reports pins stacked at one coordinate, and pins
//      sitting on the first->last chord.
//   4. SHARED ROUTE PROSE. Two rows carrying the same sentence is one claim counted twice, or
//      contamination. Cross-peak sharing is the serious form.
//
// A KNOWN FALSE POSITIVE IT WILL NOT CHASE: a row that discusses a MARGINAL rope honestly trips the
// arithmetic every time. wa_mount_cruiser_south_corner reads "a 50m rope has been used but is tight
// on the longer stretches ... bring 60m if you have the choice" -- correct, useful, and indis-
// tinguishable from "a 50m rope is sufficient" to any length-comparing check. Detecting the hedge
// means a phrase list, and this repo records repeatedly that such a list is beaten by one more
// adjective. Better to keep the flag and read the row than to build a classifier that goes quiet on
// the case it cannot parse.
//
// WHAT IT CANNOT DO, stated rather than implied. It never says a value is RIGHT -- only that nothing
// in the row refuses it. "Clears its floor" is not "verified"; that needs a published record.
//
// TWO TRAPS IT ENCODES, both met while writing it:
//   * NULL IS NOT ZERO. Number(null) is 0, so a null rope column prints as "0m" and a row storing
//     nothing looks like a row storing an impossible rope. The 12,215 km waypoint finding this repo
//     records is the same coercion; my first run reproduced it.
//   * A TWO-TRAILHEAD PEAK IS NOT A CLASH. Lundin's two trailhead pins sit 2,081 m apart and BOTH are
//     correct (PCT-North at I-90 Exit 52, and Alpental Road). Read a pin disagreement before acting.
//
//   node scripts/oneoff/probe-route-internal-consistency.mjs <route_id> [route_id ...]
//
import { selectAll } from "../lib/supabase-env.mjs";

const IDS = process.argv.slice(2).filter(a => !a.startsWith("--"));
if (!IDS.length) { console.error("usage: probe-route-internal-consistency.mjs <route_id> [route_id ...]"); process.exit(2); }

const rows = await selectAll("routes",
  "id,area_id,name,grade,grade_num,rock_grade,alpine_grade,pitches,length_m,gain_ft,loss_ft,dist_km,high_point_ft,aspect,face,season,rope_length_m,rope_type,rappels,rappel_count_note,rappel_detail,gear,rack,detailed_rack,what_to_bring,rope_note,descent_text,overview,beta,climbing_route,pitch_detail,waypoints,gpx,approach,approach_logistics,access,permit,emergency",
  `id=in.(${IDS.join(",")})`, { pageSize: 20 });
const areas = await selectAll("areas", "id,name,path", "", { pageSize: 1000 });
const A = new Map(areas.map(a => [a.id, a]));
const order = new Map(IDS.map((id, i) => [id, i]));
rows.sort((a, b) => order.get(a.id) - order.get(b.id));

const txt = v => Array.isArray(v) ? v.join(" | ") : (typeof v === "string" ? v : "");
const SENTS = s => String(s || "").split(/(?<=[.;])\s+/);
const el = w => { const e = Number(w.elev ?? w.elevFt ?? w.elev_ft); return Number.isFinite(e) && e > 0 ? e : null; };
const rad = x => x * Math.PI / 180;
const km = (a, b) => { const R = 6371, dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const dp = n => { const s = String(n); const i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };

// FAIL CLOSED. Every assertion below is of the form "nothing in the row refuses this", which is
// exactly what a probe that read no rows prints. A short read is a broken probe, never a clean row.
if (rows.length !== IDS.length) {
  console.error(`READ SHORT: asked for ${IDS.length} route(s), got ${rows.length}. Missing: ` +
    IDS.filter(id => !rows.some(r => r.id === id)).join(", "));
  process.exit(1);
}
console.log(`rows: ${rows.length}\n`);

for (const r of rows) {
  console.log(`\n================ ${r.id}   (${A.get(r.area_id)?.name})`);

  // --- 1. ROPE vs RAPPEL ---------------------------------------------------
  const ropes = new Set();
  const ropeSrc = new Map();
  // A DISTANCE IS NOT A ROPE JUST BECAUSE THE WORD "rope" IS NEARBY, and reading one as the other
  // is how this probe first MISSED the defect it was written around. wa_luahna_peak_east_slopes says
  // "a short single-rope rappel (one rappel, roughly 20-30m/60-90ft)": the words "single-rope" sit
  // within 25 characters of "30m", so a proximity rule filed a RAPPEL LENGTH in the rope set -- which
  // then made the smallest "rope" 20 m and would have manufactured shortfalls on other rows too.
  // Proximity is not scope, the trap this repo already records for check:fire.
  //
  // So a distance matching BOTH vocabularies is AMBIGUOUS. It is scored as a rappel length (the
  // governing noun in every observed case) and kept OUT of the rope set entirely: a shortfall must
  // never be computed from a number whose meaning is in doubt, in either direction.
  const RANGE = /\b(\d{2})\s*[-–]\s*(\d{2})\s*m\b/g;
  const ROPE = /\b(\d{2})\s*m\b[^.;|]{0,25}\brope\b|\brope\b[^.;|]{0,25}\b(\d{2})\s*m\b|\b(\d{2})\s*m\s+(?:single|double|dynamic|twin|half)\b/gi;
  const RAP = /\brappel\w*\b[^.;|]{0,40}?\b(\d{2})\s*(?:[-–]\s*(\d{2})\s*)?m\b|\b(\d{2})\s*(?:[-–]\s*(\d{2})\s*)?m\b[^.;|]{0,40}?\brappel\w*\b/gi;
  const proseRaps = new Set(), rapSrc = new Map(), ambiguous = new Set();
  for (const k of ["gear", "rack", "detailed_rack", "what_to_bring", "rope_note", "rappel_count_note", "rappels", "descent_text"]) {
    const s = txt(r[k]); if (!s) continue;
    const ok = n => Number.isFinite(n) && n >= 10 && n <= 90;
    const hitsR = new Set(), hitsP = new Set();
    for (const m of s.matchAll(ROPE)) { const n = Number(m[1] || m[2] || m[3]); if (ok(n)) hitsR.add(n); }
    for (const m of s.matchAll(RANGE)) { for (const n of [Number(m[1]), Number(m[2])]) if (ok(n)) hitsR.add(n); }
    // RULE 3 -- A KIT FIELD NAMES A ROPE; ONLY A DESCENT FIELD NAMES A RAPPEL. gear, rack,
    // detailed_rack, what_to_bring and rope_note answer "what do I carry", so a length in one of them
    // is the rope even when the sentence goes on to say what the rope is for ("30 m rope for the
    // rappel"). Reading those as rappel distances put wa_castle_peak_tatoosh_southeast_face and
    // wa_andersons_thumb_standard on the shortfall list, both wrongly -- and a rope-vs-rope
    // disagreement, which Anderson's Thumb really has, is a different and milder finding.
    // Luahna's real defect is untouched by this: it states its 20-30 m rappel in descent_text.
    const DESCENT_FIELD = k === "descent_text" || k === "rappels" || k === "rappel_count_note";
    // RULE 5 -- "60m ROPE" IS A ROPE WHEREVER IT IS WRITTEN, INCLUDING IN A DESCENT SENTENCE. This
    // was the single largest source of false findings and it produced SIX of eight on a hand-read
    // sample: a descent field routinely prescribes the rope beside the rappel it is for --
    // "rappel the Chockstone Route (60m rope)", "a single rappel with a 70m rope", "a 60m rope
    // doubled gives about 30m per side". Rule 3 excused kit fields; these are descent fields saying
    // the same thing. The measured effect is not subtle: wa_icy_peak_southwest_route does the
    // doubling arithmetic correctly IN ITS OWN PROSE and was reported as contradicting itself.
    //
    // The mask is deliberately narrow -- the number must be DIRECTLY followed by the rope noun, so
    // "a roughly 60-meter rappel" (wa_big_four_mountain_dry_creek_route, a real finding) and
    // "a single-rope rappel ... roughly 20-30m" (wa_luahna_peak_east_slopes, a real finding) both
    // survive untouched. Widening it to any sentence mentioning a rope would delete both.
    // The rope noun is often ELIDED after its adjective -- "bring a 60m single" (wa_northwest_ridge)
    // means a 60 m single ROPE. Those adjectives describe a rope and never a rappel, so they mask
    // the number on their own.
    const ROPE_NOUN = /\b(\d{2})\s*(?:m|-?\s?met(?:er|re)s?)\.?\s+(?:(?:single|double|dynamic|twin|half|static|glacier|dry[- ]treated)\s+)*ropes?\b|\b(\d{2})\s*(?:m|-?\s?met(?:er|re)s?)\.?\s+(?:single|double|twin|half|dynamic|static)\b/gi;
    let descentTxt = s;
    for (const m of s.matchAll(ROPE_NOUN)) {
      const n = Number(m[1] || m[2]);
      if (ok(n) && n >= 20) { hitsR.add(n); }
      descentTxt = descentTxt.replace(m[0], " ".repeat(m[0].length));   // it cannot also be a rappel
    }
    // RULE 6 -- A ROW STATING ZERO RAPPELS HAS NO RAPPEL TO REACH. wa_kyes_peak_glaciated_scramble
    // stores rappels "0" and a walk-off descent, and was still flagged because a rope length elsewhere
    // in its prose got read as a distance. This is structural, unlike widening the denial regex --
    // a phrase list is beaten by one more adjective ("not A rappel descent" defeated the existing one).
    const ZERO_RAPS = String(r.rappels ?? "").trim() === "0";
    if (DESCENT_FIELD && !ZERO_RAPS) for (const m of descentTxt.matchAll(RAP)) for (const n of [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])]) if (ok(n)) hitsP.add(n);
    for (const n of hitsP) { proseRaps.add(n); if (!rapSrc.has(n)) rapSrc.set(n, []); if (!rapSrc.get(n).includes(k)) rapSrc.get(n).push(k); }
    for (const n of hitsR) {
      if (hitsP.has(n)) { ambiguous.add(n); continue; }          // a rappel distance, not a rope
      if (n < 20) continue;                                       // no rope this short is kit
      ropes.add(n); if (!ropeSrc.has(n)) ropeSrc.set(n, []); if (!ropeSrc.get(n).includes(k)) ropeSrc.get(n).push(k);
    }
  }
  for (const n of ambiguous) ropes.delete(n);
  // NULL IS NOT ZERO. Number(null) is 0, so a null rope column reads as "0m" and a row that stores
  // nothing looks like a row storing an impossible rope. This repo already records that coercion
  // trap from a 12,215 km waypoint finding; my first run of this scan reproduced it.
  const hasCol = r.rope_length_m !== null && r.rope_length_m !== undefined;
  const col = hasCol ? Number(r.rope_length_m) : NaN;
  const stations = Array.isArray(r.rappel_detail) ? r.rappel_detail.map(d => Number(d && d.lengthM)).filter(Number.isFinite) : [];
  const twoRope = /two ropes|double[- ]rope|2\s*x\s*\d{2}|joined|twin/i.test([txt(r.descent_text), txt(r.rappel_count_note), txt(r.rope_note), txt(r.gear), txt(r.detailed_rack)].join(" | "));
  // THE DESCENT MAY DENY ITS OWN RAPPEL. "there is no rappelling on this route" makes every length
  // above moot, and flagging a shortfall there is a false alarm -- a negation is not a claim, the
  // failure this audit has now met four separate times.
  const denies = /\bno (?:rappel|rappelling|technical rope)|\bnot? rappel|without rappelling|downclimb(?:ed|ing)? (?:the )?entire/i
    .test([txt(r.descent_text), txt(r.rappel_count_note)].join(" | "));
  // TWO RULES THAT TOOK THIS FROM 19 FINDINGS IN 150 TO A LIST WORTH READING. Both are about which
  // record wins, not about tuning a threshold to a wanted answer.
  //
  // RULE 1 -- A STATION TABLE OUTRANKS PROSE. rappel_detail is a structured, per-station record; a
  // number scraped out of a sentence is a guess about what that sentence meant. wa_beckey_davis is
  // the proof: its stations are 30,30,30,30,30,30 m -- exactly what a 60 m rope doubled gives -- while
  // the prose "60m" this probe first read as a RAPPEL is plainly the ROPE. Trusting the prose there
  // manufactured a shortfall against a rappel the row does not have.
  //
  // RULE 2 -- A NUMBER EQUAL TO rope_length_m IS THE ROPE. The column is an unambiguous rope record,
  // so a prose figure matching it is that same rope restated far more often than a coincidentally
  // equal rappel. This is what "single 60m rope" in a descent sentence almost always is.
  if (Number.isFinite(col)) {
    proseRaps.delete(col); ambiguous.delete(col); rapSrc.delete(col);
    ropes.add(col);
    if (!ropeSrc.has(col)) ropeSrc.set(col, []);
    if (!ropeSrc.get(col).includes("column")) ropeSrc.get(col).push("column");
  }
  // The display below must describe the state the verdict is computed from, or the probe reports
  // one thing and decides on another.
  const allRopes = [...ropes].concat(Number.isFinite(col) ? [col] : []);
  console.log(`  ROPE  column=${Number.isFinite(col) ? col + "m" : "NULL"}  type=${JSON.stringify(r.rope_type)}  rappels=${JSON.stringify(String(r.rappels ?? "").slice(0, 44))}`);
  console.log(`        ropes named in prose: ${ropes.size ? [...ropes].sort((a, b) => a - b).map(n => `${n}m(${ropeSrc.get(n).join(",")})`).join("  ") : "(none)"}${ambiguous.size ? `   [${[...ambiguous].sort((a, b) => a - b).join("/")}m read as RAPPEL length, not rope]` : ""}`);
  console.log(`        rappels: stations ${stations.length ? stations.join(", ") + "m" : "(none)"}   prose ${proseRaps.size ? [...proseRaps].sort((a, b) => a - b).map(n => `${n}m(${rapSrc.get(n).join(",")})`).join("  ") : "(none)"}   ${denies ? "ROW DENIES RAPPELLING" : (allRopes.length ? (twoRope ? "TWO-ROPE" : "SINGLE-rope") : "n/a")}`);
  // The longest thing that must be reached, from EITHER record. Prose counts: Luahna states its
  // 20-30 m rappel only in descent_text, which is exactly why the station-based sweep could not see it.
  const need = stations.length ? stations : [...proseRaps];
  if (denies) {
    // nothing to reach; the row says so itself
  } else if (need.length && allRopes.length) {
    // RULE 4 -- WHEN THE COLUMN IS SET, IT IS THE ROUTE'S ROPE. Taking min() over every length the
    // prose mentions treats a HYPOTHETICAL as a prescription: wa_boston_peak_southeast_face stores a
    // 60 m rope and its rope_note adds "even a 50m rope would work", so min() planned the descent on
    // a rope the route does not recommend and reported a 5 m shortfall on a row whose own arithmetic
    // is correct and spelled out. A false alarm on a well-written row is how a checker gets ignored.
    const smallest = Number.isFinite(col) ? col : Math.min(...allRopes);
    const reach = twoRope ? smallest : smallest / 2;
    const bad = need.filter(x => reach < x - 1);
    if (bad.length) console.log(`  !! ROPE SHORTFALL: smallest rope ${smallest}m ${twoRope ? "joined" : "doubled"} reaches ${reach}m against ${bad.sort((a, b) => a - b).join(", ")}m`);
    else console.log(`        ok: smallest rope ${smallest}m ${twoRope ? "joined" : "doubled"} reaches ${reach}m, clears every rappel named`);
  } else if (need.length && ambiguous.size) {
    // NOT SILENCE. Every rope this row names is a number the prose also uses as a rappel distance, so
    // the arithmetic has no unambiguous input -- and printing nothing here reads exactly like a row
    // that was checked and found fine. wa_lundin_peak_west_ridge ("a 30 m single-rope length") and
    // wa_klawatti_peak_southeast_face are both this shape, and both hold a real rope finding that a
    // silent run would bury. Say it, and read the row.
    console.log(`  ?? CANNOT DECIDE: no unambiguous rope -- ${[...ambiguous].sort((a, b) => a - b).join("/")}m is used by this row's own prose as BOTH a rope and a rappel distance. Read the row; do not read this as a pass.`);
  } else if (need.length) {
    console.log(`  ?? CANNOT DECIDE: the row names a ${need.sort((a, b) => a - b).join("/")}m rappel and NO rope anywhere (column NULL, prose silent).`);
  }
  if (Number.isFinite(col) && ropes.size && !ropes.has(col)) console.log(`  !! rope_length_m ${col}m is named by NO prose field (prose says ${[...ropes].join("/")}m)`);

  // --- 2. GAIN vs the row's own pins ---------------------------------------
  const wps = r.waypoints || [];
  const th = wps.filter(w => /trailhead/i.test(String(w.type || "") + String(w.name || ""))).map(el).filter(Boolean);
  const su = wps.filter(w => /summit/i.test(String(w.type || "") + String(w.name || ""))).map(el).filter(Boolean);
  const g = Number(r.gain_ft);
  if (th.length && su.length && Number.isFinite(g)) {
    const rise = Math.max(...su) - Math.min(...th);
    const climb = Number(r.pitches) > 0 ? Number(r.pitches) * 35 * 3.28084 : 0;
    const lenFt = Number(r.length_m) ? Number(r.length_m) * 3.28084 : 0;
    const pdFt = Array.isArray(r.pitch_detail) ? r.pitch_detail.reduce((a, d) => a + (Number(d && d.lengthM) || 0), 0) * 3.28084 : 0;
    const isClimbHeight = [lenFt, pdFt].some(v => v > 0 && Math.abs(g - v) / v <= 0.03);
    const okWhole = g >= rise - 300, okApproach = g >= rise - climb - 300;
    console.log(`  GAIN  ${g} ft   pins demand ${Math.round(rise)} (whole) / ${Math.round(rise - climb)} (approach-only, ${r.pitches || 0} pitches)`);
    if (isClimbHeight) console.log(`        = the CLIMB's height (length_m ${Math.round(lenFt)} / pitch sum ${Math.round(pdFt)}) — a third legitimate convention`);
    else if (okWhole) console.log(`        ok: clears the whole-outing floor`);
    else if (okApproach) console.log(`        ok: clears the approach-only floor (uses the other convention)`);
    else console.log(`  !! GAIN IMPOSSIBLE under either convention`);
  }

  // --- 3. interpolated / stacked pins --------------------------------------
  const placed = wps.filter(w => Number.isFinite(Number(w.lat)) && Number.isFinite(Number(w.lng)));
  const longTail = placed.filter(w => dp(w.lat) >= 12 || dp(w.lng) >= 12);
  if (longTail.length) console.log(`  !! ${longTail.length} pin(s) with 12+ decimal places (interpolation residue): ${longTail.map(w => String(w.name || "").slice(0, 30)).join(" | ")}`);
  const at = new Map();
  placed.forEach(w => { const k = `${Number(w.lat).toFixed(5)},${Number(w.lng).toFixed(5)}`; if (!at.has(k)) at.set(k, []); at.get(k).push(w); });
  for (const [k, l] of at) if (l.length > 1) {
    const es = [...new Set(l.map(el).filter(Boolean))];
    console.log(`  ${es.length > 1 ? "!!" : "  "} ${l.length} pins stacked at ${k}: ${l.map(w => `"${String(w.name || "").slice(0, 26)}"@${el(w)}`).join(" | ")}${es.length > 1 ? "   <- two elevations at one point" : ""}`);
  }
  // chord test: does a pin sit at an exact fraction along first->last?
  if (placed.length >= 3) {
    const a0 = [Number(placed[0].lat), Number(placed[0].lng)], a1 = [Number(placed[placed.length - 1].lat), Number(placed[placed.length - 1].lng)];
    const onChord = [];
    for (let i = 1; i < placed.length - 1; i++) {
      const p = [Number(placed[i].lat), Number(placed[i].lng)];
      const t = (p[0] - a0[0]) / ((a1[0] - a0[0]) || 1e-12);
      const proj = [a0[0] + t * (a1[0] - a0[0]), a0[1] + t * (a1[1] - a0[1])];
      const off = km(p, proj) * 1000;
      if (t > 0 && t < 1 && off < 15) onChord.push(`${String(placed[i].name || "").slice(0, 24)} (t=${t.toFixed(3)}, ${off.toFixed(1)}m off)`);
    }
    if (onChord.length >= 2) console.log(`  !! ${onChord.length} intermediate pin(s) lie ON the first->last chord: ${onChord.join(" | ")}`);
  }

  // --- 4. permit self-contradiction ----------------------------------------
  const acc = r.access || {};
  const fields = [["permit(col)", r.permit], ...Object.entries(acc)];
  const FREE = /\bfree(?:\s+(?:self[- ]issued?|wilderness(?:\/\w+)?|backcountry(?:\/\w+)?|day[- ]use|overnight|camping|NPS|park))*\s+permits?\b|\bpermits?\b\s+(?:is|are)\s+free\b/i;
  const PRICED = /\$\s?\d+[^.;]{0,70}\b(?:permit|backcountry|wilderness|camping|reservation)/i;
  const PARKING = /northwest forest pass|america the beautiful|interagency|discover pass|per vehicle|parking|entrance fee/i;
  const DENY = /\bno\s+(?:day[- ]use\s+|wilderness\s+|climbing\s+)?permits?\s+(?:is|are)?\s*(?:required|needed)/i;
  const REQ = /(?:wilderness|backcountry|climbing|day[- ]use|self[- ]issued?)\s+permits?[^.;]{0,60}\b(?:required|needed|must)/i;
  const freeHits = [], pricedHits = [], denyHits = [], reqHits = [];
  for (const [k, v0] of fields) {
    const v = txt(v0); if (!v) continue;
    for (const s of SENTS(v)) {
      if (FREE.test(s) && !PARKING.test(s)) freeHits.push([k, s.trim()]);
      if (PRICED.test(s) && !PARKING.test(s) && !FREE.test(s)) pricedHits.push([k, s.trim()]);
      if (DENY.test(s)) denyHits.push([k, s.trim()]);
      if (REQ.test(s) && !DENY.test(s)) reqHits.push([k, s.trim()]);
    }
  }
  if (freeHits.length && pricedHits.length) console.log(`  !! PERMIT free vs priced:\n       FREE   ${freeHits[0][0]}: ${JSON.stringify(freeHits[0][1].slice(0, 110))}\n       PRICED ${pricedHits[0][0]}: ${JSON.stringify(pricedHits[0][1].slice(0, 110))}`);
  if (denyHits.length && reqHits.length) {
    const dScope = s => /\bday\b/i.test(s) && !/overnight|per night|camping/i.test(s) ? "day" : /overnight|camping|per night/i.test(s) && !/\bday\b/i.test(s) ? "night" : "both";
    for (const d of denyHits) for (const q of reqHits) {
      const sd = dScope(d[1]), sq = dScope(q[1]);
      if (sd !== sq && sd !== "both" && sq !== "both") continue;
      console.log(`  !! PERMIT denied and required at the same scope (${sd}/${sq}):\n       DENY ${d[0]}: ${JSON.stringify(d[1].slice(0, 110))}\n       REQ  ${q[0]}: ${JSON.stringify(q[1].slice(0, 110))}`);
      break;
    }
  }
  const FIVEDAY = /\(\s*5[- ]day\s*\)/i, ANNUAL82 = /\$\s?82[^.;]{0,30}\b(?:annual|per year|\/year)|annual climbing pass/i;
  for (const [k, v0] of fields) {
    const v = txt(v0); if (!v) continue;
    if (FIVEDAY.test(v)) console.log(`  !! ${k}: claims a 5-day Northwest Forest Pass (the $5 product is a DAY pass)`);
    if (ANNUAL82.test(v)) console.log(`  !! ${k}: calls the Rainier $82 fee annual (it is per climb)`);
  }
}

// --- 5. same-peak agreement + prose contamination --------------------------
console.log(`\n\n================ SAME-PEAK AGREEMENT`);
const byArea = new Map();
for (const r of rows) { if (!byArea.has(r.area_id)) byArea.set(r.area_id, []); byArea.get(r.area_id).push(r); }
for (const [aid, list] of byArea) {
  if (list.length < 2) continue;
  console.log(`\n  ${A.get(aid)?.name}  (${list.map(r => r.id.replace(/^wa_/, "")).join(", ")})`);
  for (const k of ["high_point_ft"]) {
    const vals = list.map(r => r[k]);
    console.log(`     ${new Set(vals.map(v => JSON.stringify(v))).size === 1 ? "agree " : "CLASH "} ${k}: ${vals.join(" / ")}`);
  }
  for (const [label, re] of [["summit", /summit/i], ["trailhead", /trailhead/i]]) {
    const pins = list.map(r => (r.waypoints || []).filter(w => re.test(String(w.type || "") + String(w.name || "")) && Number.isFinite(Number(w.lat)))[0]);
    if (pins.some(p => !p)) { console.log(`     (a row has no ${label} pin)`); continue; }
    let maxd = 0;
    for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) maxd = Math.max(maxd, km([+pins[i].lat, +pins[i].lng], [+pins[j].lat, +pins[j].lng]) * 1000);
    const es = [...new Set(pins.map(el).filter(Boolean))];
    console.log(`     ${maxd < 60 ? "agree " : "CLASH "} ${label} pin: max separation ${maxd.toFixed(0)} m; elevations ${es.join(" / ")}`);
  }
}
console.log(`\n================ ROUTE-PROSE CONTAMINATION (sentences >60 chars, all pairs)`);
const bag = rows.map(r => {
  const m = new Map();
  for (const k of ["overview", "beta", "climbing_route", "descent_text"]) {
    const v = r[k]; if (typeof v !== "string") continue;
    for (const s of SENTS(v)) { const n = s.trim().toLowerCase().replace(/\s+/g, " "); if (n.length > 60) m.set(n, k); }
  }
  return [r.id, r.area_id, m];
});
let shared = 0;
for (let i = 0; i < bag.length; i++) for (let j = i + 1; j < bag.length; j++) {
  for (const [s, k] of bag[i][2]) {
    if (!bag[j][2].has(s)) continue;
    shared++;
    const samePeak = bag[i][1] === bag[j][1];
    console.log(`  ${samePeak ? "same-peak" : "CROSS-PEAK"}  ${bag[i][0].replace(/^wa_/, "")}.${k} <-> ${bag[j][0].replace(/^wa_/, "")}.${bag[j][2].get(s)}`);
    console.log(`     ${JSON.stringify(s.slice(0, 150))}`);
  }
}
console.log(`\ntotal shared route-prose sentences: ${shared}`);

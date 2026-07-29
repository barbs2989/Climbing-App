// Audit whether the hazard prose already on WA alpine routes covers the terrain
// hazards their zone implies.
//
// This is the inverse of the enrichment migrations (0044/0045/0059), which tried to
// WRITE zone hazards onto routes. All 616 WA alpine/mountaineering/ice/mixed routes
// already have routes.hazards populated, so writing more only appends redundancy.
// What nobody checked is whether the prose that IS there warns about the things that
// kill people in that terrain — a glacier route whose hazards never say "crevasse".
//
// Read-only. Prints a report and writes a JSON gap list; touches no route data.
//
// Zones come from the retired 0059 migration, whose area-name scoping was checked
// against live data. Matching is on areas.name, never routes.name — route names are
// the line ("North Ridge"), the peak lives on the area. Zones additionally require
// area_type='peak', because otherwise "Shuksan Crag" and "Cutthroat Wall" (bolted
// crags that merely share a name with the peak) get judged as glacier routes.

import { selectAll } from "./lib/supabase-env.mjs";

const DISCIPLINES = ["alpine", "mountaineering", "ice", "mixed"];

// A concept counts as covered if ANY pattern appears anywhere in the route's hazard
// prose. Patterns are deliberately generous: the question is "does this write-up warn
// about this at all", not "does it use our vocabulary".
const CONCEPT = {
  crevasse:   { label: "crevasse / snow bridge", re: /crevass|snow ?bridge|schrund|bergschrund|moat/i },
  ice_hazard: { label: "icefall / serac",        re: /icefall|ice ?fall|serac|séracs?|hanging glacier|ice ?cliff|ice ?block/i },
  // "loose rock" is not enough on its own: real entries say "loose/dirty rock",
  // "loose scree", "loose blocks". Allow filler between "loose" and the noun, and
  // accept scree/talus/blocks as the same warning.
  rock:       { label: "rockfall / loose rock",  re: /rock ?fall|falling rock|stonefall|loose[\w\s/,-]{0,14}(rock|block|scree|talus|choss)|choss|friable|rotten rock|crumbl|unstable rock|rock ?debris|scree|talus/i },
  remote:     { label: "remoteness / rescue",    re: /remote|self-?rescue|rescue|no cell|\bsar\b|evacuat|days? from|help/i },
  descent:    { label: "descent / retreat",      re: /descent|descend|rappel|down ?climb|retreat|getting down|traverse off/i },
  water:      { label: "river / creek crossing", re: /river cross|ford|creek cross|stream cross|high water|snowmelt runoff/i },
  // Soft concepts: reported as aggregate context only. Their absence is not a defect —
  // hazard prose reasonably focuses on terrain rather than on weather or altitude, and
  // WA summits are low enough that altitude is rarely the limiting factor.
  routefinding: { label: "routefinding / whiteout", re: /route ?find|routefinding|whiteout|white-?out|navigat|visibility|cairn|lost/i, soft: true },
  weather:      { label: "weather / storms",        re: /storm|thunderstorm|lightning|weather|wind|cold|hypotherm|freez/i, soft: true },
  altitude:     { label: "altitude",                re: /altitude|acclimat|thin air|hypox/i, soft: true },
};

const ZONES = [
  // St. Helens is deliberately NOT here. It lost its glaciers in 1980, and its climbing
  // routes (Worm Flows, Monitor Ridge) cross snowfields and volcanic rubble, not glacier
  // — expecting a crevasse warning there would manufacture a gap. Its real hazards are
  // rockfall and weather exposure, covered by the volcanic-nonglaciated zone below.
  { key: "glaciated-volcano", label: "Glaciated volcanoes",
    areas: ["rainier", "baker", "adams", "glacier peak"],
    core: ["crevasse", "ice_hazard", "rock"], soft: ["routefinding", "weather", "altitude"] },
  { key: "volcanic-nonglaciated", label: "Non-glaciated volcanoes (St. Helens)",
    areas: ["st. helens"],
    core: ["rock"], soft: ["weather", "routefinding"] },
  { key: "nc-glaciated", label: "North Cascades glaciated peaks",
    areas: ["shuksan", "forbidden", "boston", "sahale", "eldorado", "dome peak", "buckner", "challenger"],
    core: ["crevasse", "rock", "remote"], soft: ["routefinding", "weather"] },
  { key: "stuart-enchantments", label: "Stuart Range / Enchantments",
    areas: ["stuart", "dragontail", "colchuck", "argonaut", "sherpa", "ingalls", "prusik"],
    core: ["rock", "descent"], soft: ["routefinding", "weather"] },
  { key: "wa-pass-spires", label: "Washington Pass spires",
    areas: ["liberty bell", "early winters", "burgundy", "silver star", "cutthroat", "kangaroo"],
    core: ["rock", "descent"], soft: ["routefinding", "weather"] },
  // `water` is context, not core, here: the zone spans both deep-interior peaks with
  // real Hoh/Dosewallips fords and roadside ones like Ellinor and Mount Washington,
  // where demanding a river-crossing warning would manufacture gaps.
  { key: "olympics", label: "Olympics",
    areas: ["olympus", "constance", "anderson", "ellinor", "mount washington"],
    core: ["remote", "rock"], soft: ["routefinding", "water"] },
];

// An entry that describes the terrain rather than warning about anything — the kind of
// value that makes a route look covered when it isn't. "mixed snow/ice/rock" is a real
// example from Forbidden Peak's NW Face.
//
// Keyword matching alone was useless here: it flagged "creek crossing" and "confirm
// bolt/anchor condition", which are genuine warnings, while a vocabulary wide enough to
// admit those also admits "mixed snow/ice/rock". The distinction isn't which words
// appear, it's whether the sentence expresses RISK or merely states a CONDITION. So an
// entry passes if it either frames a consequence (a modal, or an instruction to the
// climber) or names a hazard outright.
const RISK_FRAMING = /\b(can|could|may|might|will|would|risk|hazard|danger|caution|beware|watch|careful|confirm|verify|expect|assess|avoid|prepare|prepared|committing|serious|fatal|death|died|kill|injur|difficult|hard to|no|minimal|limited|unreliable|unmaintained|off-?trail|retreat|bail|escape|unknown|unverified|obscure|rarely|lightly)\b/i;
const HAZARD_NOUN = /rock ?fall|avalanch|crevass|serac|icefall|cornice|lightning|hypotherm|rattlesnake|ticks?\b|poison|moat|bergschrund|whiteout|storm|slick|slip|loose|rotten|friable|choss|scree|talus|fractur|runout|run-?out|benight|headlamp|rescue|remote|expos|\bfall\b|poor rock|accident|consequence|unanchored|wander off/i;
const warnsAboutSomething = e => RISK_FRAMING.test(e) || HAZARD_NOUN.test(e);

const norm = s => String(s || "").toLowerCase();

async function main() {
  // Fetch by primary-key RANGE, not `id=like.wa_*`. A LIKE prefix can't use the id
  // btree under this collation, so every page full-scanned the 205k-row table and the
  // query died with a statement timeout. Ids beginning "wa_" are exactly those >= 'wa_'
  // and < 'wa`' ('`' is the byte after '_'). Discipline is filtered client-side for the
  // same reason — it isn't indexed either.
  process.stdout.write("fetching WA routes by key range… ");
  const all = await selectAll("routes", "id,name,area_id,discipline,hazards",
    "id=gte.wa_&id=lt.wa%60", { pageSize: 500 });
  const routes = all.filter(r => DISCIPLINES.includes(r.discipline));
  process.stdout.write(`${all.length} WA routes -> ${routes.length} in scope\nfetching areas… `);
  const ids = [...new Set(routes.map(r => r.area_id).filter(Boolean))];
  const areas = await selectAll("areas", "id,name,area_type", `id=in.(${ids.join(",")})`);
  const A = Object.fromEntries(areas.map(a => [a.id, a]));
  process.stdout.write(`${areas.length}\n\n`);

  const gaps = [], zoneStats = [], degenerate = [];
  let zoned = 0;

  // Entries that warn about nothing, across the whole scope — independent of zone.
  for (const r of routes) {
    const entries = (r.hazards || []).filter(Boolean);
    if (!entries.length) continue;
    const noWarning = entries.filter(e => !warnsAboutSomething(e));
    if (noWarning.length === entries.length) {
      degenerate.push({ id: r.id, name: r.name, area: (A[r.area_id] || {}).name, entries });
    }
  }

  for (const z of ZONES) {
    const inZone = routes.filter(r => {
      const a = A[r.area_id];
      return a && a.area_type === "peak" && z.areas.some(p => norm(a.name).includes(p));
    });
    zoned += inZone.length;
    const miss = {}, softMiss = {};
    [...z.core, ...z.soft].forEach(c => { (z.core.includes(c) ? miss : softMiss)[c] = 0; });
    let clean = 0;

    for (const r of inZone) {
      const prose = (r.hazards || []).join("  ");
      const missing = z.core.filter(c => !CONCEPT[c].re.test(prose));
      z.soft.forEach(c => { if (!CONCEPT[c].re.test(prose)) softMiss[c]++; });
      missing.forEach(c => miss[c]++);
      if (missing.length) {
        gaps.push({ zone: z.key, zoneLabel: z.label, id: r.id, name: r.name,
          area: (A[r.area_id] || {}).name, missing,
          missingLabels: missing.map(c => CONCEPT[c].label),
          entries: (r.hazards || []).length, sample: (r.hazards || [])[0] || "" });
      } else clean++;
    }
    zoneStats.push({ zone: z.label, key: z.key, routes: inZone.length, clean, miss, softMiss });
  }

  const line = c => console.log(c.repeat(78));
  line("=");
  console.log("HAZARD PROSE COVERAGE — WA alpine / mountaineering / ice / mixed");
  line("=");
  console.log(`in scope ${routes.length}   in a named zone ${zoned}   outside these zones ${routes.length - zoned}`);
  console.log(`(every route in scope already has hazard prose; this asks whether it covers the terrain)\n`);

  for (const z of zoneStats) {
    if (!z.routes) { console.log(`${z.zone}: no peak areas matched\n`); continue; }
    const bad = z.routes - z.clean;
    console.log(`${z.zone} — ${z.routes} routes | ${z.clean} cover every core hazard | ${bad} with a gap`);
    const m = Object.entries(z.miss).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    if (!m.length) console.log("   core: all covered");
    else m.forEach(([c, n]) => console.log(`   core gap  ${String(n).padStart(3)}/${z.routes}  no mention of ${CONCEPT[c].label}`));
    const s = Object.entries(z.softMiss).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    s.forEach(([c, n]) => console.log(`   context   ${String(n).padStart(3)}/${z.routes}  no mention of ${CONCEPT[c].label}`));
    console.log("");
  }

  line("-");
  console.log(`CORE GAPS: ${gaps.length} routes (worst first)`);
  line("-");
  const ranked = [...gaps].sort((a, b) => b.missing.length - a.missing.length || a.id.localeCompare(b.id));
  ranked.slice(0, 25).forEach(g => {
    console.log(`${g.id}   [${g.zoneLabel}]`);
    console.log(`   ${g.area} — ${g.name}   (${g.entries} entr${g.entries === 1 ? "y" : "ies"})`);
    console.log(`   no mention of: ${g.missingLabels.join("; ")}`);
    console.log(`   first entry: ${g.sample.slice(0, 92)}${g.sample.length > 92 ? "…" : ""}`);
  });
  if (ranked.length > 25) console.log(`\n… ${ranked.length - 25} more in the JSON`);

  line("-");
  console.log(`ENTRIES THAT WARN ABOUT NOTHING: ${degenerate.length} routes`);
  console.log("(hazard entries that read as terrain description, so the route looks covered but isn't)");
  line("-");
  degenerate.slice(0, 20).forEach(d => {
    console.log(`${d.id}  —  ${d.area} / ${d.name}`);
    d.entries.slice(0, 3).forEach(e => console.log(`     "${e.slice(0, 88)}${e.length > 88 ? "…" : ""}"`));
  });
  if (degenerate.length > 20) console.log(`… ${degenerate.length - 20} more in the JSON`);

  const fs = await import("fs");
  fs.writeFileSync(new URL("../research/phase3/hazard-coverage-audit.json", import.meta.url),
    JSON.stringify({ generated: "2026-07-29", scope: { inScope: routes.length, zoned },
      zones: zoneStats, coreGaps: ranked, warnsAboutNothing: degenerate }, null, 1));
  console.log(`\nwrote research/phase3/hazard-coverage-audit.json`);
}

main().catch(e => { console.error(e); process.exit(1); });

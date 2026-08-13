// What terrain does THIS route actually cross?
//
// The safety panels, the "watch out for" list and the packing checklist were all keyed on
// nothing but `catOf(route)`. So Southwest Rib on South Early Winters Spire — seven pitches
// of dry summer granite, rack of cams and stoppers, whose own row records
// `crevasses: "N/A - no glacier travel"` — was told to check the avalanche forecast, and its
// packing list assumed an ice axe and crampons. Every alpine route got the same advice, and
// every mountaineering route was additionally handed a glacier/crevasse kit.
//
// The answer has to come from the route's own data. Three-valued on purpose: "no" is only
// returned on positive evidence of absence, because the failure directions are not
// symmetric. Wrongly dropping a crevasse warning from a glaciated route is dangerous;
// wrongly keeping one on a rock route is merely noise. Absent evidence therefore stays
// "unknown" and the advice is kept — see `conditional()` for how callers soften it.

const NEG_GLACIER = /\bnon-?\s*glaciat(?:ed|ion)\b|\bno\s+glacier(?:\s+travel)?\b|\bnot\s+glaciat(?:ed)\b|\bglacier[- ]free\b|\bno\s+crevasse/i;

// "snow bridge" is glacier evidence, so it is matched here and excluded from the snow set
// below by ordering, not by a lookahead — a bridge implies the crevasse it spans.
const GLACIER_RE = /\bglacier|glaciat(?:ed|ion)|crevasse|s[eé]racs?|icefall|bergschrund|schrund|snow\s*bridge|rope\s*team|picket\b/i;
// `couloir` is deliberately NOT here. It is a landform, not a snow report: Southwest Rib on
// South Early Winters Spire — a dry summer rock climb whose own row says "N/A - no glacier
// travel" — matched only because its beta names the adjacent "SW Couloir" as a landmark.
// Rockfall couloirs are dry most of the season. `snow` on its own already catches the real
// cases ("snow couloir", "the couloir holds snow into July").
const SNOW_RE = /\bsnowfield|\bsnow\s|\bsnowy|n[ée]v[ée]|\bfirn\b|cornice|ice\s*axe|crampon|self[- ]arrest|posthol|glissad|snowpack|\bavalanche|\bavy\b|\bwhippet\b/i;
const AVY_RE = /\bavalanche|\bavy\b|cornice|snowpack|wind\s*slab|freeze[- ]thaw\s+history|\bnwac\b/i;

// A YDS free grade plus rock protection and no snow/ice anywhere is a rock climb, whatever
// the catalog calls its discipline. Deliberately conservative: both halves are required.
const YDS_RE = /^5\.\d/;
const ROCK_PRO_RE = /\bcams?\b|camalot|\bnuts?\b|stoppers?|\bhexe?s?\b|tricam|quickdraw|\bdraws?\b|\brack\b|offwidth|\bcrack\b/i;

const str = v => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(str).join("  ");
  if (typeof v === "object") return Object.values(v).map(str).join("  ");
  return String(v);
};

// Every field that could mention snow or ice. Kept wide on purpose: a false "yes" only
// preserves the status quo, while a missed mention could suppress a real warning.
// `timing`, `itinerary`, `road` and `climate` are excluded above, and that exclusion is
// load-bearing. They carry calendar and access logistics, which mention winter as a matter
// of course: Southwest Rib on South Early Winters Spire kept its ice axe and crampons purely
// because its itinerary notes that Highway 20 "closes with the first heavy snow". That is a
// fact about a road in November, not about a dry-rock climb in July.
function corpus(r) {
  if (!r) return "";
  return [r.name, r.description, r.overview, r.beta, r.hazards, r.objHaz, r.obj_haz,
    r.watchOut, r.watch_out, r.gear, r.rack, r.detailedRack, r.detailed_rack,
    r.whatToBring, r.what_to_bring, r.proNeeds, r.pro_needs, r.assumedGear, r.assumed_gear,
    r.approach, r.descent, r.descentText, r.descent_text, r.bail, r.turnaround,
    r.pitchDetail, r.pitch_detail, r.seasonalGuidance, r.seasonal_guidance,
    r.proTips, r.pro_tips, r.features, r.difficulty,
  ].map(str).join("  ");
}

function seasonalBlock(r) {
  return (r && (r.seasonalHazards || r.seasonal_hazards)) || null;
}

// "N/A - no glacier travel" is a positive statement of absence; an empty field is not.
export function saysNotApplicable(v) {
  const s = str(v).trim();
  if (!s) return false;
  return /^\s*(n\/a|na\b|none\b|not applicable)/i.test(s) || NEG_GLACIER.test(s);
}

export function routeTerrain(route) {
  const r = route || {};
  const disc = String(r.discipline || "").toLowerCase();
  const sh = seasonalBlock(r);
  const text = corpus(r);
  // Strip the explicit denials before looking for evidence, or "non-glaciated summer rock
  // route" reads as glacier evidence on the strength of the word it is denying.
  const clean = text.replace(NEG_GLACIER, " ");

  const explicitNoGlacier = !!sh && (saysNotApplicable(sh.crevasses) || saysNotApplicable(sh.glacier));
  const explicitNoAvy = !!sh && !!sh.avalanche && saysNotApplicable(sh.avalanche.zone || sh.avalanche);

  const glacierSeen = GLACIER_RE.test(clean);
  const snowSeen = SNOW_RE.test(clean);
  const avySeen = AVY_RE.test(clean);

  const looksLikeRock = YDS_RE.test(String(r.grade || "")) && ROCK_PRO_RE.test(clean)
    && !glacierSeen && !snowSeen;

  // ice and mixed are snow-and-ice disciplines by definition; never infer them dry.
  const frozenDiscipline = disc === "ice" || disc === "mixed";

  // A row can contradict itself, and Forbidden Peak's West Ridge is the case that proves it:
  // seasonal_hazards says "N/A - no glacier travel" while its own approach text describes
  // crossing the Quien Sabe Glacier remnant to a bergschrund, and its rack lists a picket.
  // Resolve a conflict UPWARD to "unknown" rather than trusting the summary field — the
  // whole point of three values is that suppression needs evidence nothing disputes.
  const glacierConflict = explicitNoGlacier && glacierSeen;
  const glacier = glacierConflict ? "unknown"
    : explicitNoGlacier ? "no"
      : glacierSeen ? "yes"
        : looksLikeRock ? "no"
          : (disc === "mountaineering" || disc === "alpine") ? "unknown" : "no";

  const snowConflict = explicitNoAvy && (snowSeen || glacierSeen);
  const snow = frozenDiscipline ? "yes"
    : (snowSeen || glacier === "yes") ? "yes"
      : snowConflict ? "unknown"
        : (looksLikeRock || explicitNoAvy) ? "no"
          : (disc === "mountaineering" || disc === "alpine" || glacier === "unknown") ? "unknown" : "no";

  const avalanche = snowConflict ? "unknown"
    : explicitNoAvy ? "no"
      : avySeen ? "yes"
        : snow === "no" ? "no"
          : snow === "yes" ? "yes" : "unknown";

  return { glacier, snow, avalanche, looksLikeRock,
    // Callers that need to explain themselves; also what the audit script prints.
    evidence: { explicitNoGlacier, explicitNoAvy, glacierSeen, snowSeen, avySeen,
      glacierConflict, snowConflict, disc } };
}

// Does a line of advice depend on terrain this route does not have?
// Returns "drop" | "keep" | "soften".
const GLACIER_ADVICE = /glacier|crevasse|s[eé]rac|icefall|rope\s*team|bergschrund|snow\s*bridge/i;
const SNOW_ADVICE = /avalanche|freeze[- ]thaw|snowpack|cornice|self[- ]arrest|ice\s*axe|crampon|glissad|overnight snow|firm freeze|snow stability|start in the dark|sun-softened/i;

export function adviceFit(line, terrain) {
  const t = terrain || {};
  const s = String(line || "");
  if (GLACIER_ADVICE.test(s)) {
    if (t.glacier === "no") return "drop";
    if (t.glacier === "unknown") return "soften";
    return "keep";
  }
  if (SNOW_ADVICE.test(s)) {
    if (t.snow === "no" && t.avalanche === "no") return "drop";
    if (t.snow === "unknown" || t.avalanche === "unknown") return "soften";
    return "keep";
  }
  return "keep";
}

// Filter an advice list against the route. Anything that survives is either terrain-neutral
// or terrain the route actually has; "soften" lines are kept and reported so the caller can
// label them rather than assert them.
export function fitAdvice(lines, terrain) {
  const kept = [], softened = [];
  (lines || []).forEach(l => {
    const f = adviceFit(l, terrain);
    if (f === "drop") return;
    if (f === "soften") softened.push(l);
    kept.push(l);
  });
  return { lines: kept, softened, dropped: (lines || []).length - kept.length };
}

// Gear the packing checklist should not assume. Same three-valued rule.
const GEAR_TERRAIN = [
  [/ice axe|ice tools?/i, "snow"],
  [/crampon/i, "snow"],
  [/mountaineering boots?|plastic boots?/i, "snow"],
  [/glacier|crevasse/i, "glacier"],
  [/picket|snow anchor/i, "glacier"],
  [/ice screws?/i, "snow"],
];

export function gearFit(item, terrain) {
  const t = terrain || {};
  for (const [re, need] of GEAR_TERRAIN) {
    if (re.test(String(item || ""))) {
      const v = t[need];
      return v === "no" ? "drop" : v === "unknown" ? "soften" : "keep";
    }
  }
  return "keep";
}

export function fitGear(items, terrain) {
  const kept = [], softened = [];
  (items || []).forEach(g => {
    const f = gearFit(g, terrain);
    if (f === "drop") return;
    if (f === "soften") softened.push(g);
    kept.push(g);
  });
  return { items: kept, softened, dropped: (items || []).length - kept.length };
}

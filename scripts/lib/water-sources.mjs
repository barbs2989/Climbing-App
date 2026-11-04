// WHICH WATER SOURCES DOES A ROUTE'S OWN RECORD NAME?  Shared by audit:water-pins (which reports
// the ones with no pin) and scripts/oneoff/add-water-pins.mjs (which pins them), so the two can
// never disagree about what counts as a named source — the camp tools learned that the hard way
// (scripts/lib/camp-names.mjs header).
//
// A SOURCE IS A NAMED FEATURE IN A SENTENCE ABOUT WATER. "Fill bottles at Boulder Creek" names
// one; "drive the Cascade River Road" does not, and neither does "views of Lake Ann". So a feature
// counts only when (1) its sentence is about drinking water and (2) the feature is not the first
// half of a road, trail or campground name. Relative water ("last water below the col", "snowmelt
// at camp") names no place; it is counted as UNNAMED and is never pinned — a coordinate for it
// would be invented (fabricated-waypoint-pins).
import { ident } from "./camp-names.mjs";

// Prose columns a climber reads that talk about water on the way.
export const PROSE_COLS = ["approach", "approach_logistics", "itinerary", "description", "overview", "descent_text"];

// The sentence is about drinking water. "whitewater" and "high water" (a crossing hazard) are not.
const WATER_SENT = /\b(water|refill|refilling|filter|filtering|potable|fill (?:up|bottles|water))\b/i;
const NOT_DRINKING = /\b(white ?water|high water|water ?fall|water ?ice|waterproof|water level|water crossing|water-?worn|water polished|run-?off|water taxi|water-?taxi)\b/i;

// "<Proper> Creek" … and "Lake <Proper>". A capital is required: "the creek" is not a name.
const WORD = "(?:Mc[A-Z][a-z]+|[A-Z][a-z'’]+\\.?|[A-Z]{1,2}\\.?)";
const KIND = "(?:Creek|Lakes?|Tarns?|Springs?|River|Pond|Falls|Brook|Fork)";
const SUFFIX_RE = new RegExp(`\\b((?:${WORD}(?:[ -]${WORD}){0,3}) ${KIND})\\b`, "g");
const PREFIX_RE = new RegExp(`\\b((?:Lake|Tarn) ${WORD}(?: ${WORD})?)\\b`, "g");
// What may follow a feature and make it a DIFFERENT thing: the road, trail or campground named
// after it ("Thunder Creek Trail", "Cascade River Road", "Lake Ann Trailhead").
const AFTER_NOT_WATER = /^\s*(?:Road|Rd\.?|Trail|Trailhead|Highway|Hwy|Campground|Way|Drive|Ranger|Lodge|Resort|Store|Bridge|Basin|Valley|Glacier|Ridge|Pass|Peak|Mountain|Wilderness|Recreation|Sno-?Park|Forest|Divide|Route|Couloir|Gully|Spire|Tower|Wall|Dome|Butte|Cirque|drainage|valley|basin|trail|road)\b/;
// A capitalised sentence-opener is not part of a name ("Fill at Boulder Creek" must not read as
// "Fill Boulder Creek"; "Water at Snow Lake" must not read as "Water Snow Lake").
const OPENERS = new Set(["the", "fill", "refill", "water", "at", "from", "below", "above", "past", "cross", "follow", "reach", "last", "carry", "filter", "no", "there", "beyond", "near", "via", "along", "after", "before", "until", "up", "down", "upper", "lower", "north", "south", "east", "west", "middle", "a", "an", "and", "or", "to", "on", "in", "of", "by", "is", "camp", "this", "that", "it", "its", "if", "when", "drink", "treat", "get", "find", "obtain", "available", "reliable", "seasonal", "plenty", "plan", "note", "bring", "head", "continue", "descend", "ascend", "climb", "hike", "walk", "cross", "ford", "both", "wade", "rock-hop", "hop", "use", "take", "top", "pump"]);

const sentences = (t) => String(t || "").split(/(?<=[.!?;])\s+|\n+/).map((s) => s.trim()).filter(Boolean);

// "North Fork Skykomish River": a compass word in front of Fork is part of the name.
function trimOpeners(name) {
  const toks = name.split(/\s+/);
  while (toks.length > 1 && OPENERS.has(toks[0].toLowerCase()) && !(toks[1] === "Fork" && /^(north|south|east|west|middle)$/i.test(toks[0]))) toks.shift();
  return toks.join(" ");
}
// "Lake Trail", "Lake Road": the prefix form caught the road, not a lake.
const NOT_A_LAKE_NAME = /^(?:Lake|Tarn) (?:Trail|Trailhead|Road|Rd|Highway|Hwy|Campground|Basin|Drive|Way|Area|Shore|Outlet|Inlet)\b|\b(?:Trail|Trailhead|Road|Highway)$/;

/** Every named water feature in a piece of text, with the sentence that names it. `waterOnly`
    false is for bivy[].water, which is about water by construction. */
export function namedFeatures(text, waterOnly = true) {
  const out = [];
  for (const s of sentences(text)) {
    if (waterOnly && (!WATER_SENT.test(s) || NOT_DRINKING.test(s) && !/\b(refill|filter|potable|fill)\b/i.test(s))) continue;
    for (const re of [SUFFIX_RE, PREFIX_RE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(s))) {
        const after = s.slice(m.index + m[1].length);
        if (AFTER_NOT_WATER.test(after)) continue;
        const name = trimOpeners(m[1]);
        if (NOT_A_LAKE_NAME.test(name)) continue;
        // "the South Fork" alone names no particular stream.
        if (/^(?:North|South|East|West|Middle|Upper|Lower) Fork$/.test(name)) continue;
        if (!/\s/.test(name)) continue; // "Creek" alone after trimming is no name
        out.push({ name, sentence: s.length > 220 ? s.slice(0, 217) + "…" : s });
      }
    }
  }
  return out;
}

// A sentence that promises water somewhere without naming it ("snowmelt at camp", "last water
// below the col"). Counted so the denominator is honest; never pinned.
const UNNAMED = /\b(last (?:reliable )?water|water (?:is )?available|running water|refill|snow ?melt|melt(?:ing)? snow|seasonal (?:stream|creek|water)|water source)\b/i;

/** The named water sources a route's own record states, deduplicated by identity, plus whether it
    states water it does not name. */
export function waterSourcesOf(route) {
  const found = new Map();
  const add = (f, where) => {
    const k = ident(f.name);
    if (!k || k.split(" ").length < 2) return;
    if (!found.has(k)) found.set(k, { name: f.name, key: k, where: new Set(), sentence: f.sentence });
    found.get(k).where.add(where);
  };
  let unnamed = false;
  for (const col of PROSE_COLS) {
    const t = route[col];
    if (!t || typeof t !== "string") continue;
    for (const f of namedFeatures(t)) add(f, col);
    if (sentences(t).some((s) => UNNAMED.test(s))) unnamed = true;
  }
  for (const v of Array.isArray(route.approach_variants) ? route.approach_variants : []) {
    for (const k of ["text", "approach", "description", "notes", "logistics"]) if (typeof v?.[k] === "string") for (const f of namedFeatures(v[k])) add(f, "approach_variants");
  }
  for (const b of Array.isArray(route.bivy) ? route.bivy : []) {
    if (!b || typeof b.water !== "string" || !b.water.trim()) continue;
    const named = namedFeatures(b.water, false);
    for (const f of named) add(f, "bivy.water");
    // "from the lake" at a camp named for one: the camp's own feature is the source.
    if (!named.length && /\b(lake|tarn|creek|stream|spring|pond)\b/i.test(b.water) && !/\b(no|dry|none)\b/i.test(b.water)) {
      const own = namedFeatures(String(b.name || ""), false);
      for (const f of own) add({ name: f.name, sentence: `${b.name}: ${b.water}` }, "bivy.water");
      if (!own.length) unnamed = true;
    } else if (!named.length) unnamed = true;
  }
  // A pin's own note that says water is here ("last water", "fill up") marks that pin as a source.
  for (const w of Array.isArray(route.waypoints) ? route.waypoints : []) {
    if (w && typeof w.note === "string") for (const f of namedFeatures(w.note)) add(f, "waypoint note");
  }
  return { sources: [...found.values()].map((s) => ({ ...s, where: [...s.where] })), unnamed };
}

/** The pin that stands for a source: a pin whose name carries the source's identity as whole words
    ("Boulder Creek" in "Boulder Creek crossing"). */
// A trailhead, road end or campground NAMED after a creek is not where you get water from it
// ("Killen Creek Trailhead", "Morrison Creek Campground", "Bear Creek Camp (Chilliwack River
// Trail)"), so those words are cut out of a pin's name before matching, and a Trailhead pin never
// stands for a source.
const NAMED_AFTER = /\b([A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]*)*)\s+(?:Trail|Trailhead|Road|Rd\.?|Campground|Highway|Hwy|Sno-?Park|Road End|Roadhead)\b/g;
export function pinFor(source, pins) {
  const k = ` ${source.key} `;
  // The pin must BE the feature ("Cub Lake", "Copper Creek camp") or a crossing of it ("Glacier Creek
  // ford"). A pin that only mentions it ("Scree scramble to La Bohn Lakes", "Steep push below Marmot
  // Lake") stands somewhere else.
  return pins.find((w) => {
    if (!w || /trailhead|parking/i.test(String(w.type || ""))) return false;
    const raw = String(w.name || "").replace(NAMED_AFTER, " ");
    const id = ` ${ident(raw)} `;
    if (!id.includes(k)) return false;
    return id.startsWith(k) || /\b(crossing|ford|footlog|bridge|outlet|inlet|shore)\b/i.test(raw);
  }) || null;
}

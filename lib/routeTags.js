// Route tags — the controlled vocabulary the route page renders and Challenges/Lists key off.
//
// Three things already existed and were doing a third of this job each, none of them
// reachable by a challenge:
//
//   routes.classic   a boolean, set on 5 of 8,371 WA routes
//   routes.lists     an array, non-empty on 14 WA routes — holding FREE PROSE
//   routes.features  an array, populated on 420 WA routes, already a clean vocabulary
//                    ("Exposed", "Chimney", "Runout", "Arête", "Sustained", "Scenic")
//
// `lists` is the one that was actively broken. Its 14 populated rows hold 13 DISTINCT
// strings for what are really four lists — "Washington Bulger List (100 Highest Peaks in
// Washington)", "Washington Bulgers (100 Highest Peaks) — tied for #51", "Bulger List
// (Washington's 100 highest peaks) - #48" and so on. Meanwhile the Leaderboards badge that
// consumes the column asks `(route.lists||[]).includes("state_hp")` — an exact match on a
// slug that appears NOWHERE in the data. So the "State highpoints" badge could never score,
// and no amount of adding more prose would have made it. A list is only a list if its name
// is a value, not a sentence.
//
// So: prose in, slug out. `listSlug()` is the single place that decides, and the raw prose
// is preserved as the tag's `detail` rather than discarded — "#19" and "tied for #51" are
// real information the slug cannot carry.
//
// The second defect this fixes is a LABEL that outran its data. The badge is titled
// "Fifty Classics" but counts `route.classic`, which on the live data is set on Mount
// Baker's Easton Glacier, Rainier's Kautz and Emmons, and Stuart's Cascadian Couloir —
// popular standard routes, not one of which is in Steck & Roper. The book's Washington
// entries are Liberty Ridge, Forbidden's West Ridge, Shuksan's Price Glacier, Stuart's
// North Ridge and Liberty Crack. `classic` therefore keeps its looser "must-do line"
// meaning and drives the ★ Classic pill; membership of the actual book is the
// `fifty_classics` slug, and the badge now counts that.

// ---------------------------------------------------------------------------
// List membership — objective, checkable facts about a route being on a named list.
// `color` names a key of the C palette so this module stays free of the palette itself.
// ---------------------------------------------------------------------------
export const LIST_TAGS = {
  fifty_classics: {
    label: "Fifty Classic Climbs", short: "50 Classics", icon: "🏛️", color: "amber",
    blurb: "One of the fifty routes in Steck & Roper's Fifty Classic Climbs of North America (1979).",
  },
  bulger: {
    label: "Bulger List", short: "Bulger", icon: "🗻", color: "purple",
    blurb: "One of Washington's 100 highest peaks.",
  },
  wa_top_100: {
    label: "Washington Top 100", short: "WA Top 100", icon: "📈", color: "purple",
    blurb: "Among the 100 highest Washington peaks by elevation.",
  },
  wa_top_200: {
    label: "Washington Top 200", short: "WA Top 200", icon: "📈", color: "purple",
    blurb: "Among the ~200 highest Washington peaks with 400+ ft of prominence.",
  },
  wa_prominence: {
    label: "Prominence master list", short: "Prominence", icon: "📐", color: "teal",
    blurb: "On a clean-prominence list of Washington peaks.",
  },
  wa_difficult_10: {
    label: "Washington's Difficult 10", short: "Difficult 10", icon: "⚠️", color: "red",
    blurb: "One of the ten hardest summits in Washington to reach.",
  },
  state_hp: {
    label: "State highpoint", short: "State HP", icon: "🇺🇸", color: "green",
    blurb: "The highest point in its state.",
  },
  volcano: {
    label: "Cascade volcano", short: "Volcano", icon: "🌋", color: "orange",
    blurb: "A glaciated Cascade stratovolcano.",
  },
};

// Prose → slug. Order matters: the most specific pattern must win, so "Washington Top 200"
// is tested before "Top 100" and "Bulger" before the generic elevation lists it overlaps.
const LIST_PATTERNS = [
  [/fifty\s+classic|50\s+classic/i, "fifty_classics"],
  [/difficult\s*10|hardest\s+peaks/i, "wa_difficult_10"],
  [/top\s*200|extra\s*110/i, "wa_top_200"],
  [/bulger/i, "bulger"],
  [/prominence/i, "wa_prominence"],
  [/top\s*100/i, "wa_top_100"],
  [/state\s*high\s*point|highpoint\s+of\s+the\s+state/i, "state_hp"],
  [/volcano/i, "volcano"],
];

// A rank is real information the slug cannot carry ("#19", "tied for #51", "ranked #93").
const RANK_RE = /(?:ranked\s*|tied\s+for\s*)?#\s*(\d+)/i;

// Returns { slug, detail } or null. A value that is ALREADY a slug passes straight through,
// so this is idempotent and safe to run over data it has already normalised.
export function listSlug(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (Object.prototype.hasOwnProperty.call(LIST_TAGS, s)) return { slug: s, detail: "" };
  for (const [re, slug] of LIST_PATTERNS) {
    if (re.test(s)) {
      const m = s.match(RANK_RE);
      return { slug, detail: m ? (/tied/i.test(s) ? `tied #${m[1]}` : `#${m[1]}`) : "" };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Character tags — what the climbing is LIKE. These already live in routes.features
// with a settled vocabulary; this only supplies presentation for them.
// ---------------------------------------------------------------------------
export const FEATURE_TAGS = {
  Exposed: { icon: "🪂", color: "red", blurb: "Big drops right beside the climbing." },
  Runout: { icon: "〰️", color: "red", blurb: "Long gaps between protection." },
  Committing: { icon: "🔒", color: "red", blurb: "Retreat is hard once you start." },
  Sustained: { icon: "📊", color: "amber", blurb: "Holds its grade rather than one hard move." },
  Adventurous: { icon: "🧭", color: "amber", blurb: "Route-finding and the unknown are part of it." },
  Chimney: { icon: "🪟", color: "blue", blurb: "Chimney or squeeze climbing." },
  "Arête": { icon: "📐", color: "blue", blurb: "Climbs an arête or ridge crest." },
  Scenic: { icon: "🏔️", color: "green", blurb: "Climbed as much for the position as the moves." },
};

// ---------------------------------------------------------------------------
// Derived tags — true by virtue of other columns, so they can never go stale against them.
// Kept deliberately few: a tag that restates a number already on screen earns nothing.
// ---------------------------------------------------------------------------
const RAPTOR_RE = /raptor|nesting\s+closure|nesting\s+season|peregrine|eagle|falcon|vulture/i;

function haystack(route) {
  const bits = [route.season, route.access && (route.access.seasonal || route.access.closures || route.access.rules),
    route.permit, route.beta, route.overview];
  const arr = [].concat(route.hazards || [], route.objHaz || route.obj_haz || [], route.watchOut || route.watch_out || []);
  return [...bits, ...arr].filter(x => typeof x === "string").join(" ");
}

export function derivedTags(route) {
  if (!route) return [];
  const out = [];
  if (RAPTOR_RE.test(haystack(route))) {
    out.push({ kind: "derived", slug: "raptor_closure", label: "Raptor closure", short: "Raptor closure",
      icon: "🦅", color: "red", blurb: "Seasonal wildlife closure — check dates before you go." });
  }
  const g = route.glacier || (typeof route.approach === "string" && /glacier/i.test(route.approach));
  if (g && /glacier/i.test(haystack(route) + " " + (route.approach || ""))) {
    out.push({ kind: "derived", slug: "glaciated", label: "Glacier travel", short: "Glaciated",
      icon: "🧊", color: "blue", blurb: "Crosses a glacier — rope, crevasse rescue kit and partners." });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The one entry point the UI uses. Returns a flat, de-duplicated, ordered tag list.
// Order is deliberate: list membership first (it is why someone is here), then what the
// climbing is like, then the derived warnings.
// ---------------------------------------------------------------------------
export function routeTags(route) {
  if (!route) return [];
  const out = [];
  const seen = new Set();
  const push = t => { if (t && !seen.has(t.slug)) { seen.add(t.slug); out.push(t); } };

  const raw = route.lists || route.listsRaw || [];
  for (const entry of Array.isArray(raw) ? raw : [raw]) {
    const hit = listSlug(entry);
    if (!hit) continue;
    const def = LIST_TAGS[hit.slug];
    if (def) push({ kind: "list", slug: hit.slug, detail: hit.detail, ...def });
  }

  if (route.classic) {
    push({ kind: "list", slug: "classic", label: "Classic", short: "Classic", icon: "★", color: "amber",
      blurb: "A must-do line — one of the routes the area is known for." });
  }

  for (const f of (Array.isArray(route.features) ? route.features : [])) {
    const def = FEATURE_TAGS[f];
    push({ kind: "feature", slug: f, label: f, short: f, icon: def?.icon || "•",
      color: def?.color || "textSub", blurb: def?.blurb || "" });
  }

  for (const d of derivedTags(route)) push(d);
  return out;
}

// Challenges and Lists ask this rather than reaching into the columns, so a challenge
// keyed on "bulger" keeps working when the prose behind it changes again.
export function hasTag(route, slug) {
  return routeTags(route).some(t => t.slug === slug);
}

// What a climb is made of: one vocabulary for the route page, the contribute form, the conditions
// score and scripts/derive-area-rock.mjs (which classifies mapped bedrock with these patterns).
//
// The SPECIFIC rock is what a climber reads ("granodiorite", "dolomite", "welded tuff"). FAMILY is
// what the conditions score uses for how long a wall takes to dry. Each entry is
// [rock, pattern, family]; scripts/lib/mapped-rock.mjs explains the matching order.
export const ROCKS = [
  // crystalline intrusive
  ["monzogranite", /monzogranit/i, "granite"],
  ["granodiorite", /granodiorit/i, "granite"],
  ["quartz monzonite", /quartz monzonit/i, "granite"],
  ["monzonite", /monzonit/i, "granite"],
  ["tonalite", /tonalit/i, "granite"],
  ["quartz diorite", /quartz diorit/i, "granite"],
  ["diorite", /diorit/i, "granite"],
  ["syenite", /syenit/i, "granite"],
  ["pegmatite", /pegmatit/i, "granite"],
  ["gabbro", /gabbro/i, "granite"],
  ["norite", /\bnorite/i, "granite"],
  ["anorthosite", /anorthosit/i, "granite"],
  ["granite", /granit|batholith|plutonic/i, "granite"],
  // sedimentary
  ["quartzite", /quartzite/i, "quartzite"],
  ["conglomerate", /conglomerate/i, "sandstone"],
  ["breccia", /breccia/i, "sandstone"],
  ["arkose", /arkose/i, "sandstone"],
  ["greywacke", /greywacke|graywacke/i, "sandstone"],
  ["sandstone", /sandstone/i, "sandstone"],
  ["dolomite", /dolomite|dolostone/i, "limestone"],
  ["travertine", /travertine/i, "limestone"],
  ["chert", /\bchert/i, "quartzite"],
  ["limestone", /limestone|carbonate/i, "limestone"],
  ["shale", /shale/i, "shale"],
  ["mudstone", /mudstone|claystone/i, "shale"],
  ["siltstone", /siltstone/i, "shale"],
  ["argillite", /argillite/i, "shale"],
  // volcanic
  ["welded tuff", /welded tuff|ignimbrite/i, "volcanic"],
  ["tuff", /tuff|pyroclastic/i, "volcanic"],
  ["rhyolite", /rhyolit/i, "volcanic"],
  ["dacite", /dacit/i, "volcanic"],
  ["latite", /\blatit/i, "volcanic"],
  ["trachyte", /trachyt/i, "volcanic"],
  ["andesite", /andesit/i, "volcanic"],
  ["felsite", /felsite/i, "volcanic"],
  ["basalt", /basalt|traprock/i, "basalt"],
  ["diabase", /diabase|dolerite/i, "basalt"],
  ["volcanic rock", /volcanic/i, "volcanic"],
  // metamorphic
  ["marble", /marble/i, "limestone"],
  ["gneiss", /gneiss/i, "metamorphic"],
  ["migmatite", /migmatit/i, "metamorphic"],
  ["schist", /schist/i, "metamorphic"],
  ["phyllite", /phyllit/i, "metamorphic"],
  ["slate", /\bslate/i, "shale"],
  ["amphibolite", /amphibolit/i, "metamorphic"],
  ["hornfels", /hornfels/i, "metamorphic"],
  ["serpentinite", /serpentin/i, "metamorphic"],
  ["greenstone", /greenstone/i, "metamorphic"],
  ["metasedimentary rock", /metasediment|metaturbidite/i, "metamorphic"],
  ["metavolcanic rock", /metavolcanic/i, "metamorphic"],
  ["metamorphic rock", /metamorphic/i, "metamorphic"],
];
export const FAMILY = Object.fromEntries(ROCKS.map(function (e) { return [e[0], e[2]]; }));

// Every rock named in `text`, in the order the text names them. At one position the LONGER name
// wins ("quartz monzonite" over "monzonite"), and a shorter name inside a longer one already taken
// ("diorite" inside "granodiorite") is the same word, not a second rock.
export function rocksIn(text) {
  const hits = [];
  for (const [rock, re] of ROCKS) { const m = re.exec(text || ""); if (m) hits.push([m.index, m[0].length, rock]); }
  hits.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
  const out = [], spans = [];
  for (const [i, len, rock] of hits) {
    if (spans.some(function (s) { return i >= s[0] && i + len <= s[1]; })) continue;
    spans.push([i, i + len]); out.push(rock);
  }
  return out;
}

// A free-text rock ("Granite", "soft sandstone", "volcanic tuff") -> its family, or null.
export function rockFamily(text) {
  const r = rocksIn(text)[0];
  return r ? FAMILY[r] : null;
}

/* HOW LONG A WALL OF THIS FAMILY TAKES TO DRY after rain, in hours of no further rain, used by the
   conditions score. These are rules of thumb, not measurements, and the score's own note says
   which family it assumed. Sandstone is the long one on purpose: wet sandstone is weak and holds
   break, so the convention is to wait. Unknown rock uses the middle value. */
export const DRY_HOURS = { granite: 24, quartzite: 24, basalt: 24, limestone: 24, metamorphic: 30, volcanic: 36, sandstone: 48, shale: 48 };
export const DRY_HOURS_UNKNOWN = 36;

const cap = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };

/* The rock a route is on, and how the app knows it:
     basis 'route'  — the route itself states it (routes.rock, or a seed route's rockType);
           'stated' — its area's own routes state it (areas.rock_basis='stated');
           'mapped' — the mapped bedrock at the crag (areas.rock_basis='mapped'). Agrees with what
                      routes state about 4 times in 5 (81% on rock family, 215 areas), so every
                      reader must SAY it is mapped.
   -> { rock, label, family, basis } or null. */
export function routeRock(route) {
  if (!route) return null;
  const own = route.rock || route.rockType;
  if (own && String(own).trim()) { const t = String(own).trim(); return { rock: t, label: cap(t), family: rockFamily(t), basis: "route" }; }
  const a = route._dbArea;
  if (a && a.rock) return { rock: a.rock, label: cap(a.rock), family: rockFamily(a.rock), basis: a.rockBasis === "mapped" ? "mapped" : "stated" };
  return null;
}

// The rocks offered on the contribute form: every specific rock, as a climber writes it.
export const ROCK_OPTIONS = ROCKS.map(function (e) { return cap(e[0]); });

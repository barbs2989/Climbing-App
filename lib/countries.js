// The catalog's top level is a COUNTRY (areas with no parent), and every picker that lets a
// climber find a climb starts there, so a Canadian province is never listed between two US
// states. Shared by the Climbs tab (DbAreaBrowser), the add-a-climb area picker and the
// list / log-a-climb route picker, so the three cannot drift.
//
// The subdivision noun differs by country and there is no column that carries it — Canadian
// provinces are stored with area_type "state" like everywhere else. Named explicitly rather
// than inferred, with a neutral fallback so a third country reads sensibly on the day it
// lands instead of calling Bavaria a state.
export const SUBDIVISION = { usa: "state", canada: "province or territory" };
export const subdivisionNoun = id => SUBDIVISION[id] || "region";

// A country's name for when the `areas` read of the countries is not available (offline: a
// download stores a state and its descendants, never the country above it). The live row's
// name wins whenever there is one.
const COUNTRY_NAME = { usa: "United States", canada: "Canada" };
export const countryName = (id, rows) => {
  const r = (rows || []).find(c => c.id === id);
  return (r && r.name) || COUNTRY_NAME[id] || id;
};

// `path` is the materialized ltree and its first label is the root country, so this needs
// no extra query and cannot disagree with the tree.
export const countryOfArea = a => (a && a.path ? String(a.path).split(".")[0] : "");

// What copy calls a list of top-level regions, singular and plural ("Download the states you
// climb most", "Pinned states"). Manage areas and the pinned lists said "state" everywhere while
// listing Alberta and Yukon beside Washington. One country gives its own full noun; several are
// joined short, so the catalog's US + Canada reads "states and provinces", and a third country
// adds its word (or "regions") the day it lands.
const PLURAL = { usa: "states", canada: "provinces and territories" };
const SHORT = { usa: ["state", "states"], canada: ["province", "provinces"] };
export const regionWords = ids => {
  const uniq = [...new Set(ids || [])];
  if (uniq.length <= 1) return uniq.length ? { one: subdivisionNoun(uniq[0]), many: PLURAL[uniq[0]] || "regions" } : { one: "state", many: "states" };
  const w = [...new Set(uniq.map(id => (SHORT[id] || ["region", "regions"]).join("|")))].map(s => s.split("|"));
  const list = (xs, c) => xs.slice(0, -1).join(", ") + " " + c + " " + xs[xs.length - 1];
  return { one: list(w.map(x => x[0]), "or"), many: list(w.map(x => x[1]), "and") };
};

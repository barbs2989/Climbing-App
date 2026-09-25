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

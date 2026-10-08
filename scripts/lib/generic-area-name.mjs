// A GENERIC AREA NAME says WHAT is climbed there, not WHERE: "Bouldering", "Ice Climbing", "Misc",
// "Other Climbs", "Routes", "Boulders, The" — or, one level under a state, "CO Ice & Mixed" and
// "NH Ice and Mixed", which read as just "Ice & Mixed" once you are inside Colorado / New Hampshire.
// Owner, 2026-10-07: "an area will be just called bouldering, ice climbing, mixed, etc. these are too
// generic. The climbs need to be in specific named areas." Discipline is a property of the CLIMB (the
// Climbs tab filters on it); an area is a place.
//
// ONE function decides it, used by the guard (scripts/check-generic-area-names.mjs) and the importer
// (scripts/pipeline/import-route-grades.mjs), which steps THROUGH a generic level of the source's path
// rather than re-creating the bucket this cleanup removed.
//
// Deliberately NOT generic:
//   * a name that also names a place — "Smith Rock Bouldering", "Northern AZ Bouldering", "Ouray
//     (Ice/Mixed)": the words beyond the discipline say where. Only a STATE / PROVINCE word is
//     discounted, and only when that state is an ancestor (it is the level the bucket hangs under).
//   * a single feature — "Sport Wall", "Dry Wall", "Top Rock", "Mother Boulder", "The Crag": one wall,
//     rock or boulder, very often its real name. "wall", "rock", "boulder", "crag" are not bucket words.
//   * a name with a number in it — "Boulder 3", "Area 51": the number is the identity.
//   * the ids in scripts/data/generic-area-names-exempt.json, each READ and researched: "The General"
//     at Dedham sits among The Captain, The Colonel, The Major and The Private boulders.
import { stripSortPrefix } from "./area-sort-prefix.mjs";

export const BUCKET_WORDS = new Set((
  "bouldering boulders problems problem climbs climb climbing routes route ice mixed drytooling drytool " +
  "dry tooling alpine sport trad traditional toprope tr top rope roped aid snow mountaineering misc " +
  "miscellaneous other others various general areas crags multipitch multi pitch buildering"
).split(" "));
const STOP = new Set(["the", "and", "of", "in", "at", "on", "a", "n"]);

export const STATE_ABBR = {
  Alabama: "al", Alaska: "ak", Arizona: "az", Arkansas: "ar", California: "ca", Colorado: "co", Connecticut: "ct",
  Delaware: "de", Florida: "fl", Georgia: "ga", Hawaii: "hi", Idaho: "id", Illinois: "il", Indiana: "in", Iowa: "ia",
  Kansas: "ks", Kentucky: "ky", Louisiana: "la", Maine: "me", Maryland: "md", Massachusetts: "ma", Michigan: "mi",
  Minnesota: "mn", Mississippi: "ms", Missouri: "mo", Montana: "mt", Nebraska: "ne", Nevada: "nv",
  "New Hampshire": "nh", "New Jersey": "nj", "New Mexico": "nm", "New York": "ny", "North Carolina": "nc",
  "North Dakota": "nd", Ohio: "oh", Oklahoma: "ok", Oregon: "or", Pennsylvania: "pa", "Rhode Island": "ri",
  "South Carolina": "sc", "South Dakota": "sd", Tennessee: "tn", Texas: "tx", Utah: "ut", Vermont: "vt",
  Virginia: "va", Washington: "wa", "West Virginia": "wv", Wisconsin: "wi", Wyoming: "wy",
  Alberta: "ab", "British Columbia": "bc", Manitoba: "mb", "New Brunswick": "nb", "Newfoundland and Labrador": "nl",
  "Nova Scotia": "ns", Ontario: "on", Quebec: "qc", Saskatchewan: "sk", Yukon: "yt",
};

const words = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);

// The source's "Z.3 Ice Climbing" / "Z.1 Buildering" (Illinois) is a sort label stripSortPrefix keeps.
const name0 = s => stripSortPrefix(s).replace(/^[A-Za-z]\.\d{1,2}\s+/, "");

// ancestorNames: the area's ancestors' names, any order. Returns null, or why the name is generic.
export function genericAreaName(name, ancestorNames = []) {
  const t = words(name0(name));
  if (!t.length || t.some(w => /\d/.test(w))) return null;
  const content = t.filter(w => !STOP.has(w));
  if (!content.length) return null;
  if (content.every(w => BUCKET_WORDS.has(w))) return "only discipline / bucket words";
  // The state counts only WHOLE — its full name or its abbreviation: "North Boulders" under North
  // Dakota names the north end of Sentinel Butte, not the state.
  for (const a of ancestorNames) {
    if (!STATE_ABBR[a]) continue;
    const full = " " + words(a).join(" ") + " ";
    const rest = (" " + content.join(" ") + " ").split(full).join(" ").split(" ").filter(w => w && w !== STATE_ABBR[a]);
    if (rest.length && rest.length < content.length && rest.every(w => BUCKET_WORDS.has(w))) return "only discipline words beside the state it sits in";
  }
  return null;
}

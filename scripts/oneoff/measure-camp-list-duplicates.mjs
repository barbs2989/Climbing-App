// HOW OFTEN DOES ONE ROUTE'S CAMPING LIST NAME ONE PLACE TWICE? Read-only.
// The LOOSE census below (any two sites, token subset, a missing height allowed) found 78 routes /
// 89 pairs on 2026-10-22 and is mostly noise — "Eldorado East Ridge rock bivies" vs "Eldorado Basin
// camp", Lower vs Middle Blum Lake. `--strict` counts what RouteDetail's samePlaceCamp() now merges:
// a researched site and a Campsite PIN, both with a height within 150 ft, upper/lower kept as words.
// Rebuilds the list CampingPanel draws (bivy minus role:"hidden", plus Campsite pins whose name no
// bivy entry or hidden stub carries) and reports pairs on one route that share every distinctive
// name token (one name's tokens a subset of the other's) at elevations within 150 ft, or where one
// side carries no elevation. Also counts how many sites a multi-day itinerary NAMES by night.
//   node scripts/oneoff/measure-camp-list-duplicates.mjs [--strict] [--pairs]
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
import { distinctiveTokens, placeOf } from "../lib/camp-names.mjs";
const STRICT = process.argv.includes("--strict");
const CAMP_WORDS = new Set(["the","and","of","at","on","to","in","near","below","above","under","beside","basin","camp","camps","campsite","site","sites","bivy","bivies","bivouac","bivouacs","lake","lakes","pass","col","saddle","ridge","creek","glacier","valley","meadow","meadows","summit","peak","high","low","former","trail","end","base","area","mount","mt"]);
const campWords = (n) => new Set(String(n || "").split(/[,(\u2014\u2013]|\s-\s/)[0].toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((t) => t.length > 2 && !CAMP_WORDS.has(t)));

requireServiceKey();
const rows = await selectAll("routes", "id,name,bivy,waypoints,itinerary", "bivy=not.is.null", { pageSize: 200 });
const key = (v) => String(v == null ? "" : v).trim().toLowerCase();
const elevFt = (s) => (s && s.elev != null ? +s.elev : s && s.elevM != null ? s.elevM * 3.28084 : null);
const isCamp = (w) => /^campsite$/i.test(String((w && w.type) || ""));
let routes = 0, withDup = 0, pairs = [], sites = 0, nightRoutes = 0, nightSites = 0, multiDay = 0;
for (const r of rows) {
  const all = Array.isArray(r.bivy) ? r.bivy : [];
  const hidden = new Set(all.filter((b) => b && key(b.role) === "hidden").map((b) => key(b.name)));
  const bivy = all.filter((b) => b && key(b.role) !== "hidden");
  const seen = new Set(bivy.map((b) => key(b.name)));
  const wps = (Array.isArray(r.waypoints) ? r.waypoints : []).filter(isCamp).filter((w) => !seen.has(key(w.name)) && !hidden.has(key(w.name)));
  const list = bivy.map((b) => ({ n: b.name, e: elevFt(b), src: "bivy" })).concat(wps.map((w) => ({ n: w.name, e: elevFt(w), src: "pin" })));
  if (!list.length) continue;
  routes++; sites += list.length;
  let dup = false;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    if (STRICT && list[i].src === list[j].src) continue;
    if (STRICT && (list[i].e == null || list[j].e == null)) continue;
    const a = STRICT ? campWords(list[i].n) : distinctiveTokens(placeOf(list[i].n)), b = STRICT ? campWords(list[j].n) : distinctiveTokens(placeOf(list[j].n));
    if (!a.size || !b.size) continue;
    const [s, l] = a.size <= b.size ? [a, b] : [b, a];
    if (![...s].every((t) => l.has(t))) continue;
    const e1 = list[i].e, e2 = list[j].e;
    if (e1 != null && e2 != null && Math.abs(e1 - e2) > 150) continue;
    dup = true; pairs.push([r.id, list[i].src + ":" + list[i].n + " @" + (e1 == null ? "?" : Math.round(e1)), list[j].src + ":" + list[j].n + " @" + (e2 == null ? "?" : Math.round(e2))]);
  }
  if (dup) withDup++;
  const days = (r.itinerary && Array.isArray(r.itinerary.days)) ? r.itinerary.days : [];
  if (days.length > 1) {
    multiDay++;
    let hit = 0;
    for (const s of list) {
      const p = key(placeOf(s.n)); if (p.length < 4) continue;
      if (days.slice(0, -1).some((d) => (key(d.title) + " | " + key(d.objective)).includes(p))) hit++;
    }
    if (hit) nightRoutes++; nightSites += hit;
  }
}
console.log(`routes with a camping list: ${routes} (${sites} sites)`);
console.log(`routes whose list names one place twice (rule above): ${withDup} — ${pairs.length} pairs`);
console.log(`multi-day itineraries: ${multiDay}; of those, ${nightRoutes} name at least one listed site as a night's stop (${nightSites} sites)`);
if (process.argv.includes("--pairs")) for (const p of pairs) console.log(p.join("  |  "));

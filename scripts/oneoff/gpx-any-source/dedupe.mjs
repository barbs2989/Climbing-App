// Duplicate tests shared by every write stage of the Peakbagger/SummitPost pass (owner, 2026-11-04:
// "for future ones you find and collect make sure there aren't duplicates"). Exact-text checks missed
// the same fact reworded, so a fact is also a duplicate when it shares most of its content words with
// one already stored. `node dedupe.mjs --selftest` needs no database.
import { haversineM } from "../gpx-tracks-fkt/rule.mjs";

const STOP = new Set("about above after again along also another around because before below between both could does down during each from have here into just more most much near only other over same some such than that their them then there these they this those through very well were what when where which while with would your".split(" "));
const norm = s => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const content = s => new Set(norm(s).split(" ").filter(w => w.length >= 4 && !STOP.has(w)));

/** The text of a list item that may be a string or an object ({text}, {name}, ...). */
export const itemText = x => typeof x === "string" ? x : x && typeof x === "object" ? (x.text ?? x.reason ?? x.name ?? x.item ?? x.note ?? JSON.stringify(x)) : String(x ?? "");

/** Two facts are the same when equal once punctuation goes, one holds the other, or they share most of their content words. */
export function sameFact(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if ((na.length >= 25 && nb.includes(na)) || (nb.length >= 25 && na.includes(nb))) return true;
  const A = content(a), B = content(b);
  if (A.size < 4 || B.size < 4) return false;
  let shared = 0; for (const w of A) if (B.has(w)) shared++;
  return shared >= 4 && shared / Math.min(A.size, B.size) >= 0.75;
}

/** Split prose into sentences, so a new fact can be tested against each one already stored. */
export const sentencesOf = s => String(s ?? "").split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);

/** The stored string `text` duplicates, or null. `pool` is any mix of strings, arrays and prose. */
export function duplicateIn(text, pool) {
  for (const p of pool.flat(Infinity)) {
    if (p == null) continue;
    for (const s of typeof p === "string" ? [p, ...sentencesOf(p)] : [itemText(p)]) if (sameFact(text, s)) return s;
  }
  return null;
}

/** Same recorded track: identical points once rounded to ~1 m, at the same length. */
export function sameTrack(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length < 10 || b.length < 10) return false;
  if (Math.abs(a.length - b.length) > Math.max(a.length, b.length) * 0.02) return false;
  const k = p => `${(+p[0]).toFixed(5)},${(+p[1]).toFixed(5)}`;
  const B = new Set(b.map(k)); let hit = 0;
  for (const p of a) if (B.has(k(p))) hit++;
  return hit / a.length >= 0.9;
}

/** A pin stacked on another: same type within 50 m, or the same name within 200 m. */
export function stackedPin(pin, others) {
  if (!Number.isFinite(+pin.lat) || !Number.isFinite(+pin.lng) || pin.lat == null) return null;
  return others.find(o => o !== pin && o.lat != null && o.lng != null && Number.isFinite(+o.lat) && (() => {
    const d = haversineM([+pin.lat, +pin.lng], [+o.lat, +o.lng]);
    return ((o.type || "") === (pin.type || "") && d < 50) || (norm(o.name) && norm(o.name) === norm(pin.name) && d < 200);
  })()) || null;
}

if (process.argv.includes("--selftest")) {
  const t = (c, m) => { if (!c) { console.error("FAIL", m); process.exitCode = 1; } };
  t(sameFact("Carry an ice axe in June: the upper gully holds firm snow.", "In June the upper gully holds firm snow, so carry an ice axe."), "reworded fact");
  t(!sameFact("Carry an ice axe in June: the upper gully holds firm snow.", "Water is scarce above the lake after mid-August."), "different facts");
  t(!sameFact("Bring a helmet.", "Bring a headlamp."), "short items differ");
  t(duplicateIn("The road gate closes in November.", [["Bring microspikes."], "Drive FR 65. The road gate closes in November."]) !== null, "sentence in prose");
  const g = Array.from({ length: 50 }, (_, i) => [47 + i / 1e4, -121 + i / 1e4]);
  t(sameTrack(g, g.map(p => [...p])), "same track"); t(!sameTrack(g, g.map(p => [p[0] + 0.01, p[1]])), "shifted track");
  t(stackedPin({ type: "Trailhead", name: "A", lat: 47, lng: -121 }, [{ type: "Trailhead", name: "B", lat: 47.0001, lng: -121 }]), "stacked trailhead");
  t(!stackedPin({ type: "Trailhead", name: "A", lat: 47, lng: -121 }, [{ type: "Hazard", name: "x", lat: null, lng: null }]), "null pin is not stacked");
  console.log(process.exitCode ? "selftest FAILED" : "selftest ok");
}

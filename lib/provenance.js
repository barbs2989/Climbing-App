/* Per-section provenance — where a section's content came from, not how true it is.
 *
 * WHY THIS SAYS "PROVENANCE" AND NOT "CONFIDENCE". The obvious source for a per-section
 * confidence rating is `data_quality.confidence`, and it cannot carry one: measured over
 * 8,367 WA routes it is 94.0% "MEDIUM", with 58 LOW and 57 HIGH between them (1.4%). A chip
 * driven by it would print "Medium" on every section of nearly every route — a label that
 * reads as a measurement while carrying no information. 89% of the `gaps` arrays are also one
 * identical boilerplate string (8,021 copies of the difficulty-breakdown sentence), so gap
 * count is no better. See scripts/oneoff/probe-dq-distribution.mjs for the measurement.
 *
 * What the table DOES carry per section is how the content was sourced, and that is a
 * genuinely different claim. Three levels, each earned by a signal that exists:
 *
 *   verified  a climber submitted this field and it passed the contribution gate, or
 *             gear_confidence says "verified" for the gear section
 *   auto      the route is auto_generated, or gear_confidence says "inferred"
 *   onfile    enrichment is present and neither of the above applies
 *
 * A section with NO data returns null and gets no chip. That is deliberate: GapNote already
 * owns the empty case with a fix CTA, and a rating on absent data is a dangling label — the
 * "Last verified catch: · 0 partners confirmed" shape. Never render a level for nothing.
 */

export const PROV = {
  verified: { level: "verified", label: "Climber-verified", tone: "good" },
  onfile: { level: "onfile", label: "On file", tone: "neutral" },
  auto: { level: "auto", label: "Auto-generated", tone: "weak" },
};

const nonEmpty = (v) => {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true;
};

/* section -> { has(route), contrib[] }
 *
 * `contrib` lists the CONTRIBUTE-FORM keys (RouteDetail's `FIELDS`), not the route
 * property names — they differ (`rap` writes `rappels`, `descentText` writes `descent`),
 * and the form's key is what the accepted-edit map is keyed by. Keying off the route
 * property instead would silently never match. */
export const SECTIONS = {
  beta: { has: (r) => nonEmpty(r.beta), contrib: ["beta"] },
  approach: { has: (r) => nonEmpty(r.approach), contrib: ["approach"] },
  descentText: { has: (r) => nonEmpty(r.descentText) || nonEmpty(r.descent), contrib: ["descentText"] },
  rappels: { has: (r) => nonEmpty(r.rappels) || nonEmpty(r.rappelDetail), contrib: ["rap"] },
  pitchDetail: { has: (r) => nonEmpty(r.pitchDetail), contrib: ["pitchDetail"] },
  season: { has: (r) => nonEmpty(r.season) || nonEmpty(r.bestSeason), contrib: ["season", "condWindow"] },
  /* The "CLIMATE & SEASON" box is gated on `route.climate`, NOT on `route.season` — measured,
     after a season-keyed chip there rendered nothing. `season` is a different surface (the
     header strap, via seasonShort()); keeping them separate is what stops one section's chip
     silently reporting on another section's data. */
  climate: { has: (r) => nonEmpty(r.climate), contrib: ["condWindow"] },
  /* DECLARED BUT NOT WIRED TO A HEADING, on purpose. #806 shipped a dedicated RACK caption
     for gear built on `gear_confidence` — three states, and deliberately SILENT on the
     verified majority so praise does not rebuild the noise that got two page-level graders
     deleted. That caption is better than a chip here (it has a real per-section verdict
     column to read), so RACK carries it and not this. Kept in the table because
     sectionProvenance("gear") is still the honest answer to "how was this rack sourced",
     and a future surface may want it — but do not add a second label to RACK. */
  gear: { has: (r) => nonEmpty(r.gear) || nonEmpty(r.rack) || nonEmpty(r.gearTiers), contrib: ["rack", "whatToBring", "draws", "screws"] },
  waypoints: { has: (r) => nonEmpty(r.waypoints), contrib: ["waypoints"] },
  gpx: { has: (r) => nonEmpty(r.gpxPts), contrib: [] },
  hazards: { has: (r) => nonEmpty(r.hazards) || nonEmpty(r.objHaz) || nonEmpty(r.watchOut), contrib: ["haz", "objHaz", "watchOut"] },
};

/* Returns one of PROV.*, or null when the section has nothing to rate. */
export function sectionProvenance(route, section) {
  const spec = SECTIONS[section];
  if (!route || !spec) return null;
  if (!spec.has(route)) return null;

  // A climber's accepted edit outranks everything else — they were there.
  // `_rappelsFromContrib` predates the general list and still counts, so an older merge
  // that only set the flag is not silently demoted to "On file".
  const edited = route._contribFields || [];
  const claimed = spec.contrib.some((k) => edited.indexOf(k) !== -1);
  if (claimed || (section === "rappels" && route._rappelsFromContrib)) return PROV.verified;

  if (section === "gear") {
    if (route.gearConfidence === "verified") return PROV.verified;
    if (route.gearConfidence === "inferred") return PROV.auto;
  }

  // `auto_generated` is a whole-route flag, so it can only ever weaken a section that has
  // no stronger signal of its own — checked last for exactly that reason.
  if (route.autoGenerated === true) return PROV.auto;

  return PROV.onfile;
}

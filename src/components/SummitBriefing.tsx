import { useMemo } from "react";
import { DISC_LABELS as DL } from "../../lib/discLabels";
import { gradeNumFrom, topGrade } from "../../lib/grade";
import { effDistKm } from "../../lib/outing";
import { CardHead } from "../../lib/areaBrowserParts.jsx";

// ── SUMMIT BRIEFING: what a peak page knows that its route rows never say ──
//
// Reaching a peak on the alpine/scrambling/mountaineering side of the catalog used to give
// you a name, an elevation and a list of route names. Everything that is true of the
// MOUNTAIN rather than of one line on it — how far the shortest way in is, how many ways up
// there even are — was one tap further in, on a route page.
//
// NO ACCESS & PERMITS BLOCK, by the owner's call (2026-10-04). It used to close this panel
// with Permit / Land manager / Parking rows agreed across the peak's routes; the owner asked
// for it removed from the peak overview. Access stays on each ROUTE page, where it is
// specific to the approach you are actually taking. check:summit-briefing asserts it stays gone.
//
// Everything here comes from `useAreaRoutes`, which the page has already fetched and which
// selects `*` — so this is a new READING of rows already in memory, not a new query, and it
// cannot fail separately from the route list it sits above.
const ALPINE_FAMILY = ["alpine", "mountaineering", "scrambling", "ice", "mixed"];
// Smallest and largest of a numeric column, each with the route it came from.
function numericSpan(routes, pick) {
  const vals = routes.map(r => ({ r, v: Number(pick(r)) })).filter(x => Number.isFinite(x.v) && x.v > 0);
  if (!vals.length) return null;
  vals.sort((a, b) => a.v - b.v);
  return { lo: vals[0], hi: vals[vals.length - 1], said: vals.length, of: routes.length };
}
// Exported so it can be rendered on its own against real catalog rows. Everything it
// claims is a reading of other rows, and the only way to check a reading is to render it
// — the lesson `check:field-renders` is built on.
export default function SummitBriefing({ area, routes, uElev, uDistMi, C }) {
  const rows = useMemo(() => {
    const rs = routes || [];
    if (rs.length < 2) return null;
    // Gate on the disciplines the request named. A sport crag filed as a "peak" gets
    // nothing here: its routes share a base, not a summit, and "shortest approach" and
    // "ways up" are not the questions anyone asks of it.
    const family = rs.filter(r => ALPINE_FAMILY.includes(r.discipline));
    if (family.length * 2 < rs.length) return null;

    const out = [];

    // How many ways up, and of what kind. `discipline` is populated on every catalog row,
    // so this is a count rather than a derivation.
    const byDisc = {};
    rs.forEach(r => { if (r.discipline) byDisc[r.discipline] = (byDisc[r.discipline] || 0) + 1; });
    const discList = Object.entries(byDisc).sort((a, b) => b[1] - a[1]).map(([d, n]) => n + " " + (DL[d] || d).toLowerCase());
    if (discList.length) out.push(["Ways up", discList.length === 1 ? discList[0] + " route" + (rs.length !== 1 ? "s" : "") : rs.length + " routes — " + discList.join(" · "), null]);

    // Hardest rock pitch, from `rock_grade` ONLY.
    //
    // Deliberately NOT from `grade_num`, and this is the trap worth knowing: `gradeNumFrom`
    // falls through to a ROMAN commitment grade (`^(VII|VI|IV|III|II|I|V)`) on the same 0-15
    // scale it uses for YDS and class, so Mount Baker's "III+" and "IV" store as 4 — every
    // one of that peak's nine routes scores as a "class 3-4 scramble". A span computed from
    // that column would read "Class 2 to Class 4" for a mountain whose routes run to Grade
    // IV ice. `rock_grade` is a single scale (YDS plus class), so a span across it means
    // one thing. `lib/grade.js` records that the stored `grade_num` disagrees with itself
    // on 1.9% of rows for the same four-importers reason.
    const gr = numericSpan(rs, r => gradeNumFrom(r.rock_grade, "yds"));
    // Suppressed on a thin minority, because the span then describes the exception rather
    // than the mountain. Mount Baker is the case: 2 of its 9 routes carry a rock grade (a
    // 3rd-class band and a 4th-class step on two glacier climbs), and "3rd class to 4th
    // class" across the top of a page whose other seven routes are Grade II-IV glacier and
    // ice reads as "this is a scramble". A denominator underneath does not undo a headline.
    if (gr && gr.said * 2 >= gr.of) {
      const lo = topGrade(gr.lo.r.rock_grade), hi = topGrade(gr.hi.r.rock_grade);
      out.push(["Rock difficulty", (lo === hi || gr.lo.v === gr.hi.v) ? lo : lo + " to " + hi, gr.said < gr.of ? gr.said + " of " + gr.of + " routes list a rock grade" : null]);
    }

    // Approach and gain vary legitimately by trailhead — Mount Baker's routes run 4.0 km to
    // 25.7 km because they start on opposite sides of the mountain — so this is a range with
    // the short one NAMED, never an average. An average of two trailheads describes neither.
    /* THE SAME EFFECTIVE DISTANCE THE ROUTE PAGE SHOWS, not the raw column. This read `dist_km`
       while RouteDetail has always preferred the route's own itinerary — the sum of its days'
       miles, halved unless the trip is recorded as a loop or point-to-point. Measured over WA:
       of the 543 routes carrying both, 336 differ by more than 15%, and this row moved on 128 of
       the 198 peak pages, almost always by a FACTOR OF TWO, because on those rows `dist_km` holds
       the round trip while the itinerary agrees with half of it. So this panel labelled the whole
       trip "Approach" and the route page for the same climb said half of it — one climb, two
       answers, the #1203 shape across two screens.
       It changes WHICH SOURCE is preferred and never what `dist_km` means: with no itinerary the
       stored column is returned untouched, and CLAUDE.md's rule that this column holds two
       conventions and must not be normalised in bulk is unaffected. */
    const ap = numericSpan(rs, effDistKm);
    if (ap) {
      const mi = km => uDistMi ? uDistMi(km * 0.621371) : (Math.round(km * 10) / 10) + " km";
      out.push(["Approach", ap.lo.v === ap.hi.v ? mi(ap.lo.v) : mi(ap.lo.v) + " to " + mi(ap.hi.v), "Shortest is " + ap.lo.r.name + (ap.said < ap.of ? " · " + ap.said + " of " + ap.of + " routes give a distance" : "")]);
    }
    const gain = numericSpan(rs, r => r.gain_ft);
    if (gain) {
      const e = ft => uElev ? uElev(ft) : Math.round(ft).toLocaleString() + " ft";
      out.push(["Elevation gain", gain.lo.v === gain.hi.v ? e(gain.lo.v) : e(gain.lo.v) + " to " + e(gain.hi.v), gain.said < gain.of ? gain.said + " of " + gain.of + " routes give a figure" : null]);
    }

    // Only worth a row when it says something the hero strap does not already carry.
    const hp = numericSpan(rs, r => r.high_point_ft);
    if (hp && (!area.elevation_ft || Math.abs(hp.hi.v - area.elevation_ft) > 50)) {
      out.push(["High point", uElev ? uElev(hp.hi.v) : Math.round(hp.hi.v).toLocaleString() + " ft", "Highest point reached by a route here"]);
    }
    return out;
  }, [routes, area.elevation_ft, uElev, uDistMi]);

  if (!rows || !rows.length) return null;
  const lbl = { fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 };
  return (
    <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "13px 15px", marginBottom: 14 }}>
      <CardHead C={C} style={{ marginBottom: 10 }}>ACROSS EVERY ROUTE HERE</CardHead>
      {rows.map(([label, value, note]) => (
        <div key={label} style={{ marginBottom: 10 }}>
          <div style={lbl}>{label}</div>
          <div style={{ fontSize: 13.5, color: C.text, fontWeight: 600, marginTop: 3, lineHeight: 1.45 }}>{value}</div>
          {note ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>{note}</div> : null}
        </div>
      ))}
      {/* NOT here, deliberately: a season window. Combining the routes' own `season` strings
          means reading English — and these legitimately wrap the year end ("May-Oct (snow
          climb Dec-Apr)"), so a min-to-max of the months mentioned renders Mount Stuart's
          Cascadian Couloir as "Apr to Dec". The same class of mistake CLAUDE.md records for
          `rappels` and for `season` itself. Season stays on the route, where it belongs. */}
    </div>
  );
}

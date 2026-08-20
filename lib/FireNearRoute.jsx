// "Is anything burning near this climb?" — the per-route half of the Fire map.
//
// Sits at the top of a route's Safety tab, above the float plan and the forecast links —
// a fire that can close an approach road is a hazard, not a description of the climb. (On a
// route with no Safety tab, which is content-gated, RouteDetail keeps it on Overview instead
// rather than dropping it.) The map answers "is the range on fire"; this answers it for one
// objective, which is the question you have once you have picked a line and are deciding
// whether to drive.
//
// Three honesty rules, all of them the difference between useful and dangerous:
//
//   1. **No coordinate means no claim.** A route's position comes from its area
//      (`MOUNTAINS` for the seed catalog, `_dbArea` for the DB one), and `_dbArea` is
//      backfilled asynchronously after openRoute. Until it lands there is no point to
//      measure from, so this renders NOTHING — never "no fires near here", which
//      would be a statement about a place we cannot locate.
//   2. **The distance is to the point of origin, not the near edge.** WFIGS incident
//      geometry is where the fire started. A 138,000-acre fire is ~24km across, so
//      "42 mi" can mean fire ground at 25. The panel says so in words and sends you
//      to the map, which draws real perimeters.
//   3. **A failed fetch is an error, not silence.** Same rule as the map: on a hazard
//      surface, "nothing found" and "we could not look" must never render alike.
//
// Severity follows containment and distance together, because neither alone means
// anything: a 100%-contained fire 5 miles off is smoke, and an uncontained one at 45
// miles is a road-closure risk tomorrow, not today.
import { useFiresNear, NEAR_ROUTE_KM, fireLevel, fireColor, fmtAcres, fmtContained, fmtDiscovered } from "./fire";

const MI_PER_KM = 0.621371;

// Uncontained ground inside this radius is the "change your plans" case.
const CLOSE_MI = 25;

export default function FireNearRoute({ coord, C, ActionIcon, uDistMi = mi => Math.round(mi) + " mi", onOpenFireMap }) {
  const q = useFiresNear(coord, NEAR_ROUTE_KM);

  // Rule 1. No point to measure from → no section at all. An absent section makes no
  // claim; an empty state would.
  if (!coord || !Number.isFinite(coord.lat) || !Number.isFinite(coord.lng)) return null;

  const fires = (q.data && q.data.fires) || [];
  const radiusMi = Math.round(NEAR_ROUTE_KM * MI_PER_KM);
  const wrap = { border: "1px solid " + C.border, background: C.surface, borderRadius: 12, padding: "12px 13px", marginBottom: 14 };
  const hd = { fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: C.textSub, marginBottom: 7 };

  if (q.isLoading) {
    return <div style={wrap}><div style={hd}>Fire &amp; smoke</div><div style={{ fontSize: 12, color: C.textMuted }}>Checking federal fire reports…</div></div>;
  }

  // Rule 3.
  if (q.error) {
    return (
      <div style={{ ...wrap, borderColor: C.amber, background: C.amberBg }}>
        <div style={hd}>Fire &amp; smoke</div>
        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, display: "flex", gap: 8 }}>
          <ActionIcon name="alert" size={15} color={C.amber} />
          <span>
            <b>Couldn&apos;t check for nearby fires.</b>{" "}
            <span style={{ color: C.textSub }}>
              {typeof navigator !== "undefined" && navigator.onLine === false
                ? "You're offline. This check needs a connection — it is not a report that nothing is burning."
                : "The federal service didn't answer. This is not a report that nothing is burning."}
            </span>
            <button onClick={() => q.refetch()} style={{ display: "block", marginTop: 8, padding: "6px 11px", borderRadius: 7, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Try again</button>
          </span>
        </div>
      </div>
    );
  }

  const closeUncontained = fires.filter(f => f.originMi <= CLOSE_MI && fireLevel(f) !== "contained");
  const tone = closeUncontained.length ? { c: C.red, bg: C.redBg } : fires.length ? { c: C.amber, bg: C.amberBg } : null;

  // The genuine empty state: the query succeeded, over a known point, and found none.
  //
  // This renders NOTHING rather than an affirmative "no active wildfires within 50 miles".
  // The panel is an alert, not a status line: on the overwhelming majority of routes,
  // on the overwhelming majority of days, nothing is burning nearby, and a section that
  // appears on every route to say so is noise that trains people to scroll past the one
  // time it says something. It fires only when there is a fire near this climb.
  //
  // **Absence stays unambiguous, and that is the whole reason the two branches above
  // this one still render.** A silent nothing is only honest while a failed read is
  // loud: q.error paints an amber box saying explicitly that this is not a report that
  // nothing is burning, and q.isLoading paints the checking line. So the panel being
  // absent can only mean the query settled and found none — never "we could not look".
  // Delete either of those branches and this null becomes the exact failure
  // `check:fire` exists to prevent, which is why that guard now asserts this branch
  // returns null AND sits after both of them in source order.
  if (!fires.length) return null;

  return (
    <div style={{ ...wrap, borderColor: tone.c, background: tone.bg }}>
      <div style={{ ...hd, color: tone.c, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <ActionIcon name="fire" size={14} color={tone.c} />
        {closeUncontained.length ? "Active fire nearby" : "Active fire in the area"}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {fires.slice(0, 4).map(f => (
          <div key={f.id} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: fireColor(f, C), flexShrink: 0, marginTop: 4 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.text }}>{f.name}</span>
              <span style={{ display: "block", fontSize: 11.5, color: C.textSub, lineHeight: 1.5 }}>
                {[fmtAcres(f.acres), fmtContained(f.contained), fmtDiscovered(f.discovered)].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span style={{ fontSize: 11.5, color: C.textMuted, flexShrink: 0 }}>{uDistMi(Math.round(f.originMi * 10) / 10)}</span>
          </div>
        ))}
        {fires.length > 4 ? (
          <div style={{ fontSize: 11.5, color: C.textMuted }}>and {fires.length - 4} more within {radiusMi} miles</div>
        ) : null}
      </div>

      {/* Rule 2, stated where the numbers are, not buried in a footnote. */}
      <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.55, marginTop: 9, borderTop: "1px solid " + C.border, paddingTop: 8 }}>
        Distances are to each fire&apos;s <b>reported point of origin</b>. A large fire&apos;s edge can be
        far closer than that — open the map to see mapped perimeters.
      </div>

      <Foot C={C} onOpenFireMap={onOpenFireMap} />
    </div>
  );
}

// The closure caveat again, deliberately. It is the single most consequential thing
// this data cannot tell a climber, and someone reading a route page may never open the
// map where the longer version lives.
function Foot({ C, onOpenFireMap }) {
  return (
    <>
      <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.55, marginTop: 8 }}>
        This does not show closures or fire restrictions — there is no national feed for them, and a
        fire far from a route can still close its access road.
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        {onOpenFireMap ? (
          <button onClick={onOpenFireMap} style={{ padding: 0, border: "none", background: "none", color: C.blue, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Open fire map →</button>
        ) : null}
        <a href="https://www.fs.usda.gov/alerts" target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: "none", fontSize: 11.5, fontWeight: 700 }}>Forest Service alerts →</a>
      </div>
    </>
  );
}

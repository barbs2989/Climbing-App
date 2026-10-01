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
          <div style={{ fontSize: 11.5, color: C.textMuted }}>and {fires.length - 4} more within {uDistMi(radiusMi)}</div>
        ) : null}
      </div>

      {/* Rule 2, stated where the numbers are, not buried in a footnote. */}
      <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.55, marginTop: 9, borderTop: "1px solid " + C.border, paddingTop: 8 }}>
        Distances are to each fire&apos;s <b>reported point of origin</b>. A large fire&apos;s edge can be
        far closer than that — open the map to see mapped perimeters.
      </div>

      <Foot C={C} coord={coord} ActionIcon={ActionIcon} onOpenFireMap={onOpenFireMap} />
    </div>
  );
}

// The closure caveat again, deliberately. It is the single most consequential thing
// this data cannot tell a climber, and someone reading a route page may never open the
// map where the longer version lives.
function Foot({ C, coord, ActionIcon, onOpenFireMap }) {
  return (
    <>
      {onOpenFireMap ? <MapCard C={C} coord={coord} ActionIcon={ActionIcon} onOpen={onOpenFireMap} /> : null}
      <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.55, marginTop: 8 }}>
        This does not show closures or fire restrictions — there is no national feed for them, and a
        fire far from a route can still close its access road.
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        <a href="https://www.fs.usda.gov/alerts" target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: "none", fontSize: 11.5, fontWeight: 700 }}>Forest Service alerts →</a>
      </div>
    </>
  );
}

// The way into the full Fire map. It was an 11.5px "Open fire map →" text link beside the
// Forest Service link, and it did not read as a map at all. Now it is a card that SHOWS
// one: the topo tiles around this climb with a pin on it, over a full-width label.
//
// A 3x3 block of zoom-11 OpenTopoMap tiles (the Fire map's own default base layer), offset
// so the climb's point sits at the card's centre at any width up to the app's 520px column.
// It is a picture of the terrain only — no fire is drawn on it, because a preview that
// plotted some fires would invite reading the ones it did not draw as absent. If the tiles
// fail, the card is still a labelled button on a plain background.
const PREVIEW_Z = 11, PREVIEW_H = 96;
function tilePoint(lat, lng, z) {
  const n = Math.pow(2, z), r = lat * Math.PI / 180;
  return { x: (lng + 180) / 360 * n, y: (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n };
}
function MapCard({ C, coord, ActionIcon, onOpen }) {
  const p = tilePoint(coord.lat, coord.lng, PREVIEW_Z);
  const tx = Math.floor(p.x), ty = Math.floor(p.y);
  // The point's pixel position inside the 768px block; the block is shifted so that
  // pixel lands on the card's centre.
  const ox = (p.x - tx) * 256 + 256, oy = (p.y - ty) * 256 + 256;
  const tiles = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) tiles.push([dx, dy]);
  return (
    <button onClick={onOpen} aria-label="Open fire map — fire perimeters and red-flag warnings around this climb"
      style={{ display: "block", width: "100%", marginTop: 10, padding: 0, borderRadius: 10, overflow: "hidden", border: "1px solid " + C.blueDim, background: C.card, cursor: "pointer", textAlign: "left" }}>
      <span aria-hidden="true" style={{ display: "block", position: "relative", height: PREVIEW_H, overflow: "hidden", background: C.surface }}>
        <span style={{ position: "absolute", left: "50%", top: PREVIEW_H / 2, width: 768, height: 768, marginLeft: -ox, marginTop: -oy }}>
          {tiles.map(([dx, dy]) => (
            <img key={dx + "," + dy} alt="" loading="lazy" draggable={false}
              src={"https://a.tile.opentopomap.org/" + PREVIEW_Z + "/" + (tx + dx) + "/" + (ty + dy) + ".png"}
              onError={e => { e.currentTarget.style.visibility = "hidden"; }}
              style={{ position: "absolute", left: (dx + 1) * 256, top: (dy + 1) * 256, width: 256, height: 256, display: "block" }} />
          ))}
        </span>
        <span style={{ position: "absolute", left: "50%", top: PREVIEW_H / 2, width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: "50%", background: C.blue, border: "3px solid #ffffff", boxSizing: "border-box", boxShadow: "0 1px 4px rgba(0,0,0,0.5)" }} />
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 12px", borderTop: "1px solid " + C.border }}>
        <ActionIcon name="map" size={18} color={C.blue} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: C.blue }}>Open fire map</span>
          <span style={{ display: "block", fontSize: 11.5, color: C.textSub, lineHeight: 1.4 }}>Fire perimeters and red-flag warnings around this climb</span>
        </span>
        <span aria-hidden="true" style={{ fontSize: 18, fontWeight: 700, color: C.blue }}>›</span>
      </span>
    </button>
  );
}

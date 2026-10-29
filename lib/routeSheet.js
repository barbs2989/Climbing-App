import { catOf, gradeLabel, uDist, uElev, routeAscentFt, wpType, wpPlaced, escHtml, routeLink } from "../ClimbMatchCore.jsx";
import { effDistKm } from "./outing.js";
import { routeRackFor } from "./rack.js";
import { discLabel } from "./discLabels";

/* THE PRINTABLE ROUTE SHEET (desktop website, owner 2026-10-22): one sheet of beta to carry on
   paper, built for printSheet() the way itinSheetHtml builds a plan. It prints only what the
   route STORES — a section with nothing in it is left out, never filled with a placeholder — and
   every length and height goes through uElev/uDist, so it reads in the climber's own units.
   `crumbs` is the area path the page already resolved (names, state first); `mtnName` the
   fallback when there is none. */
const para = (t) => String(t || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => "<p>" + escHtml(p) + "</p>").join("");

export function routeSheetHtml(r, mtnName, crumbs) {
  const where = (crumbs && crumbs.length ? crumbs : [mtnName]).filter(Boolean).join(" › ");
  const dist = effDistKm(r), gain = routeAscentFt(r);
  const facts = [
    ["Grade", gradeLabel(r)],
    ["Discipline", discLabel(catOf(r))],
    ["Length", r.routeFt != null ? uElev(r.routeFt) : null],
    ["Pitches", r.pitches > 0 && r.discipline !== "scrambling" ? String(r.pitches) : null],
    ["Season", r.season],
    ["Aspect", r.aspect],
    ["Approach", dist != null ? uDist(dist) : null],
    ["Gain", gain != null ? "↑" + uElev(gain) : null],
  ].filter((f) => f[1] != null && f[1] !== "");
  let h = "<h1>" + escHtml(r.name) + "</h1><p class=\"sub\">" + escHtml(where) + (r.id != null ? " · <a href=\"" + escHtml(routeLink(r.id)) + "\">open in ClimbMatch</a>" : "") + "</p>";
  if (facts.length) h += "<table><tbody>" + facts.map((f) => "<tr><th>" + escHtml(f[0]) + "</th><td>" + escHtml(f[1]) + "</td></tr>").join("") + "</tbody></table>";
  if (r.approach) h += "<h2>Approach</h2>" + para(r.approach);
  const pd = Array.isArray(r.pitchDetail) ? r.pitchDetail : [];
  if (pd.length) {
    h += "<h2>The climb</h2><table class=\"sched\"><tbody>" + pd.map((p, i) => {
      const n = p.n != null ? p.n : (p.pitch != null ? p.pitch : i + 1);
      const len = p.lengthM != null ? uElev(p.lengthM * 3.28084) : "";
      const what = [p.grade, len].filter(Boolean).join(" · ");
      const note = p.note != null ? p.note : (p.notes || p.desc || "");
      return "<tr><td>" + escHtml(String(n)) + "</td><td>" + (what ? "<b>" + escHtml(what) + "</b> " : "") + escHtml(note) + "</td></tr>";
    }).join("") + "</tbody></table>";
  }
  const descent = r.descent || r.descentText;
  if (descent) h += "<h2>Descent</h2>" + para(descent);
  const rack = routeRackFor(r);
  if (rack && rack.length) h += "<h2>Rack</h2><ul>" + rack.map((x) => "<li>" + escHtml(x) + "</li>").join("") + "</ul>";
  const hz = Array.isArray(r.hazards) ? r.hazards.filter(Boolean) : [];
  if (hz.length) h += "<h2>Hazards</h2><ul>" + hz.map((x) => "<li>" + escHtml(x) + "</li>").join("") + "</ul>";
  const wps = (r.waypoints || []).filter(wpPlaced);
  if (wps.length) {
    h += "<h2>Waypoints</h2><table><thead><tr><th>Point</th><th>Coordinates</th><th>Height</th></tr></thead><tbody>" + wps.map((w) => {
      const label = w.name || w.label || wpType(w) || "Point";
      const elev = w.elev != null && w.elev !== "" ? Number(w.elev) : null; // stored in feet
      return "<tr><td>" + escHtml(label) + "</td><td>" + Number(w.lat).toFixed(5) + ", " + Number(w.lng).toFixed(5) + "</td><td>" + (elev != null ? escHtml(uElev(elev)) : "") + "</td></tr>";
    }).join("") + "</tbody></table>";
  }
  h += "<p class=\"note\">Conditions, access and the route itself change. Check recent reports in ClimbMatch before you go.</p>";
  return h;
}

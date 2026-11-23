/* DOES THIS CLIMBER FIT THIS CREW'S CLIMB? One rule, read by every surface that offers an invite
   (owner 2026-11-23: "it has to make sense based on what they like to climb, distance away from
   you or the climb, and grade level that they climb").

   WHO CAN BE INVITED: a climber who saved the crew's climb as an objective, or who lists one of the
   crew's disciplines. A saved objective is not required.

   GRADE never blocks. It labels the card and orders the list, because a party needs one leader and
   a second can follow a grade above their lead grade:
     lead    their lead grade is at or above the climb's
     follow  their FOLLOW grade is at or above it, or their lead grade is within one number grade
             below, counted in WHOLE number grades so a letter does not decide it (a 5.9
             leader can follow any 5.10; 10.25 - 9 is more than 1, which is why it is floored)
     below   further below than that
     unknown they list no grade for the discipline
   and null when there is nothing to compare: an area crew (no single grade), a walk-up or scramble,
   or an alpine climb graded without a 5.x rock grade.

   Numbers come from gradeNumFrom, where one number grade is 1.0 in every system (5.9 -> 9,
   5.10a -> 10.25, WI4 -> 4, M8 -> 8, V5 -> 5). A yds climb must carry a 5.x: "Class 4" parses to
   4, which would rank above a 5.3 lead (3).

   `rows` is profileGradeRows(climber) from ClimbMatchCore.jsx, passed in so lib/ does not import
   the app bundle. */
import { gradeNumFrom, gradeSystemForDiscipline } from "./grade.js";

/** How far below the climb a lead grade may sit and still read as "can follow": one number grade. */
export const FOLLOW_GAP = 1;

/* Which profile grade answers for a crew discipline, most specific first. */
const KEYS = {
  sport: ["sport"],
  toprope: ["sport", "trad"],
  trad: ["trad"],
  alpine: ["alpine", "trad", "sport"],
  bouldering: ["boulder"],
  ice: ["ice"],
  mixed: ["mixed"],
  aid: ["aid"],
};

/** Listed first to last when a list is ordered by fit. */
export const FIT_RANK = { lead: 0, follow: 1, unknown: 2, below: 3 };

export function crewGradeFit(rows, place) {
  if (!place || place.kind !== "route" || !place.grade) return null;
  const keys = KEYS[place.disc];
  if (!keys) return null;
  const sys = gradeSystemForDiscipline(place.disc);
  if (sys === "yds" && !/5\.\d/.test(String(place.grade))) return null;
  const need = gradeNumFrom(String(place.grade), sys);
  if (need == null) return null;
  for (const k of keys) {
    const r = (rows || []).find(x => x && x.k === k);
    if (!r) continue;
    const follows = r.role === "follow";
    const lead = follows ? null : gradeNumFrom(r.grade, sys);
    const fol = gradeNumFrom(follows ? r.grade : r.follow, sys);
    if (lead == null && fol == null) continue;
    const mine = (follows ? r.grade : (r.grade || r.follow)) || "";
    if (lead != null && lead >= need) return { fit: "lead", mine };
    if ((fol != null && fol >= need) || (lead != null && Math.floor(need) - Math.floor(lead) <= FOLLOW_GAP)) return { fit: "follow", mine };
    return { fit: "below", mine };
  }
  return { fit: "unknown", mine: "" };
}

/** The words a card prints for a fit. Bouldering has no leader, so it says "climbs". */
export function crewFitLabel(f, place) {
  if (!f) return "";
  const boulder = place && place.disc === "bouldering";
  if (f.fit === "lead") return boulder ? "Climbs this grade" : "Leads this grade";
  if (f.fit === "follow") return boulder ? "Climbs a grade below" : "Can follow this grade";
  if (f.fit === "below") return "Climbs below this grade";
  return "No grade listed";
}

/** Saved the crew's climb, or lists one of its disciplines. */
export function crewCanInvite(discs, objs, place, routeId) {
  if (routeId != null && Array.isArray(objs) && objs.includes(routeId)) return true;
  const ds = (place && place.discs) || [];
  return Array.isArray(discs) && ds.some(d => discs.includes(d));
}

/** The default search radius around the climb when filling a crew: people travel further for mountains. */
export function crewInviteRadiusMi(place) {
  const d = place && place.disc;
  return d === "alpine" || d === "mountaineering" || d === "scrambling" || d === "ice" || d === "mixed" ? 250 : 100;
}

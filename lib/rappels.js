// How many rappels does a route actually have?
//
// A row can answer that three times and disagree with itself. Forbidden Peak's West Ridge:
//   rappelDetail    — 3 stations, described one by one
//   rappels         — "Variable — downclimb/short rappels on West Ridge itself, or ~5
//                      single-rope raps via East Ledges/NE Face"
//   rappelCountNote — "…as many as 6-7 sequential single-rope rappels… as few as 1-2"
//
// The Overview stat and the rappel table header both printed 3, from rappelDetail.length,
// while the prose box directly beneath them said 5. Neither was wrong on its own; nothing
// reconciled them, so the screen contradicted itself.
//
// The documented count stays the headline — it is the only one backed by station-by-station
// data — but when another field on the same row reports more, the label says so.

// Numbers written as rappel counts, in either "6-7 rappels" or "~5 raps" form. Bounded at 40
// so a stray year or a length in metres cannot become a rappel count.
export function rappelNumbersIn(text) {
  const out = [];
  const s = String(text == null ? "" : text);
  let m;
  const range = /(\d+)\s*(?:[-–—]|\s+to\s+)\s*(\d+)\s*(?:sequential\s+)?(?:single[- ]rope\s+)?(?:rappels?|raps?)\b/ig;
  while ((m = range.exec(s))) { out.push(+m[1]); out.push(+m[2]); }
  const one = /~?\s*(\d+)\s*(?:sequential\s+)?(?:single[- ]rope\s+)?(?:rappels?|raps?)\b/ig;
  while ((m = one.exec(s))) { out.push(+m[1]); }
  return out.filter(n => n > 0 && n < 40);
}

function proseSources(route) {
  if (!route) return "";
  const rap = route.rappels != null && typeof route.rappels === "string" ? route.rappels : null;
  return [rap, route.rappelCountNote || route.rappel_count_note,
    route.descentText || route.descent_text].filter(Boolean).join("  ");
}

export function rappelReportedMax(route) {
  const ns = rappelNumbersIn(proseSources(route));
  return ns.length ? Math.max(...ns) : null;
}

/* Most parties carry ONE rope, and that is the count they will actually do.
   The documented station list is frequently the two-rope sequence — Forbidden Peak's West
   Ridge lists 3 stations while SummitPost's East Ledges description says one 50-60 m rope
   "might amount to 5 rappels" and that "if you have two ropes you will only have half the
   rappels"; Ingalls Peak's South Ridge is 3 on two 60s and 4 on one. Leading with the
   documented number therefore understates the descent for the common case.

   So: when the row states a count explicitly attributed to a single rope, that is the figure
   worth putting first. Only explicit phrasings count — this must not infer a rope setup that
   nobody wrote down. A range takes its TOP end, because the reason a single-rope party needs
   more rappels is that they cannot span the long ones. */
const SINGLE_ROPE_PATTERNS = [
  // "~5 single-rope raps", "6-7 sequential single-rope rappels"
  /(?:(\d+)\s*(?:[-–—]|\s+to\s+)\s*)?(\d+)\s*(?:sequential\s+)?single[- ]rope\s+(?:rappels?|raps?)\b/ig,
  // "four with a single 60 m rope", "4 rappels on a single 60m rope", "4 rappels on a 60m rope"
  /(\d+)\s*(?:rappels?|raps?)\b[^.;]{0,40}?\bon (?:a|one) (?:single\s+)?(?:50|60|70)\s?m rope\b/ig,
  // "with a single 60 m rope it is four" — spelled out, which is how these notes are written
  /\bwith a single (?:50|60|70)\s?m rope[^.;]{0,30}?\b(?:it is|expect|do)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/ig,
];
const WORD_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
export function rappelSingleRope(route) {
  const s = proseSources(route);
  const found = [];
  for (const re of SINGLE_ROPE_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s))) {
      for (const g of m.slice(1)) {
        if (g == null) continue;
        const n = /^\d+$/.test(g) ? +g : WORD_NUM[String(g).toLowerCase()];
        if (n != null) found.push(n);
      }
    }
  }
  const ns = found.filter((n) => n > 0 && n < 40);
  return ns.length ? Math.max(...ns) : null;
}

/* The SPAN, not just the top. Forbidden's West Ridge states both "~5 single-rope raps" and
   "as many as 6-7" in late-season dry conditions; headlining 7 alone overstates the ordinary
   day, and headlining 5 alone hides the bad one. `~5-7 on a single rope` is the honest label
   and it is what the row actually says. */
export function rappelSingleRopeSpan(route) {
  const s = proseSources(route);
  const found = [];
  for (const re of SINGLE_ROPE_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s))) {
      for (const g of m.slice(1)) {
        if (g == null) continue;
        const n = /^\d+$/.test(g) ? +g : WORD_NUM[String(g).toLowerCase()];
        if (n != null) found.push(n);
      }
    }
  }
  const ns = [...new Set(found.filter((n) => n > 0 && n < 40))].sort((a, b) => a - b);
  return ns.length ? { min: ns[0], max: ns[ns.length - 1] } : null;
}

/* The same contract the readers in RouteDetail carry, and for the same reason (#787/#791):
   when climbers have agreed a correction to the count, the stored station list must stop
   out-voting them. check-rappel-readers.mjs enforces it — it scanned only RouteDetail.jsx
   until these readers moved here, which is how a module of rappel readers ended up outside
   the guard written for rappel readers. */
function _rapEdited(route) {
  return !!(route && (route._rappelsFromContrib || route._rappels_from_contrib));
}

export function rappelDocumented(route) {
  if (_rapEdited(route)) return null;
  const d = route && (route.rappelDetail || route.rappel_detail);
  return Array.isArray(d) && d.length ? d.length : null;
}

/* Which rope do these STATIONS need? Ask the arithmetic, not the prose.

   A rappel reaches half the rope: ~32 m on a single 60, ~37 m on a single 70 (a little under
   half, for the knot and for anchors set below the lip). So a station list containing a 55 m
   rappel cannot be done on one rope — that table IS the two-rope sequence, whether or not any
   sentence says so.

   This matters because most parties carry ONE rope. 42 of the 156 station lists in the catalog
   have a station over 37 m, and the header prints their station COUNT: a single-rope party
   reads "6 rappels", carries one rope, and finds out at the first station. Prose parsing only
   catches the few routes that describe their rope setup; lengths catch every route that
   records them, with no language in the loop. */
export const SINGLE_60_REACH = 32;
export const SINGLE_70_REACH = 37;
/* A row that says outright it needs two ropes, in the station list or the count note.
   ADDITIVE to the length rule above, never a replacement for it: the comment there is right
   that lengths catch every route that records them and prose catches only the few that
   describe their setup. This covers the other direction — a row whose recorded lengths fit one
   rope while the row itself says they do not.

   THE ESCAPE IS PER SENTENCE AND IT IS THE WHOLE PRECISION RULE. "Double-rope rappel (or two
   single-rope rappels)" is NOT a two-rope requirement: one rope works and costs one extra
   rappel, which is what the count path is for. Warning "a single rope does not reach" there
   would be false, and a false rope warning is how a real one stops being read. Seven catalog
   rows are that shape today and none may match here. */
const TWO_ROPES_STATED = /\ba single rope (?:will not|does not|won'?t|cannot|can'?t)\b|\bsingle rope (?:will not|does not|won'?t) (?:link|reach|make)\b|\brequires? two ropes\b|\btwo ropes (?:are )?(?:required|necessary|mandatory|the standard kit)\b|\bmust (?:carry|have) two ropes\b/i;
const ONE_ROPE_WORKS = /\bor\s+(?:as\s+)?two\s+single[- ]rope\s+(?:rappels|raps)\b|\bor\s+split\s+into\s+two\b|\bor\s+a\s+single\s+60\s?m\b/i;
function statedTwoRopes(route) {
  /* Self-guarding rather than relying on its caller: an agreed correction means the station
     list is disputed, so it is no basis for telling anyone which rope to carry — the same
     sentence rappelRopeNeed() carries. rappelRopeNeed already returns first, so this changes
     no behaviour today; it stops a second caller reintroducing #787/#791 through this door. */
  if (_rapEdited(route)) return false;
  const d = route && (route.rappelDetail || route.rappel_detail);
  const stations = Array.isArray(d)
    ? d.map((x) => [x && x.notes, x && x.station, x && x.pull].filter(Boolean).join(" ")).join("  ")
    : "";
  const text = [stations, route && (route.rappelCountNote || route.rappel_count_note)].filter(Boolean).join("  ");
  return text.split(/(?<=[.;])\s+/).some((line) => TWO_ROPES_STATED.test(line) && !ONE_ROPE_WORKS.test(line));
}

export function rappelRopeNeed(route) {
  /* Honours _rapEdited like every other reader, and here the reason is specific: if climbers
     have agreed the count is wrong, the station list they corrected is not a sound basis for
     telling anyone which rope to carry. Silence beats a rope requirement derived from a list
     the route itself now disputes. */
  if (_rapEdited(route)) return null;
  const d = route && (route.rappelDetail || route.rappel_detail);
  if (!Array.isArray(d) || !d.length) return null;
  const lens = d.map((x) => x && x.lengthM).filter((n) => typeof n === "number" && n > 0);
  const max = lens.length ? Math.max(...lens) : null;
  const byLength = max == null ? null
    : max > SINGLE_70_REACH ? "double" : max > SINGLE_60_REACH ? "single70" : "single60";
  /* A STATED requirement carries no measured distance with it, so `max` stays null and the
     reader must not quote one. wa_east_face_2 is why: its own note calls the listed lengths
     estimates that "should not be planned around", and the length rule read 35 m off them and
     concluded one rope was enough — on a route that says twice that a single rope will not
     link its two stations. */
  if (byLength !== "double" && statedTwoRopes(route)) return { max: null, needs: "double", stated: true };
  if (byLength == null) return null;
  return { max, needs: byLength, stated: false };
}

// The count a climber's accepted correction states, for the header to use instead.
function correctedCount(route) {
  const r = route && route.rappels;
  if (r == null) return null;
  if (typeof r === "object") return r.count != null ? r.count : null;
  const s = String(r).trim();
  if (/^\d+$/.test(s)) return +s;
  const ns = rappelNumbersIn(s);
  return ns.length ? Math.max(...ns) : null;
}

// { documented, reportedMax, disagrees } — `disagrees` is what an audit counts and what the
// header uses to decide whether to print a range instead of a single number.
export function rappelSummary(route) {
  const documented = rappelDocumented(route);
  const reportedMax = rappelReportedMax(route);
  const singleRope = rappelSingleRope(route);
  return { documented, reportedMax, singleRope,
    // Only interesting when a single rope needs MORE than the documented list — that is the
    // case where leading with the documented number short-changes the reader.
    singleRopeExceeds: documented != null && singleRope != null && singleRope > documented,
    disagrees: documented != null && reportedMax != null && reportedMax > documented };
}

/* The line a single-rope party needs BEFORE they leave the car, not at the first station.
   Returned only when the stations genuinely cannot be reached on one rope. */
export function rappelSingleRopeWarning(route) {
  const need = rappelRopeNeed(route);
  if (!need || need.needs !== "double") return null;
  /* No metre figure when the requirement was STATED rather than measured — there is no
     distance behind it, and inventing one on a safety line is the defect this repo keeps
     recording under a different column name. */
  if (need.max == null) {
    return `This route states that a single 60 m rope will not link its stations. On one rope expect roughly twice this many rappels, using intermediate anchors that are not listed below.`;
  }
  return `A single 60 m rope does not reach the longest station here (${need.max} m). On one rope expect roughly twice this many rappels, using intermediate anchors that are not listed below.`;
}

/* The header line. Puts the single-rope figure first when it is bigger, because that is the
   rope most parties carry and therefore the number of rappels most parties will do. Falls back
   to the documented/reported wording otherwise, unchanged. */
export function rappelHeaderLabel(route) {
  // An accepted correction wins outright — never head the box with the stale station count.
  if (_rapEdited(route)) {
    const c = correctedCount(route);
    return c != null ? `RAPPELS · ${c} rappel${c !== 1 ? "s" : ""} · corrected by climbers` : "RAPPELS · corrected by climbers";
  }
  const { documented, reportedMax, singleRope, singleRopeExceeds } = rappelSummary(route);
  if (documented == null) return null;
  if (singleRopeExceeds) {
    const span = rappelSingleRopeSpan(route);
    const n = span && span.min !== span.max ? `${span.min}–${span.max}` : String(singleRope);
    return `RAPPELS · ~${n} on a single rope · ${documented} station${documented !== 1 ? "s" : ""} documented`;
  }
  /* Stations that only two ropes can reach. Said before the reported-max wording because it
     changes what the COUNT means for most readers, rather than merely widening it. */
  const need = rappelRopeNeed(route);
  if (need && need.needs === "double") {
    const how = need.max == null ? "two ropes" : `two ropes (longest ${need.max} m)`;
    return `RAPPELS · ${documented} station${documented !== 1 ? "s" : ""} · ${how}`;
  }
  if (reportedMax != null && reportedMax > documented) {
    return `RAPPELS · ${documented} documented · up to ${reportedMax} reported`;
  }
  return `RAPPELS · ${documented} rappel${documented !== 1 ? "s" : ""}`;
}

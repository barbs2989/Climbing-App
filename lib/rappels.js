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
  if (reportedMax != null && reportedMax > documented) {
    return `RAPPELS · ${documented} documented · up to ${reportedMax} reported`;
  }
  return `RAPPELS · ${documented} rappel${documented !== 1 ? "s" : ""}`;
}

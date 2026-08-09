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

export function rappelDocumented(route) {
  const d = route && (route.rappelDetail || route.rappel_detail);
  return Array.isArray(d) && d.length ? d.length : null;
}

// { documented, reportedMax, disagrees } — `disagrees` is what an audit counts and what the
// header uses to decide whether to print a range instead of a single number.
export function rappelSummary(route) {
  const documented = rappelDocumented(route);
  const reportedMax = rappelReportedMax(route);
  return { documented, reportedMax,
    disagrees: documented != null && reportedMax != null && reportedMax > documented };
}

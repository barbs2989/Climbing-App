// When a route's road and access claims were last read against a primary source.
//
// The routes table carried 94 columns and not one was a date, which is the root of the
// expiring-closures class rather than a detail of it: audit:expiring-closures' standing instruction
// is "date it or drop the claim", and there was nowhere to put the date. 0172 adds
// routes.access_checked_at; this is the reader.
//
// A PURE FUNCTION, EXPORTED, because that is the only shape a guard can execute both branches of.
// check:topo-outage-copy records why: a value read off a hook INSIDE the component under test is
// unreachable to renderToStaticMarkup, so every provably-tested sibling takes its input as a prop or
// as an argument. This takes the route.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* Formatted by hand rather than through toLocaleDateString, deliberately. The locale version emits
   a different string per machine, which would make any assertion about this line pass on the
   author's box and fail in CI — and the app already carries a DLOCALE global that a signed-in user
   can change. A date on screen has one job here and it is to be comparable. */
export function accessCheckedDate(iso) {
  if (iso == null) return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/* The line rendered under the road rows in GETTING THERE.
 *
 * NULL RENDERS NOTHING, AND THAT IS A DECISION RATHER THAN AN OVERSIGHT. The tempting alternative
 * is to say "age not recorded" on every undated row, which is more informative and would appear on
 * roughly 1,000 WA routes at once — a catalog-wide change to what every road block says, which is a
 * product call and not this change's to make. Showing a date where one exists is additive; the
 * undated rows read exactly as they do today.
 *
 * IT STATES THE DATE AND STOPS. No "recently checked", no staleness verdict, no "worth re-checking"
 * past some threshold — that would be the app adding a judgement on top of the one fact it has, and
 * the threshold would be invented. The whole value of this column is that a reader can judge the age
 * themselves, which is what "date it or drop the claim" asks for.
 *
 * "Checked", never "verified": a Forest Service alert read on a Tuesday can be superseded on the
 * Wednesday. The column records the reading, not a guarantee about the world.
 */
export function accessCheckedLine(route) {
  const when = accessCheckedDate(route && route.accessCheckedAt);
  return when ? `Road and access last checked against a published source on ${when}.` : null;
}

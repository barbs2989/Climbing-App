// The Reports tab's "trending good / poor" badge (ConsensusPanel), read off the newest recent trip reports.
//
// It used to test ONE report with substring regexes, so ordinary words flipped it: "nice day, great photo"
// read as trending POOR ("nice" holds "ice", "photo" holds "hot"), and on an ice or alpine route "great ice"
// or "firm snow" counted against the climb. Now: whole words only; ice and snow are not bad news on the
// disciplines that climb them; and a trend needs at least two recent reports — one report is a data point,
// not a direction.
//
// Pure (no core import) so a node probe can drive it: the caller passes its own `isRecent`.

const GOOD = /\b(dry|perfect|firm|bluebird|tacky|cool|crisp|prime|stellar)\b/;
const BAD_ALWAYS = "wet|greasy|humid|verglas|slick|warm|hot|damp|mud|muddy|seep|seeping|seepage|soaked";
const BAD = new RegExp("\\b(" + BAD_ALWAYS + "|snow|ice)\\b");
const BAD_SNOW_OK = new RegExp("\\b(" + BAD_ALWAYS + ")\\b");

/** +1 a report reads good, -1 poor, 0 mixed or silent. */
export function reportTone(report, snowAndIceOk) {
  if (!report) return 0;
  const tx = ((report.condTags || []).join(" ") + " " + (report.text || "")).toLowerCase();
  const good = GOOD.test(tx), bad = (snowAndIceOk ? BAD_SNOW_OK : BAD).test(tx);
  return good && !bad ? 1 : bad && !good ? -1 : 0;
}

/**
 * The trend over the newest (up to 3) RECENT reports: "good", "poor" or "steady"; null when fewer than two
 * recent reports exist, so no arrow is drawn.
 * @param {Array<{date?:string|null,condTags?:string[]|null,text?:string|null}>} reports
 * @param {{snowAndIceOk?:boolean,isRecent:(d:string)=>boolean}} opts
 */
export function reportTrend(reports, opts) {
  const recent = (reports || [])
    .filter(function (a) { return a && a.date && opts.isRecent(a.date); })
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); })
    .slice(0, 3);
  if (recent.length < 2) return null;
  const sum = recent.reduce(function (s, a) { return s + reportTone(a, !!opts.snowAndIceOk); }, 0);
  return sum > 0 ? "good" : sum < 0 ? "poor" : "steady";
}

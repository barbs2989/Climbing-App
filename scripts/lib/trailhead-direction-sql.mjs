// Every trailheadDirection VALUE a hand-written .sql file would write, so check:sql can refuse a
// batch that puts the walk into the drive field before it is pasted into the SQL Editor.
//
// Three shapes, all measured in audits/sql/ and the root enrichment files rather than guessed:
//   jsonb_set(approach_logistics, '{trailheadDirection}', '"From the …"')          JSON string in a literal
//   jsonb_set(approach_logistics, '{trailheadDirection}', to_jsonb('From the …'::text))
//   approach_logistics = '{"trailhead": "…", "trailheadDirection": "From the …"}'  a whole JSON object
// plus jsonb_build_object('trailheadDirection', 'From the …'). SQL doubles a quote inside a literal
// (''), and JSON escapes one (\"), so both are undone before the value is judged.
//
// Pass it comment-stripped SQL. A value it cannot see is a value it cannot refuse, so check:sql
// reports how many it found rather than printing a silent pass over a file it could not read.
const unSql = s => s.replace(/''/g, "'");
const unJson = s => { try { return JSON.parse(`"${s}"`); } catch { return s.replace(/\\"/g, '"'); } };

export function trailheadDirectionsInSql(code) {
  const out = [];
  for (const m of code.matchAll(/"trailheadDirection"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) out.push(unJson(unSql(m[1])));
  for (const m of code.matchAll(/'\{\s*trailheadDirection\s*\}'\s*,\s*(to_jsonb\s*\(\s*)?'((?:[^']|'')*)'/gi)) {
    const v = unSql(m[2]);
    out.push(!m[1] && /^".*"$/s.test(v) ? unJson(v.slice(1, -1)) : v);
  }
  for (const m of code.matchAll(/'trailheadDirection'\s*,\s*'((?:[^']|'')*)'/gi)) out.push(unSql(m[1]));
  return out;
}

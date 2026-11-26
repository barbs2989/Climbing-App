// Which routes carrying rappel data still say "two ropes" in descent_text (the DESCENT box beside RAPPELS)?
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
import { TWO_ROPE_TEXT } from "../audit-rappel-one-rope.mjs";
const key = requireServiceKey();
const seen = new Map();
for (const f of ["rappel_detail=not.is.null", "rappels=not.is.null", "rappel_count_note=not.is.null"])
  for (const r of await selectAll("routes", "id,descent_text", f, { key, pageSize: 500 })) seen.set(r.id, r);
const hits = [...seen.values()].filter((r) => r.descent_text && TWO_ROPE_TEXT.test(r.descent_text));
for (const r of hits) {
  const m = r.descent_text.match(TWO_ROPE_TEXT);
  console.log(r.id, "::", r.descent_text.slice(Math.max(0, m.index - 120), m.index + 80).replace(/\n/g, " "));
}
console.log(hits.length, "of", seen.size);

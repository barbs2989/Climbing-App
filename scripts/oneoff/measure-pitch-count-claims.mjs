// SIZE THE CLASS BEFORE BUILDING A DETECTOR. Does a route's stored `pitches` disagree with a
// pitch count its OWN prose states? Mount Stuart's North Ridge stores 20 and says "roughly 18
// pitches" twice on the same screen. Read-only, anon key.
import { selectAll } from "../lib/supabase-env.mjs";

const COLS = ["overview", "beta", "pro_tips", "climbing_route", "approach", "descent_text", "watch_out"];
// "roughly 18 pitches", "18-20 pitches", "~11 pitches". A LEADING number only: prose that merely
// mentions the word is not an assertion of a count.
const CLAIM = /(?:^|[^\d.])(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s*(?:full\s+)?pitches\b/gi;

const leaves = (v, out = []) => {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => leaves(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => leaves(x, out));
  return out;
};

const rows = await selectAll("routes", "id,pitches," + COLS.join(","), "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL: read zero routes — not a clean catalog"); process.exit(2); }

let compared = 0, disagree = 0, examples = [];
for (const r of rows) {
  const p = Number(r.pitches);
  if (!Number.isFinite(p) || p <= 1) continue;
  const text = COLS.flatMap((c) => leaves(r[c])).join("   ");
  if (!text) continue;
  const claims = new Set();
  let m;
  CLAIM.lastIndex = 0;
  while ((m = CLAIM.exec(text))) {
    const lo = Number(m[1]), hi = m[2] ? Number(m[2]) : Number(m[1]);
    if (lo >= 2 && hi <= 60) claims.add(lo + ":" + hi);
  }
  if (!claims.size) continue;
  compared++;
  // A route legitimately describes SECTIONS ("the lower 11 pitches"), so only flag when NO stated
  // range contains the stored value -- every claim on the row disagrees.
  const covered = [...claims].some((c) => { const [lo, hi] = c.split(":").map(Number); return p >= lo && p <= hi; });
  if (!covered) {
    disagree++;
    if (examples.length < 30) {
      CLAIM.lastIndex = 0; let mm, sents = [];
      while ((mm = CLAIM.exec(text))) {
        const a = Math.max(0, mm.index - 90), b = Math.min(text.length, mm.index + mm[0].length + 60);
        sents.push("..." + text.slice(a, b).replace(/\s+/g, " ") + "...");
      }
      examples.push(`${r.id}  stored ${p}\n      ` + sents.slice(0, 2).join("\n      "));
    }
  }
}
console.log(`routes read: ${rows.length}`);
console.log(`routes stating a pitch count in their own prose: ${compared}`);
console.log(`...where NO stated count matches the stored one: ${disagree}`);
console.log();
examples.forEach((e) => console.log("  " + e));

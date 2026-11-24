// Which IC3 claims failed the retro numeric re-check, and does each feed text already LIVE (ic3 prose.json)?
import fs from "node:fs";
const D = (process.env.PREV_BATCH_DIR_IC3 || ".") + "/";
const rd = (f) => JSON.parse(fs.readFileSync(D + f, "utf8"));
const nums = (s) => String(s).match(/\d+(?:\.\d+)?/g) || [];
const covered = (val, ev) => nums(val).every((n) => String(ev).includes(n) || String(ev).includes(n.replace(/^0\./, ".")));
const items = [...rd("numcheck1.json"), ...rd("numcheck2.json")];
const res = Object.fromEntries([...rd("numresult1.json"), ...rd("numresult2.json")].map((x) => [`${x.id}|${x.field}|${x.i}`, x]));
const P = rd("prose.json");
const fail = [];
for (const it of items) {
  const x = res[`${it.id}|${it.field}|${it.i}`];
  const ok = x && x.verdict === "confirmed" && covered(it.claim, x.evidence) && !/not on the page|isn't on the page|not stated/i.test(x.page_says || "");
  if (!ok) fail.push({ ...it, verdict: x ? x.verdict : "unanswered", evidence: x ? x.evidence : "", page_says: x ? x.page_says : "" });
}
console.log(`${items.length} re-checked; ${fail.length} not fully proven`);
// does the live text carry the unproven claim? match on the claim's numbers and distinctive words
for (const f of fail) {
  const p = P[f.id] || {};
  const live = [p.overview, p.detailed_rack, p.descent_text].filter(Boolean).join(" | ");
  const ns = nums(f.claim).filter((n) => !covered(n, f.evidence));
  const inLive = ns.some((n) => live.includes(n)) || /tcu|quickdraw/i.test(f.claim) && /tcu|quickdraw/i.test(live);
  console.log(`\n${inLive ? "LIVE" : "not-live"} ${f.id} [${f.field}] claim: ${f.claim}`);
  console.log(`   page: ${String(f.page_says || f.evidence).slice(0, 160)}`);
  if (inLive) console.log(`   live text: ${live.slice(0, 260)}`);
}

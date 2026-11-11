// Re-reads every id apply-trip-plans-wa-2026-11-11.mjs wrote and compares it to the plan it meant to
// write, KEY ORDER ASIDE: jsonb stores object keys in its own order, so a byte comparison of
// JSON.stringify never matches (the apply script's first run reported 0 of 43 for exactly that reason).
// Read-only.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const DIR = "research-data/trip-plans-wa-2026-11-11";
const key = requireServiceKey();
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => [k, canon(v[k])])) : v;
const rep = JSON.parse(fs.readFileSync(DIR + "/apply-report.json", "utf8"));
const overrides = JSON.parse(fs.readFileSync(DIR + "/cal-overrides.json", "utf8"));
const outs = {};
for (const f of fs.readdirSync(DIR).filter((f) => /^out-.*\.json$/.test(f))) for (const x of JSON.parse(fs.readFileSync(DIR + "/" + f, "utf8"))) outs[x.id] = x;
const want = (id) => {
  const it = outs[id].itinerary;
  const cal = overrides[id] || it.cal;
  return { cal: cal || undefined, totalNote: it.totalNote || undefined, days: it.days.map((d, i) => ({ n: i + 1, title: d.title, objective: d.objective || "", note: d.note || "", gainFt: d.gainFt ?? null, lossFt: d.lossFt ?? null, hours: d.hours ?? null, miles: d.miles ?? null, packLb: d.packLb ?? null, schedule: (d.schedule || []).filter((s) => s && s.label).map((s) => ({ time: s.time || "", label: s.label, detail: s.detail || "" })) })) };
};
let ok = 0; const bad = [];
for (let i = 0; i < rep.plan.length; i += 50) {
  const ids = rep.plan.slice(i, i + 50);
  const r = await fetch(SUPABASE_URL + "/rest/v1/routes?select=id,itinerary&id=in.(" + ids.map(encodeURIComponent).join(",") + ")", { headers: headers(key), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error("STOPPED: " + r.status);
  for (const x of await r.json()) (JSON.stringify(canon(x.itinerary)) === JSON.stringify(canon(want(x.id))) ? ok++ : bad.push(x.id));
}
console.log("re-read matching " + ok + " of " + rep.plan.length + (bad.length ? "; MISMATCH: " + bad.join(" ") : ""));
if (ok !== rep.plan.length) process.exit(1);

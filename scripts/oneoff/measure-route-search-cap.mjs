// Measure the route-search fix: does adding a PREFIX leg put the rows that can win in front of
// the client-side scorer? Replays both the old and new leg sets against the live catalog and
// scores them with the real routeSearchScore tiers.
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
const U = SUPABASE_URL, K = anonKey(), h = { apikey: K, Authorization: "Bearer " + K };
const enc = s => encodeURIComponent(s);

// Mirrors routeSearchScore's route-name tiers (area name omitted; these legs are name-driven).
const score = (name, needle) => {
  const rn = String(name || "").toLowerCase();
  if (rn === needle) return 100;
  if (rn.startsWith(needle)) return 80;
  if (new RegExp("\\b" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(rn)) return 50;
  if (rn.includes(needle)) return 30;
  return 20;
};
const get = async (filter, n) => {
  const r = await fetch(`${U}/rest/v1/routes?select=id,name&${filter}&limit=${n}`, { headers: h, signal: AbortSignal.timeout(60000) });
  return r.ok ? r.json() : [];
};
const total = async q => {
  const r = await fetch(`${U}/rest/v1/routes?select=id&name=ilike.${enc("%" + q + "%")}&limit=1`,
    { headers: { ...h, Prefer: "count=exact" }, signal: AbortSignal.timeout(60000) });
  return Number((r.headers.get("content-range") || "?/0").split("/")[1]);
};
const dedupe = rows => { const s = new Set(), o = []; for (const r of rows) { if (s.has(r.id)) continue; s.add(r.id); o.push(r); } return o; };
const top = (rows, needle, lim = 8) =>
  dedupe(rows).sort((a, b) => score(b.name, needle) - score(a.name, needle)).slice(0, lim);

await get("name=ilike." + enc("%warm%"), 1);
let improved = 0, same = 0;
for (const q of ["north ridge", "north face", "mount", "west ridge", "liberty bell", "beckey"]) {
  const needle = q.toLowerCase(), n = await total(q);
  const sub = await get(`name=ilike.${enc("%" + q + "%")}`, 16);
  const pre = await get(`name=ilike.${enc(q + "%")}`, 16);
  const before = top(sub, needle);
  const after = top([...pre, ...sub], needle);
  const avg = rs => rs.length ? (rs.reduce((s, r) => s + score(r.name, needle), 0) / rs.length).toFixed(1) : "0";
  const exact = rs => rs.filter(r => r.name.toLowerCase() === needle).length;
  const b = Number(avg(before)), a = Number(avg(after));
  if (a > b) improved++; else same++;
  console.log(`"${q}"  (${n} matches)`);
  console.log(`   BEFORE top8 avgScore=${avg(before)} exact=${exact(before)}  ${before.slice(0, 3).map(r => r.name).join(" | ")}`);
  console.log(`   AFTER  top8 avgScore=${avg(after)} exact=${exact(after)}  ${after.slice(0, 3).map(r => r.name).join(" | ")}`);
}
console.log(`\n${improved} queries improved, ${same} unchanged (unchanged is correct where the cap never bound).`);

#!/usr/bin/env node
// ONE-OFF (2026-10-28): how long do area About texts run? Sizes the area page's "Show more" cap.
//   node scripts/oneoff/measure-area-blurb-lengths.mjs
import { selectAll } from "../lib/supabase-env.mjs";
const rows = await selectAll("areas", "id,blurb", "blurb=not.is.null", { pageSize: 1000 });
const L = rows.map((r) => String(r.blurb || "").trim().length).filter((n) => n > 0).sort((a, b) => a - b);
const q = (p) => L[Math.min(L.length - 1, Math.floor(L.length * p))];
console.log(`areas with a blurb: ${L.length}`);
console.log(`median ${q(0.5)}  p75 ${q(0.75)}  p90 ${q(0.9)}  p99 ${q(0.99)}  max ${L[L.length - 1]}`);
for (const t of [500, 700, 1000, 2000]) console.log(`over ${t} chars: ${L.filter((n) => n > t).length}`);

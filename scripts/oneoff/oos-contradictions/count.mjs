// Census: how many routes carry enough enrichment for two fields to disagree, in and out of WA.
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
async function c(q) { const t0 = Date.now(); const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id&limit=1&${q}`, { headers: { ...headers(key), Prefer: "count=exact" } }); console.log(q.slice(0, 90).padEnd(90), r.status, r.headers.get("content-range"), Date.now() - t0 + "ms"); }
await c("");
for (const f of ["overview", "timing", "itinerary", "pitch_detail", "waypoints", "approach", "approach_variants", "climbing_route", "seasonal_guidance", "road", "access"]) await c(`${f}=not.is.null`);
const RICH = "or=(timing.not.is.null,itinerary.not.is.null,waypoints.not.is.null,approach_variants.not.is.null,climbing_route.not.is.null,seasonal_guidance.not.is.null)";
await c(RICH);
await c(RICH + "&id=like.wa_*");

// Does the gear_confidence caveat actually reach anybody?
//
// It lives in RouteRackBox's non-generic caption, and that branch is chosen by
// `rackGeneric = !routeRackFor(route)`, where routeRackFor reads `detailed_rack` or
// `pro_needs` — NOT `rack`/`gear`. So an "inferred" route with neither column falls into the
// GENERIC branch, whose copy already says "nobody has recorded what this route itself takes"
// and is the stronger statement anyway. This measures how many inferred routes land in each
// branch, because a caveat that reaches 4 routes is not worth the line.
//
// Read-only. Service key: the anon role returns 57014 on this join.
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";
const K = requireServiceKey();
const count = async (filter) => {
  // The embed has to live INSIDE select=; appending it as its own param returns PGRST108.
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,areas!inner(path)&areas.path=cd.usa.washington&${filter}`,
    { headers: { ...headers(K), Prefer: "count=exact", Range: "0-0" } });
  if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 200));
  const n = Number((r.headers.get("content-range") || "/0").split("/")[1]);
  if (!Number.isFinite(n)) throw new Error("no count header — refusing to report a number I did not get");
  return n;
};

const INF = "gear_confidence=eq.inferred";
const VER = "gear_confidence=eq.verified";
const HAS_RACK_COL = "or=(detailed_rack.not.is.null,pro_needs.not.is.null)";

console.log("WA routes — does the caveat reach them?");
const infTotal = await count(INF);
const infReaches = await count(`${INF}&${HAS_RACK_COL}`);
const verTotal = await count(VER);
const verReaches = await count(`${VER}&${HAS_RACK_COL}`);
console.log(`  inferred, total                        ${infTotal}`);
console.log(`  inferred WITH detailed_rack/pro_needs  ${infReaches}   <-- the caveat renders here`);
console.log(`  inferred without (generic branch)      ${infTotal - infReaches}   (already says "nobody has recorded…")`);
console.log(`  verified, total                        ${verTotal}`);
console.log(`  verified WITH detailed_rack/pro_needs  ${verReaches}   (stays silent, deliberately)`);

// How many routes had rappel info split across, or missing from, the Overview tab?
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const key = anonKey();
const count = async (filter) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id&${filter}`,
    { headers: headers(key, { Prefer: "count=exact", Range: "0-0" }) });
  return Number((r.headers.get("content-range") || "/0").split("/")[1]);
};
const summaryOnly = await count("rappels=not.is.null&rappel_detail=is.null");
const bothSet = await count("rappels=not.is.null&rappel_detail=not.is.null");
const detailOnly = await count("rappels=is.null&rappel_detail=not.is.null");
console.log("rappels summary only  (showed NOTHING on Overview, box was on Plan):", summaryOnly);
console.log("both summary + table  (descent SPLIT across two tabs):             ", bothSet);
console.log("table only            (already on Overview):                       ", detailOnly);
console.log("total routes with any rappel info:", summaryOnly + bothSet + detailOnly);

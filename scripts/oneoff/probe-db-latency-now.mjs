// Is the Supabase project actually responding right now? Direct evidence for whether a
// red check:field-renders is the app or the network.
import { SUPABASE_URL, anonKey as anonKeyFn } from "../lib/supabase-env.mjs";

const url = SUPABASE_URL, anonKey = anonKeyFn();
const t = async (label, path) => {
  const t0 = Date.now();
  try {
    const r = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: AbortSignal.timeout(30000),
    });
    const body = await r.text();
    console.log(`  ${label.padEnd(28)} ${r.status}  ${String(Date.now() - t0).padStart(6)}ms  ${body.slice(0, 60)}`);
  } catch (e) {
    console.log(`  ${label.padEnd(28)} ERR   ${String(Date.now() - t0).padStart(6)}ms  ${e.name}: ${e.message}`);
  }
};

console.log("\nSupabase reachability, " + new Date().toISOString() + "\n");
await t("warm-up (1 area)", "areas?select=id&limit=1");
await t("1 route, 1 column", "routes?select=id,approach&approach=not.is.null&limit=1");
await t("1 route, descent_text", "routes?select=id,descent_text&descent_text=not.is.null&limit=1");
await t("count routes (head)", "routes?select=id&limit=1");

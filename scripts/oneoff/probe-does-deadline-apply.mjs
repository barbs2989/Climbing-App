/* Does the `global.fetch` deadline in lib/supabase.js ever actually apply?

   It is guarded with `if (init.signal) return fetch(input, init)` — on the reasoning that
   supabase-js passes its own signal for realtime and aborted refetches, and overwriting it
   would break cancellation. If supabase-js sets a signal on EVERY request, that guard makes
   the deadline a no-op and the fix does nothing.

   Asks the question directly against a backend that accepts and never answers. */
import { createClient } from "@supabase/supabase-js";

// createClient builds a realtime client eagerly and Node has no WebSocket constructor here.
// Only the PostgREST path is under test, so a stub is enough.
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() {} close() {} addEventListener() {} };

const DEAD = process.argv[2] || "http://127.0.0.1:8799";
let calls = 0, withSignal = 0; const T0 = Date.now();
const spyFetch = (input, init = {}) => {
  calls++;
  if (init.signal) withSignal++;
  console.log(`  fetch #${calls}: ${String(input).replace(DEAD,"")} signal=${init.signal?"SET":"absent"} t+${Date.now()-T0}ms`);
  // Always bound it here so the probe itself terminates.
  return fetch(input, { ...init, signal: init.signal || AbortSignal.timeout(6000) });
};

const sb = createClient(DEAD, "fake-anon-key", { auth: { persistSession: false }, global: { fetch: spyFetch } });
console.log(`querying ${DEAD} (accepts, never answers)…`);
const t0 = Date.now();
const { data, error } = await sb.from("areas").select("*").is("parent_id", null);
console.log(`\nreturned after ${Date.now() - t0}ms`);
console.log(`  data  = ${JSON.stringify(data)}`);
console.log(`  error = ${error ? JSON.stringify({ message: error.message, name: error.name }) : "null"}`);
console.log(`\n${withSignal} of ${calls} call(s) arrived with a signal already set.`);
console.log(withSignal === calls && calls > 0
  ? "=> the `if (init.signal)` guard SKIPS every request: the deadline is a NO-OP."
  : "=> the deadline does apply to ordinary queries.");

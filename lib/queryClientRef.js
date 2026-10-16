// The app's ONE QueryClient, reachable from plain async functions in lib/ — a write that must
// refresh the queries reading its table, and a sign-out that must drop the climber's cached
// answers. main.jsx sets it once; nothing else assigns it. Before main.jsx runs (or in a guard
// that imports lib/ without a client) every helper here is a no-op, never a throw.
let qc = null;
export function setQueryClient(c) { qc = c; }
export function getQueryClient() { return qc; }
// Marks every query under each key prefix stale and refetches the mounted ones. A prefix with a
// trailing undefined (an unknown uid) would match nothing, so such keys are dropped first.
export function invalidateKeys(keys) {
  if (!qc) return;
  keys.filter((k) => Array.isArray(k) && !k.some((p) => p === undefined)).forEach((k) => qc.invalidateQueries({ queryKey: k }));
}

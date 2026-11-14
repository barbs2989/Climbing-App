// Signed database hooks (0429). The database signs "<timestamp>.<kind>.<id>" with HMAC-SHA256 and a
// shared secret; the edge function recomputes it. The timestamp bounds how long a captured call can be
// replayed. Pure (no Deno.env), so scripts/check-hook-signature.mjs can test it under Node.

export const MAX_AGE_SEC = 10 * 60; // pg_net sends after commit; allow a backed-up queue
export const MAX_SKEW_SEC = 60;     // database clock slightly ahead of the function's

export type HookCheck = "ok" | "unsigned" | "stale" | "bad_signature";

export async function hookSignature(secret: string, ts: string, kind: string, id: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(ts + "." + kind + "." + id)));
  return Array.from(mac).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function checkHook(
  secret: string, ts: string | null, signature: string | null, kind: string, id: string, nowMs = Date.now(),
): Promise<HookCheck> {
  const t = ts || "", given = (signature || "").toLowerCase();
  if (!/^\d{1,12}$/.test(t) || !/^[0-9a-f]{64}$/.test(given)) return "unsigned";
  const age = Math.floor(nowMs / 1000) - Number(t);
  if (age > MAX_AGE_SEC || age < -MAX_SKEW_SEC) return "stale";
  const want = await hookSignature(secret, t, kind, id);
  let diff = 0; // constant time: never stop at the first differing character
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0 ? "ok" : "bad_signature";
}

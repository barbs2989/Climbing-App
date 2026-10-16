// Server-side rate limiting for the Edge Functions, backed by public.edge_rate_events
// (migration 0183 -- service role only, no public access).
//
// Why a table and not a client-supplied value: the old rate-limit-gps function took
// `ipAddress` from the REQUEST BODY, so any caller could name a fresh one per call.
// The IP here comes from the platform's forwarding headers, which the caller does
// not control.
//
// FAILS CLOSED. If the ledger cannot be read or written, the call is refused. These
// limits exist to stop spam, and a limiter that lets everything through whenever the
// database hiccups is a limiter an attacker only has to overload once.

// deno-lint-ignore no-explicit-any
type Client = any;

export type Limit = { bucket: string; key: string; limit: number; windowSec: number };

export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

// Keys are hashed so the ledger never stores a raw IP address or email.
export async function hashKey(value: string): Promise<string> {
  const data = new TextEncoder().encode("climbmatch-rl:" + value.toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// Returns true (and records the event) only if EVERY limit still has room.
// Checks all limits before recording any, so a refused call does not consume quota.
export async function allow(supabase: Client, limits: Limit[]): Promise<boolean> {
  try {
    const hashed = await Promise.all(limits.map(async (l) => ({ ...l, h: await hashKey(l.key) })));
    for (const l of hashed) {
      const since = new Date(Date.now() - l.windowSec * 1000).toISOString();
      const { count, error } = await supabase
        .from("edge_rate_events")
        .select("id", { count: "exact", head: true })
        .eq("bucket", l.bucket)
        .eq("key", l.h)
        .gte("created_at", since);
      if (error) {
        console.error(`[ratelimit] read failed for ${l.bucket}: ${error.message}`);
        return false;
      }
      if ((count ?? 0) >= l.limit) return false;
    }
    const { error: insErr } = await supabase
      .from("edge_rate_events")
      .insert(hashed.map((l) => ({ bucket: l.bucket, key: l.h })));
    if (insErr) {
      console.error(`[ratelimit] write failed: ${insErr.message}`);
      return false;
    }
    // Opportunistic cleanup, ~1 call in 50: nothing here needs more than a week.
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 8 * 86400 * 1000).toISOString();
      await supabase.from("edge_rate_events").delete().lt("created_at", cutoff);
    }
    return true;
  } catch (err) {
    console.error(`[ratelimit] threw: ${err && (err as Error).message}`);
    return false;
  }
}

export const HOUR = 3600;
export const DAY = 86400;
export const WEEK = 7 * DAY;

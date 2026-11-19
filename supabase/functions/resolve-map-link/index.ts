// resolve-map-link — expand a Google or Apple Maps SHORT link to the full link it redirects to.
//
// A crew's organiser pastes what a maps app's Share button hands out as the meet-up spot (0478). The
// phone apps share a short link (https://maps.app.goo.gl/…, https://maps.apple/p/…) that carries no
// coordinate; the full link it redirects to does. A browser cannot read another site's redirect, so
// this function follows it and returns the full link. The app reads the coordinate out of that link
// itself (lib/meetPin.js) and stores only the coordinate.
//
// It is NOT a general URL fetcher, and must never become one:
//   * the link must be https and on a maps SHORT-link host (the list below);
//   * every redirect is followed by hand, and each hop must be another short-link host or end on a
//     Google Maps / Apple Maps host — anything else is refused, so the function cannot be pointed at
//     an internal address or used to probe other sites;
//   * at most 5 hops, 6 seconds each; the response BODY is never read or returned;
//   * a signed-in climber only (the user id comes from the verified JWT), 40 links an hour each.
// Nothing about the link is stored or logged.
//
// Deploy: npx supabase functions deploy resolve-map-link     (JWT verified at the gateway)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { allow, HOUR } from "../_shared/ratelimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-store",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const isShort = (u: URL) => {
  const h = u.hostname.toLowerCase();
  return h === "maps.app.goo.gl" || (h === "goo.gl" && u.pathname.startsWith("/maps")) || h === "maps.apple" || h.endsWith(".maps.apple");
};
const isMaps = (u: URL) => {
  const h = u.hostname.toLowerCase();
  if (h === "maps.apple.com") return true;
  return /^(?:www\.|maps\.)?google\.[a-z]{2,3}(?:\.[a-z]{2})?$/.test(h) && (h.startsWith("maps.") || u.pathname.startsWith("/maps"));
};
const https = (s: string, base?: URL): URL | null => {
  try { const u = new URL(s, base); return u.protocol === "https:" && !u.username && !u.password && (u.port === "" || u.port === "443") ? u : null; } catch (_e) { return null; }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    const uid = userData && userData.user && userData.user.id;
    if (userErr || !uid) return json({ error: "Sign in required" }, 401);

    const body = await req.json().catch(() => ({}));
    const raw = body && typeof body.url === "string" ? body.url.trim() : "";
    let cur = raw.length <= 500 ? https(raw) : null;
    if (!cur || !isShort(cur)) return json({ error: "Not a Google or Apple Maps short link" }, 400);

    if (!(await allow(supabase, [{ bucket: "resolve-map-link", key: uid, limit: 40, windowSec: HOUR }]))) {
      return json({ error: "Too many links just now — try again in a while, or paste the coordinates." }, 429);
    }

    for (let hop = 0; hop < 5; hop++) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 6000);
      let res: Response;
      try {
        res = await fetch(cur.href, { method: "GET", redirect: "manual", signal: ctl.signal, headers: { "User-Agent": "ClimbMatch-link-expander/1.0", "Accept": "text/html" } });
      } finally { clearTimeout(timer); }
      const loc = res.headers.get("location");
      try { await res.body?.cancel(); } catch (_e) { /* nothing to release */ }
      if (res.status < 300 || res.status >= 400 || !loc) return json({ error: "That link did not lead to a map" }, 422);
      const next = https(loc, cur);
      if (!next) return json({ error: "That link did not lead to a map" }, 422);
      if (isMaps(next)) return json({ url: next.href });
      if (!isShort(next)) return json({ error: "That link did not lead to a map" }, 422);
      cur = next;
    }
    return json({ error: "That link did not lead to a map" }, 422);
  } catch (err) {
    console.error("resolve-map-link failed:", err && (err as Error).name);
    return json({ error: "Could not open that link just now" }, 502);
  }
});

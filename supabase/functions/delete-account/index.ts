// delete-account — a climber deletes their own account and data, from inside the app.
//
// Apple 5.1.1(v): "If your app supports account creation, you must also offer account deletion
// within the app", and the whole account record and its personal data, not a deactivation. Before
// this the app recorded a request that nothing processed (docs/SAFETY-AND-MODERATION-PLAN.md Part 2).
//
// Who: the signed-in climber, for THEIR OWN account only — the user id comes from the verified JWT,
// never from the request body. An admin account is refused (deleting the only reviewer would leave
// every report unanswered; hand that over first).
// Order matters, because each step makes the next one possible:
//   1. their uploaded FILES (topo-photos/<uid>/…, guide-documents/<uid>/…) — a row delete leaves a
//      file reachable at its public URL;
//   2. their contributions — `contributor` is text, not a foreign key, so nothing would cascade;
//   3. the auth user — everything else is keyed to it and cascades (0266 made the last nine
//      blocking foreign keys cascade or set null).
//
// Deploy: npx supabase functions deploy delete-account     (JWT verified at the gateway)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function removePrefix(supabase: any, bucket: string, prefix: string): Promise<number> {
  let removed = 0;
  for (let round = 0; round < 50; round++) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error) throw new Error(bucket + " list: " + error.message);
    const files = (data || []).filter((f: any) => f && f.name && f.id);
    const folders = (data || []).filter((f: any) => f && f.name && !f.id);
    for (const d of folders) removed += await removePrefix(supabase, bucket, prefix + "/" + d.name);
    if (!files.length) break;
    const { error: rmErr } = await supabase.storage.from(bucket).remove(files.map((f: any) => prefix + "/" + f.name));
    if (rmErr) throw new Error(bucket + " remove: " + rmErr.message);
    removed += files.length;
    if (files.length < 1000) break;
  }
  return removed;
}

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
    if (!body || body.confirm !== "DELETE") return json({ error: "Confirmation missing" }, 400);

    const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", uid).maybeSingle();
    if (prof && prof.is_admin) return json({ error: "An admin account can’t delete itself here — hand ClimbMatch Safety to another admin first." }, 409);

    const files = (await removePrefix(supabase, "topo-photos", uid)) + (await removePrefix(supabase, "guide-documents", uid));
    const { error: cErr } = await supabase.from("contributions").delete().eq("contributor", uid);
    if (cErr) throw new Error("contributions: " + cErr.message);
    const { error: dErr } = await supabase.auth.admin.deleteUser(uid);
    if (dErr) throw new Error("auth: " + dErr.message);
    // Read back: a delete that "succeeded" but left the user is the false confirmation this app has
    // shipped before. The profile cascades from the auth user, so its absence is the evidence.
    const { data: still } = await supabase.from("profiles").select("id").eq("id", uid).maybeSingle();
    if (still) throw new Error("the profile is still there after the auth delete");
    return json({ deleted: true, files });
  } catch (err) {
    console.error("delete-account failed:", err && (err as Error).message);
    return json({ error: "Your account could not be deleted right now — nothing has been signed out. Try again in a moment." }, 500);
  }
});

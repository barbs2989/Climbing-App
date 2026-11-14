// One-shot proof for 0322 saved_areas: two REAL signed-in accounts (throwaway, deleted after),
// the anon key, never the service key for the assertions. A saves an area; A reads it; B cannot
// read, delete or forge it; A removes it and the read is empty.
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";
const admin = createClient(SUPABASE_URL, requireServiceKey(), { auth: { persistSession: false }, realtime: { transport: ws } });
const stamp = Date.now(), pw = "Pw-" + stamp + "-x9!";
const mk = async (tag) => { const { data, error } = await admin.auth.admin.createUser({ email: `saved-areas-${tag}-${stamp}@example.com`, password: pw, email_confirm: true }); if (error) throw error; return data.user; };
const signIn = async (u) => { const c = createClient(SUPABASE_URL, anonKey(), { auth: { persistSession: false }, realtime: { transport: ws } }); const { error } = await c.auth.signInWithPassword({ email: u.email, password: pw }); if (error) throw error; return c; };
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const A = await mk("a"), B = await mk("b");
try {
  const { data: area } = await admin.from("areas").select("id").limit(1).single();
  const a = await signIn(A), b = await signIn(B);
  ok(!(await a.from("saved_areas").insert({ user_id: A.id, area_id: area.id })).error, "A saves an area");
  const again = await a.from("saved_areas").insert({ user_id: A.id, area_id: area.id });
  ok(again.error && again.error.code === "23505", "saving twice is 23505 (the client treats it as saved)");
  ok(((await a.from("saved_areas").select("area_id").eq("user_id", A.id)).data || []).length === 1, "A reads it back");
  ok(((await b.from("saved_areas").select("area_id").eq("user_id", A.id)).data || []).length === 0, "B cannot read A's");
  await b.from("saved_areas").delete().eq("user_id", A.id);
  ok(((await admin.from("saved_areas").select("area_id").eq("user_id", A.id)).data || []).length === 1, "B cannot delete A's");
  ok(!!(await b.from("saved_areas").insert({ user_id: A.id, area_id: area.id })).error, "B cannot forge a row for A");
  ok(!(await a.from("saved_areas").delete().eq("user_id", A.id).eq("area_id", area.id)).error, "A removes it");
  ok(((await admin.from("saved_areas").select("area_id").eq("user_id", A.id)).data || []).length === 0, "...and it is gone (service-key re-read)");
} finally { await admin.auth.admin.deleteUser(A.id); await admin.auth.admin.deleteUser(B.id); }
console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);

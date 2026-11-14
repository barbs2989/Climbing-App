// One-off probe for 0326 + lib/live.js: do Realtime changes on group_posts and comments actually
// REACH a second real account, and does RLS keep them from a reader who may not see them?
//
//   node scripts/oneoff/probe-live-comments-group-posts.mjs
//
// Uses the per-run fixture (two throwaway accounts in a PRIVATE group, swept afterwards). The
// owner writes; the mate and an anonymous client listen exactly the way useLiveQuery does
// (INSERT/UPDATE with a server filter, DELETE unfiltered). Pass = the mate hears INSERT, UPDATE
// and DELETE for a post and INSERT for a comment on it; the anonymous client hears no INSERT.
import { createClient } from "@supabase/supabase-js";
import WS from "ws";
import { createFixture } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import { liveChangeTouches, inFilter } from "../../lib/liveMatch.js";

const log = (...a) => console.log(...a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fx = await createFixture(log);
const fails = [];
const clients = [];
try {
  const signedIn = async (u) => {
    const c = createClient(SUPABASE_URL, anonKey(), { auth: { persistSession: false }, realtime: { transport: WS } });
    const { error } = await c.auth.signInWithPassword({ email: u.email, password: u.password });
    if (error) throw error;
    clients.push(c);
    return c;
  };
  const owner = await signedIn(fx.owner);
  const mate = await signedIn(fx.mate);
  const anon = createClient(SUPABASE_URL, anonKey(), { auth: { persistSession: false }, realtime: { transport: WS } });
  clients.push(anon);
  const gid = fx.group.id;

  const listen = (c, name) => new Promise((resolve, reject) => {
    const heard = [];
    const ch = c.channel("probe-live:" + name);
    const push = (p) => heard.push(p.table + ":" + p.eventType);
    const f = inFilter("group_id", [gid]);
    if (!f) return reject(new Error("inFilter refused a single uuid"));
    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "group_posts", filter: f }, push);
    ch.on("postgres_changes", { event: "UPDATE", schema: "public", table: "group_posts", filter: f }, push);
    ch.on("postgres_changes", { event: "DELETE", schema: "public", table: "group_posts" }, push);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "comments" }, push);
    setTimeout(() => reject(new Error(name + " never reached SUBSCRIBED in 30s")), 30000);
    ch.subscribe((s, err) => { if (s === "SUBSCRIBED") resolve(heard); else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") reject(err || new Error(name + " " + s)); });
  });
  log("  signed in; subscribing");
  const mateHeard = await listen(mate, "mate");
  const anonHeard = await listen(anon, "anon");
  await wait(1500);

  const ins = await owner.from("group_posts").insert({ group_id: gid, author: fx.owner.id, body: "live probe" }).select("id").single();
  if (ins.error) throw ins.error;
  const pid = ins.data.id;
  await wait(2500);
  const up = await owner.from("group_posts").update({ body: "live probe, edited", edited: true }).eq("id", pid).select("id");
  if (up.error || !up.data.length) throw up.error || new Error("update refused");
  await wait(2500);
  const cm = await owner.from("comments").insert({ target_id: "gp_" + pid, user_id: fx.owner.id, text: "live probe comment" }).select("id").single();
  if (cm.error) throw cm.error;
  await wait(2500);
  await owner.from("comments").delete().eq("id", cm.data.id);
  const del = await owner.from("group_posts").delete().eq("id", pid).select("id");
  if (del.error || !del.data.length) throw del.error || new Error("delete refused");
  await wait(3000);

  log("  mate heard:", mateHeard.join(", ") || "(nothing)");
  log("  anon heard:", anonHeard.join(", ") || "(nothing)");
  for (const want of ["group_posts:INSERT", "group_posts:UPDATE", "group_posts:DELETE", "comments:INSERT", "comments:DELETE"]) {
    if (!mateHeard.includes(want)) fails.push("mate never heard " + want);
  }
  for (const leak of ["group_posts:INSERT", "group_posts:UPDATE"]) {
    if (anonHeard.includes(leak)) fails.push("RLS LEAK: an anonymous reader heard " + leak + " in a private group");
  }
  // The client-side decision useLiveQuery takes, on the payload shapes Realtime sends.
  const rule = { match: (r) => r.group_id === gid, cached: (o, d) => (d || []).some((x) => x.id === o.id) };
  if (!liveChangeTouches({ eventType: "INSERT", new: { group_id: gid } }, rule, [])) fails.push("touches: INSERT in the group read as irrelevant");
  if (liveChangeTouches({ eventType: "INSERT", new: { group_id: "other" } }, rule, [])) fails.push("touches: INSERT elsewhere read as relevant");
  if (!liveChangeTouches({ eventType: "DELETE", old: { id: "a" } }, rule, [{ id: "a" }])) fails.push("touches: DELETE of a held row read as irrelevant");
  if (liveChangeTouches({ eventType: "DELETE", old: { id: "b" } }, rule, [{ id: "a" }])) fails.push("touches: DELETE of a row not held read as relevant");
  if (inFilter("target_id", ["r1", "https://x/y.jpg?a=1"]) !== undefined) fails.push("inFilter accepted a photo URL");
} catch (e) {
  fails.push("probe error: " + (e && e.message || e));
} finally {
  for (const c of clients) await c.removeAllChannels().catch(() => {});
  const left = await fx.cleanup();
  if (left.length) fails.push("fixture accounts left behind: " + left.join(", "));
}
if (fails.length) { console.log("FAIL\n  " + fails.join("\n  ")); process.exit(1); }
console.log("PASS: comments and group posts reach a member live, and RLS keeps a private group's posts from an outsider");
process.exit(0);

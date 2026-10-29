// One-off probe for 0380 + lib/live.js onTakedown: does a moderator's take-down REACH another
// reader at once, and does the broadcast carry nothing but the row's id?
//
//   node scripts/oneoff/probe-live-takedown.mjs
//
// Uses the per-run fixture (two throwaway accounts in a PRIVATE group, swept afterwards). The
// owner posts; the mate listens on the `moderation` topic the way lib/live.js does. The take-down
// is applied the way moderate_content() applies it (the moderation bypass flag, then an UPDATE of
// `moderation`), through `npx supabase db query --linked`, because the fixture has no admin.
// Pass = the mate hears { table: "group_posts", id } with no other field, and can no longer read
// the post; an UPDATE that leaves the post visible broadcasts nothing.
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import WS from "ws";
import { createFixture } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import { liveChangeTouches } from "../../lib/liveMatch.js";

const log = (...a) => console.log(...a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => execFileSync("npx", ["supabase", "db", "query", "--linked", q], { encoding: "utf8" });
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
  const heard = [];
  await new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error("mate never reached SUBSCRIBED in 30s")), 30000);
    mate.channel("moderation").on("broadcast", { event: "taken_down" }, (m) => heard.push(m.payload))
      .subscribe((s, err) => { if (s === "SUBSCRIBED") resolve(); else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") reject(err || new Error(s)); });
  });
  const ins = await owner.from("group_posts").insert({ group_id: fx.group.id, author: fx.owner.id, body: "takedown probe" }).select("id").single();
  if (ins.error) throw ins.error;
  const pid = ins.data.id;
  if (!/^[0-9a-f-]{36}$/.test(pid)) throw new Error("unexpected post id " + pid);
  await wait(1500);
  const edit = await owner.from("group_posts").update({ body: "takedown probe, edited", edited: true }).eq("id", pid).select("id");
  if (edit.error || !edit.data.length) throw edit.error || new Error("edit refused");
  await wait(2500);
  if (heard.length) fails.push("an edit that left the post visible broadcast: " + JSON.stringify(heard));
  sql(`do $$ begin perform set_config('app.moderation_bypass', 'on', true); update group_posts set moderation = 'removed' where id = '${pid}'; end $$;`);
  await wait(4000);
  log("  mate heard:", JSON.stringify(heard));
  const got = heard.find((p) => p && p.id === pid);
  if (!got) fails.push("the mate never heard the take-down");
  else {
    if (got.table !== "group_posts") fails.push("broadcast named table " + got.table);
    const extra = Object.keys(got).filter((k) => k !== "table" && k !== "id");
    if (extra.length) fails.push("broadcast carried more than the id: " + extra.join(", "));
    const rule = { table: "group_posts", cached: (o, d) => (d || []).some((x) => x.id === o.id) };
    if (!liveChangeTouches({ eventType: "DELETE", old: { id: got.id } }, rule, [{ id: pid }])) fails.push("touches: take-down of a held post read as irrelevant");
  }
  const reread = await mate.from("group_posts").select("id").eq("id", pid);
  if (reread.error) fails.push("mate re-read failed: " + reread.error.message);
  else if (reread.data.length) fails.push("the mate can still read the removed post");
  await owner.from("group_posts").delete().eq("id", pid);
} catch (e) {
  fails.push("probe error: " + (e && e.message || e));
} finally {
  for (const c of clients) await c.removeAllChannels().catch(() => {});
  const left = await fx.cleanup();
  if (left.length) fails.push("fixture accounts left behind: " + left.join(", "));
}
if (fails.length) { console.log("FAIL\n  " + fails.join("\n  ")); process.exit(1); }
console.log("PASS: a take-down reaches another reader at once, as a bare id");
process.exit(0);

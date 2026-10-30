// Live React Query reads over Supabase Realtime. Before this, a comment or group post someone
// else wrote reached you only when something refetched: a reload, a window refocus, or one of
// your own writes. useLiveQuery() subscribes the query to the tables it reads, and any
// INSERT/UPDATE/DELETE that touches the rows it holds refetches it.
//
// IT REFETCHES THE QUERY. IT DOES NOT PATCH THE CACHE FROM THE PAYLOAD. A Realtime payload is
// one bare row: it has none of the embeds the readers need (the author's profile, the
// reactions), and a DELETE carries only the primary key. A refetch goes back through the same
// queryFn, under the same RLS, so it returns exactly the rows the screen would get on a reload.
// Changes that arrive together (one write echoes on two tables, e.g. a comment and its
// reaction) collapse into one refetch through a short debounce.
//
// WHAT REALTIME CANNOT SEE: Postgres Changes applies RLS to INSERT and UPDATE, so an UPDATE
// that makes a row unreadable to you (a moderator taking a comment down) is never sent to you.
// 0380 covers that case with a broadcast of the bare id (onTakedown below). DELETE is
// not RLS-filtered (it carries only the primary key), which is why `touches` below checks a
// DELETE against the rows already in the cache instead of trusting the server to filter it.
//
// The tables must be in the `supabase_realtime` publication (0071 messages, 0326 comments and
// group posts), or the channel subscribes and then hears nothing.
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { LIVE_DEBOUNCE_MS, liveChangeTouches } from "./liveMatch";
export { liveChangeTouches, inFilter } from "./liveMatch";

let liveSeq = 0;

// TAKE-DOWNS (0380). Realtime never sends a reader the UPDATE that hides a row from them, so
// moderate_content()'s trigger broadcasts { table, id } on the public topic `moderation` instead.
// ONE channel for the whole app, opened by the first live query and kept: every live query adds a
// listener here and treats the message as a DELETE of that id, checked against what it holds.
const takedownListeners = new Set();
let takedownChannel = null;
function onTakedown(fn) {
  takedownListeners.add(fn);
  if (!takedownChannel) {
    takedownChannel = supabase.channel("moderation")
      .on("broadcast", { event: "taken_down" }, (msg) => { takedownListeners.forEach((l) => l(msg && msg.payload)); })
      .subscribe();
  }
  return () => { takedownListeners.delete(fn); };
}
// useQuery, plus a Realtime subscription to the tables in `rules`. Each rule:
//   { table, filter?, match(row, data), cached?(oldRow, data) }
// `filter` is an optional server-side Postgres Changes filter ("group_id=in.(…)"); INSERT and
// UPDATE are always re-checked with `match` on the client (and DELETE is never filtered, see
// below), so a missing filter only costs bandwidth, never correctness.
export function useLiveQuery(options, rules) {
  const q = useQuery(options);
  const qc = useQueryClient();
  const rulesRef = useRef(rules);
  rulesRef.current = rules;
  const enabled = !!supabase && options.enabled !== false && Array.isArray(rules) && rules.length > 0;
  const keyStr = JSON.stringify(options.queryKey);
  const shape = JSON.stringify((rules || []).map((r) => [r.table, r.filter || ""]));
  useEffect(() => {
    if (!enabled) return undefined;
    const queryKey = JSON.parse(keyStr);
    let timer = null;
    const refetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; qc.invalidateQueries({ queryKey, exact: true }); }, LIVE_DEBOUNCE_MS);
    };
    // The client reuses a channel whose topic already exists, so two screens reading the same
    // key would share one, and the first to unmount would remove it from under the other.
    const ch = supabase.channel("live:" + keyStr + ":" + (++liveSeq));
    JSON.parse(shape).forEach(([table, filter], i) => {
      const on = (payload) => {
        const rule = rulesRef.current && rulesRef.current[i];
        if (liveChangeTouches(payload, rule, qc.getQueryData(queryKey))) refetch();
      };
      // Postgres Changes cannot filter a DELETE (the old row is only its primary key), and a
      // filtered "*" listener never hears one. So a filter covers INSERT and UPDATE, and the
      // DELETE listener is always unfiltered and checked against the cache.
      if (filter) {
        ch.on("postgres_changes", { event: "INSERT", schema: "public", table, filter }, on);
        ch.on("postgres_changes", { event: "UPDATE", schema: "public", table, filter }, on);
        ch.on("postgres_changes", { event: "DELETE", schema: "public", table }, on);
      } else {
        ch.on("postgres_changes", { event: "*", schema: "public", table }, on);
      }
    });
    const offTakedown = onTakedown((p) => {
      const rule = p && rulesRef.current && rulesRef.current.find((r) => r.table === p.table);
      if (rule && liveChangeTouches({ eventType: "DELETE", old: { id: p.id } }, rule, qc.getQueryData(queryKey))) refetch();
    });
    // A drop and reconnect may have missed changes: refetch once when the channel comes back.
    let joined = false;
    ch.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      if (joined) refetch();
      joined = true;
    });
    return () => { if (timer) clearTimeout(timer); offTakedown(); supabase.removeChannel(ch); };
  }, [enabled, keyStr, shape, qc]);
  return q;
}

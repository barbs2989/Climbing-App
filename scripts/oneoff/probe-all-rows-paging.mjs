#!/usr/bin/env node
// run: node --experimental-websocket scripts/oneoff/probe-all-rows-paging.mjs
//      (supabase-js needs a WebSocket global; Node 20 has none without the flag)
// VERIFY lib/db.js allRows() against the live database with a SMALL page so the boundary fires:
// the same helper body, PAGE=100, on the area with the most direct routes (356 on 2026-10-08) and
// the parent with the most direct children (134). Expects every row, in the same order the
// single-request chain returns, and one more request than full pages.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";

const supabase = createClient(SUPABASE_URL, anonKey());
let requests = 0;
async function allRows(build, PAGE) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    requests++;
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data || [];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

let bad = 0;
async function compare(label, build) {
  requests = 0;
  const paged = await allRows(build, 100);
  const { data: whole, error } = await build();
  if (error) throw error;
  const same = paged.length === whole.length && paged.every((r, i) => r.id === whole[i].id);
  const expectReq = Math.floor(whole.length / 100) + 1;
  console.log(`${same && requests === expectReq ? "ok  " : "FAIL"} ${label}: paged ${paged.length} rows in ${requests} request(s) (expected ${expectReq}); single request ${whole.length}; order identical: ${same}`);
  if (!(same && requests === expectReq)) bad++;
}

await compare("routes under tn_stone_fort_bouldering_climbs", () => supabase.from("routes").select("id,name").eq("area_id", "tn_stone_fort_bouldering_climbs").order("sort_order", { ascending: true, nullsFirst: false }).order("name"));
await compare("children of co_boulder_canyon", () => supabase.from("areas").select("id,name").eq("parent_id", "co_boulder_canyon").order("route_count", { ascending: false }).order("name"));
await compare("children of a leaf (empty)", () => supabase.from("areas").select("id,name").eq("parent_id", "tn_stone_fort_bouldering_climbs").order("name"));
process.exit(bad ? 1 : 0);

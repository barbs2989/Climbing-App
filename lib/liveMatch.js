// The pure half of lib/live.js: no imports, so a Node probe or guard can RUN it without React
// or a Supabase client (scripts/oneoff/probe-live-comments-group-posts.mjs does).

// How long changes are collected before one refetch. Long enough to merge a write's echoes,
// short enough that a new comment reads as instant.
export const LIVE_DEBOUNCE_MS = 300;

// Pure, so a guard can RUN it without a channel. Does this Realtime payload change what the
// query holds?
//   rule.match(row, data)  — for INSERT/UPDATE: is this new row one the query reads?
//   rule.cached(old, data) — for DELETE: was this row (primary key only) in the cached answer?
// A rule with no `cached` treats every DELETE as relevant: a wasted refetch costs less than a
// row that stays on screen after its author deleted it.
export function liveChangeTouches(payload, rule, data) {
  if (!payload || !rule) return false;
  const ev = payload.eventType;
  if (ev === "INSERT" || ev === "UPDATE") return !!(payload.new && rule.match(payload.new, data));
  if (ev === "DELETE") return rule.cached ? !!(payload.old && rule.cached(payload.old, data)) : true;
  return false;
}

// "col=in.(a,b)" for a Postgres Changes filter, or undefined when the values cannot be put in
// one safely. Realtime caps `in` at 100 values, and a value outside a plain id's characters (a
// comma, a bracket, a photo URL's slashes and query string) could break the list; past either limit there is no server filter and `match` does all the work.
export function inFilter(col, values) {
  const v = [...new Set((values || []).filter(Boolean).map(String))];
  if (!v.length || v.length > 100 || v.some((x) => !/^[A-Za-z0-9_.:-]+$/.test(x))) return undefined;
  return col + "=in.(" + v.join(",") + ")";
}

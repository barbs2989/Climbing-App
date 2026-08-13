// Supabase client + the Phase-0 feature flag.
// The app keeps reading its in-memory bundle UNLESS all three env vars are set:
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_USE_DB=true
// (put them in a .env.local file at the repo root, then restart `npm run dev`).
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// A password-reset link lands back here as `#access_token=...&type=recovery`, and it SIGNS THE
// USER IN. That is the trap: the app would see a session, render the full app, and never ask for
// a new password -- so the next visit locks them out again with the same forgotten password.
//
// Read the flag here, before createClient, because the client strips the hash as soon as it
// processes the URL. That processing is async, so a module that runs later would usually still
// see the hash -- "usually" being exactly the kind of ordering assumption that breaks silently.
// This file is imported before lib/auth.js (which imports it), so this line provably runs first.
export const RECOVERY_LINK = typeof window !== "undefined" && /[#&]type=recovery(&|$)/.test(window.location.hash || "");

/* Every request gets a DEADLINE, because the retry policy in main.jsx assumes failures are
   fast and a dead origin is the case where they are not.

   Measured against a real outage on 2026-08-12: the project stopped answering and Cloudflare
   returned 522 — but only after holding each connection for ~90 SECONDS. The client had no
   timeout, so React Query's `failureCount < 3` turned that into four sequential 90s waits plus
   backoff, and the Climbs tab sat on "Loading countries…" for the better part of six minutes
   with nothing on screen suggesting anything was wrong. A spinner that never resolves is the
   worst failure shape available: the user cannot tell it from a slow connection, so they wait
   instead of trying later, and the app has an error state it never reaches.

   25s is deliberately well above a healthy request. The cold-start note in CLAUDE.md measures
   the first call of a run at ~3.7s against 0.3-0.7s warm, and the anon role's own
   statement_timeout is 3s, so anything still open at 25s is not slow — it is not coming. The
   budget now collapses from ~6 minutes to ~100s worst case, and each attempt ends in a real
   AbortError that the query's error branch can actually render.

   `signal` is only set when the caller has not supplied one: supabase-js passes its own signal
   for realtime and for aborted refetches, and overwriting it would silently break cancellation. */
const REQUEST_DEADLINE_MS = 25000;
const deadlineFetch = (input, init = {}) => {
  if (init.signal || typeof AbortSignal === "undefined" || !AbortSignal.timeout) return fetch(input, init);
  return fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_DEADLINE_MS) });
};

export const supabase = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "climbmatch-auth" }, global: { fetch: deadlineFetch } }) : null;

// Off by default — flipping this on is how you validate the DB path end-to-end.
export const USE_DB = import.meta.env.VITE_USE_DB === "true" && !!supabase;

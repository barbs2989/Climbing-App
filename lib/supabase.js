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

export const supabase = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "climbmatch-auth" } }) : null;

// Off by default — flipping this on is how you validate the DB path end-to-end.
export const USE_DB = import.meta.env.VITE_USE_DB === "true" && !!supabase;

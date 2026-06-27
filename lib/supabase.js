// Supabase client + the Phase-0 feature flag.
// The app keeps reading its in-memory bundle UNLESS all three env vars are set:
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_USE_DB=true
// (put them in a .env.local file at the repo root, then restart `npm run dev`).
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "climbmatch-auth" } }) : null;

// Off by default — flipping this on is how you validate the DB path end-to-end.
export const USE_DB = import.meta.env.VITE_USE_DB === "true" && !!supabase;

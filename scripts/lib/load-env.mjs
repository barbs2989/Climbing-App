// Side-effect import for one-off scripts that read process.env directly.
// Copies the Supabase URL, the anon key and the service key from .env / .env.local
// (through supabase-env.mjs) into process.env, so no script carries a project URL or key
// in its source. Import it before the first line that reads process.env.
import { loadEnv } from "./supabase-env.mjs";

const env = loadEnv();
for (const k of ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (env[k]) process.env[k] = env[k];
}

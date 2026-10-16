// The Partners tab offers "Hire a vetted, certified guide", while the legal copy says we "do not
// guarantee any guide's qualifications, insurance, or conduct" and memory records that guide
// applications reach no reviewer. Before treating the hero as an overpromise, measure what is
// actually there — and read the counts with BOTH keys, because an anon count on an RLS-protected
// table comes back 0 with a 200 whatever the table holds.
import { SUPABASE_URL, anonKey, requireServiceKey, headers, selectAll } from "../lib/supabase-env.mjs";

const svc = requireServiceKey();
const anon = anonKey();

const count = async (table, key) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id`, {
    headers: { ...headers(key), Prefer: "count=exact", Range: "0-0" },
  });
  if (!r.ok) return `HTTP ${r.status}`;
  return (r.headers.get("content-range") || "").split("/")[1] ?? "?";
};

for (const t of ["guide_profiles", "guide_documents", "guide_inquiries"]) {
  const a = await count(t, anon).catch((e) => "err " + e.message.slice(0, 40));
  const s = await count(t, svc).catch((e) => "err " + e.message.slice(0, 40));
  console.log(`${t.padEnd(18)} anon=${String(a).padStart(6)}  service=${String(s).padStart(6)}` +
    (String(a) !== String(s) ? "   <<< they disagree — the anon number is not evidence" : ""));
}

// A "vetted" claim needs a review step that produced a verdict. Ask what columns exist rather
// than guessing at one.
try {
  const rows = await selectAll("guide_profiles", "*", "", { pageSize: 200 });
  console.log(`\nguide_profiles: ${rows.length} row(s)`);
  if (rows.length) {
    console.log("columns:", Object.keys(rows[0]).join(", "));
    const by = {};
    for (const r of rows) { const k = String(r.status ?? "(no status column)"); by[k] = (by[k] || 0) + 1; }
    console.log("by status:", by);
  }
} catch (e) {
  console.log("\nguide_profiles detail read failed:", e.message.slice(0, 200));
}

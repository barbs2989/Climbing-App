// Live trust-score lookup.
//
// This file used to describe itself as "Persistence layer for logs, vouches, trust —
// bridges session-only state in ClimbMatch with Supabase persistence". That was true of an
// earlier design and became false: the app persists by calling lib/db.js directly
// (`createClimbLog`, `giveVouch`, `logBelajCatch`, … in ClimbMatch.jsx's own handlers), and
// nothing ever adopted the wrappers here.
//
// Checked across the whole tree before deleting them: `usePersistentLogs`,
// `usePersistentTripReports`, `usePersistentVouches`, `persistCreateLog`, `persistUpdateLog`,
// `persistDeleteLog`, `persistGiveVouch`, `persistRevokeVouch`, `persistLogBelajCatch` and
// `dbLogToLocal` had **zero references anywhere** — not calls, not re-exports, not aliases.
// `fetchTrustScore` is the only live export (ClimbMatch.jsx, ClimbMatchCore.jsx,
// RouteDetail.jsx).
//
// They are gone because a dead module that claims to be the persistence layer is worse than
// dead weight: it is where the next person goes to "fix persistence", and editing it changes
// nothing. The wrappers also duplicated mapping and error-shape logic that the real path in
// lib/db.js owns, so they were free to drift out of agreement with it unnoticed.
import { getTrustScore } from "./db";

/**
 * Fetch: live trust score for a user. Returns the score, or null if it cannot be read —
 * callers render their own fallback rather than a fabricated number.
 */
export async function fetchTrustScore(userId) {
  try {
    return await getTrustScore(userId);
  } catch (err) {
    console.error("Failed to fetch trust score:", err);
    return null;
  }
}

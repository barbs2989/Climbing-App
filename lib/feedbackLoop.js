// Feedback Loop Integration: Persistence layer for logs, vouches, trust
// This module bridges session-only state in ClimbMatch with Supabase persistence.
// Crew persistence lives in lib/db.js's useMyCrews/createCrew/etc. instead - see
// supabase/migrations/0036_crews_persistence.sql for why the two were kept separate
// (route_id typing, member privacy, and the auto-sync-everything-including-demo-
// -seed-crews bug this module's earlier crew helpers had).

import { useRouteTripReports, useUserLogs, useUserVouches, useClimberVouches, getTrustScore, createClimbLog, updateClimbLog, deleteClimbLog, giveVouch, revokeVouch, logBelajCatch } from "./db";

/**
 * Hook: Load user's climb logs from DB
 * Returns: { logs: [], loading, error }
 */
export function usePersistentLogs(userId) {
  const result = useUserLogs(userId);
  return {
    logs: result.data || [],
    loading: result.isLoading,
    error: result.error,
  };
}

/**
 * Hook: Load trip reports for a route (for consensus building)
 * Returns: { reports: [], loading, error }
 */
export function usePersistentTripReports(routeId) {
  const result = useRouteTripReports(routeId);
  return {
    reports: result.data || [],
    loading: result.isLoading,
    error: result.error,
  };
}

/**
 * Hook: Load vouches for/from a user
 * Returns: { given: [], received: [], loading, error }
 */
export function usePersistentVouches(userId, targetId) {
  const given = useUserVouches(userId);
  const received = useClimberVouches(targetId);

  return {
    given: given.data || [],
    received: received.data || [],
    loading: given.isLoading || received.isLoading,
    error: given.error || received.error,
  };
}

/**
 * Mutation: Create a climb log in DB
 * Returns: { success, log, error }
 */
export async function persistCreateLog(userId, routeId, logData) {
  try {
    const log = await createClimbLog(userId, routeId, logData);
    return { success: true, log, error: null };
  } catch (err) {
    console.error("Failed to create log:", err);
    return { success: false, log: null, error: err.message };
  }
}

/**
 * Mutation: Update a climb log in DB
 * Returns: { success, log, error }
 */
export async function persistUpdateLog(logId, updates) {
  try {
    const log = await updateClimbLog(logId, updates);
    return { success: true, log, error: null };
  } catch (err) {
    console.error("Failed to update log:", err);
    return { success: false, log: null, error: err.message };
  }
}

/**
 * Mutation: Delete a climb log from DB
 * Returns: { success, error }
 */
export async function persistDeleteLog(logId) {
  try {
    await deleteClimbLog(logId);
    return { success: true, error: null };
  } catch (err) {
    console.error("Failed to delete log:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Mutation: Give a vouch for a climber
 * Returns: { success, error }
 */
export async function persistGiveVouch(fromId, toId, reason) {
  try {
    await giveVouch(fromId, toId, reason);
    return { success: true, error: null };
  } catch (err) {
    console.error("Failed to give vouch:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Mutation: Revoke a vouch
 * Returns: { success, error }
 */
export async function persistRevokeVouch(fromId, toId) {
  try {
    await revokeVouch(fromId, toId);
    return { success: true, error: null };
  } catch (err) {
    console.error("Failed to revoke vouch:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Mutation: Log a belay catch for safety/trust feedback
 * Returns: { success, error }
 */
export async function persistLogBelajCatch(belayerId, climberId, dateOccurred, description) {
  try {
    await logBelajCatch(belayerId, climberId, dateOccurred, description);
    return { success: true, error: null };
  } catch (err) {
    console.error("Failed to log belay catch:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch: Get live trust score for a user
 * Returns: score (0-99) or null if not available
 */
export async function fetchTrustScore(userId) {
  try {
    const score = await getTrustScore(userId);
    return score;
  } catch (err) {
    console.error("Failed to fetch trust score:", err);
    return null;
  }
}

/**
 * Helper: Convert DB log format to ClimbMatch format
 */
export function dbLogToLocal(dbLog) {
  return {
    id: dbLog.id,
    routeId: dbLog.route_id,
    crewId: dbLog.crew_id,
    date: dbLog.date_climbed,
    stars: dbLog.stars,
    cond_tags: dbLog.cond_tags || [],
    notes: dbLog.notes,
    partners: dbLog.partners || [],
    discipline: dbLog.discipline,
    // Alpine/ice metrics
    car_to_car_minutes: dbLog.car_to_car_minutes,
    approach_minutes: dbLog.approach_minutes,
    climb_minutes: dbLog.climb_minutes,
    descent_minutes: dbLog.descent_minutes,
    snow_condition: dbLog.snow_condition,
    freezing_level_ft: dbLog.freezing_level_ft,
    water_level: dbLog.water_level,
    bug_pressure: dbLog.bug_pressure,
    trail_condition: dbLog.trail_condition,
    // Sport/trad metrics
    protection_quality: dbLog.protection_quality,
    anchor_quality: dbLog.anchor_quality,
    crowd_level: dbLog.crowd_level,
    created_at: dbLog.created_at,
  };
}

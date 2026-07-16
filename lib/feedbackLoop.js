// Feedback Loop Integration: Persistence layer for crews, logs, vouches, trust
// This module bridges session-only state in ClimbMatch with Supabase persistence

import { useUserCrews, useUserArchivedCrews, useRouteTripReports, useUserLogs, useUserVouches, getClimberVouches, getTrustScore, createCrew, updateCrew, archiveCrew, deleteCrew, createClimbLog, updateClimbLog, deleteClimbLog, giveVouch, revokeVouch, logBelajCatch } from "./db";

/**
 * Hook: Load user's active + archived crews from DB
 * Returns: { active: [], archived: [], loading, error }
 */
export function usePersistentCrews(userId) {
  const active = useUserCrews(userId);
  const archived = useUserArchivedCrews(userId);

  return {
    active: active.data || [],
    archived: archived.data || [],
    loading: active.isLoading || archived.isLoading,
    error: active.error || archived.error,
  };
}

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
  const received = targetId ? getClimberVouches(targetId) : null;

  return {
    given: given.data || [],
    received: received?.data || [],
    loading: given.isLoading || received?.isLoading,
    error: given.error || received?.error,
  };
}

/**
 * Mutation: Create a new crew in DB
 * Returns: { success, crew, error }
 */
export async function persistCreateCrew(userId, routeId, members = []) {
  try {
    const crew = await createCrew(userId, routeId, members);
    return { success: true, crew, error: null };
  } catch (err) {
    console.error("Failed to create crew:", err);
    return { success: false, crew: null, error: err.message };
  }
}

/**
 * Mutation: Update crew status/dates/location in DB
 * Returns: { success, crew, error }
 */
export async function persistUpdateCrew(crewId, updates) {
  try {
    const crew = await updateCrew(crewId, updates);
    return { success: true, crew, error: null };
  } catch (err) {
    console.error("Failed to update crew:", err);
    return { success: false, crew: null, error: err.message };
  }
}

/**
 * Mutation: Archive a crew in DB
 * Returns: { success, error }
 */
export async function persistArchiveCrew(crewId) {
  try {
    await archiveCrew(crewId);
    return { success: true, error: null };
  } catch (err) {
    console.error("Failed to archive crew:", err);
    return { success: false, error: err.message };
  }
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
 * Helper: Convert DB crew format to ClimbMatch format (if schema differs)
 * This allows gradual migration without full restructuring
 */
export function dbCrewToLocal(dbCrew) {
  return {
    id: dbCrew.id,
    routeId: dbCrew.route_id,
    members: dbCrew.members || [],
    status: dbCrew.status,
    proposed_dates: dbCrew.proposed_dates || [],
    agreed_date: dbCrew.agreed_date,
    meet_place: dbCrew.meet_place,
    meet_time: dbCrew.meet_time,
    notes: dbCrew.notes,
    created_at: dbCrew.created_at,
    archived_at: dbCrew.archived_at,
  };
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

/**
 * Utility: Check if crew should auto-archive (3+ days past agreed_date)
 */
export function shouldAutoArchiveCrew(crew) {
  if (!crew.agreed_date || crew.status !== "ready") return false;
  const agreedDate = new Date(crew.agreed_date);
  const daysSince = (Date.now() - agreedDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= 3;
}

/**
 * Utility: Check if crew is ready (all members confirmed + dates agreed + meet place + meet time)
 */
export function isCrewReady(crew) {
  if (!crew.members || !Array.isArray(crew.members)) return false;
  const allConfirmed = crew.members.every((m) => m.accepted !== false);
  return (
    allConfirmed &&
    crew.agreed_date &&
    crew.meet_place &&
    crew.meet_time
  );
}

/**
 * Utility: Extract first names of crew members for display
 */
export function crewMemberNames(crew) {
  if (!crew.members || !Array.isArray(crew.members)) return [];
  return crew.members.map((m) => m.name?.split(" ")[0] || m.name || "?").filter(Boolean);
}

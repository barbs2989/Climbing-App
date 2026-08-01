import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
)

interface GpsSubmission {
  routeId: string
  gpxData: [number, number][]
  climberEmail?: string
  climberName?: string
  deviceType?: string
  climbDate?: string
  notes?: string
}

function haversineDistance(coord1: [number, number], coord2: [number, number]): number {
  const [lat1, lng1] = coord1
  const [lat2, lng2] = coord2
  const R = 3959 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function validateGpsQuality(
  coordinates: [number, number][],
  expectedPeakCoords?: [number, number]
): { valid: boolean; issues: string[]; score: number } {
  const issues: string[] = []

  // Rule 1: Minimum 5 waypoints
  if (coordinates.length < 5) {
    issues.push(`Need at least 5 waypoints (has ${coordinates.length})`)
  }

  // Rule 2: Check bounds
  if (expectedPeakCoords) {
    const [peakLat, peakLng] = expectedPeakCoords
    const tolerance = 0.5
    for (const [lat, lng] of coordinates) {
      if (Math.abs(lat - peakLat) > tolerance || Math.abs(lng - peakLng) > tolerance) {
        issues.push("Some coordinates way outside expected area")
        break
      }
    }
  }

  // Rule 3: Check for duplicates
  const uniquePoints = new Set(coordinates.map(c => c.join(",")))
  if (uniquePoints.size < 3) {
    issues.push("Track has too many duplicate points")
  }

  // Rule 4: Check distance progression
  let totalDistance = 0
  for (let i = 1; i < coordinates.length; i++) {
    const dist = haversineDistance(coordinates[i - 1], coordinates[i])
    totalDistance += dist
    if (dist > 10) {
      issues.push("Large jump detected between points (possible GPS dropout)")
    }
  }

  // Rule 5: Check if track is too short
  if (totalDistance < 0.5) {
    issues.push("Track is very short, may need more waypoints")
  }

  // Calculate quality score
  let score = 50
  const pointBonus = Math.min(30, (coordinates.length - 5) * 2)
  score += pointBonus

  if (totalDistance > 2 && totalDistance < 20) {
    score += 10
  }

  const lats = coordinates.map(c => c[0])
  const lngs = coordinates.map(c => c[1])
  const latSpread = Math.max(...lats) - Math.min(...lats)
  const lngSpread = Math.max(...lngs) - Math.min(...lngs)
  if (latSpread > 0.05 || lngSpread > 0.05) {
    score += 10
  }

  if (expectedPeakCoords) {
    // Closest approach, not the average of every point. This rule was dead until
    // the handler started passing coords, and as written it averaged the whole
    // track: on any route with a real approach the midpoint sits kilometres from
    // the summit by definition, so switching it on would have penalised exactly
    // the long alpine tracks this catalog is mostly made of. What actually
    // distinguishes a good track from someone else's mountain is whether it ever
    // reaches the route at all.
    const peak = expectedPeakCoords
    const closest = Math.min(
      ...coordinates.map((c) => haversineDistance(c, peak))
    )
    if (closest > 2) {
      score -= Math.min(30, closest * 5)
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  return {
    valid: issues.length === 0,
    issues,
    score
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    })
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      })
    }

    const body: GpsSubmission = await req.json()
    const { routeId, gpxData, climberEmail, climberName, deviceType, climbDate, notes } = body

    // Validate input
    if (!routeId || !gpxData || !Array.isArray(gpxData) || gpxData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid routeId or gpxData" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Rate limits, enforced server-side so they can't be bypassed:
    // 10 submissions per email per 24h, 5 per route per week.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    if (climberEmail) {
      const { count: emailCount } = await supabase
        .from("gps_submissions")
        .select("*", { count: "exact", head: true })
        .eq("climber_email", climberEmail)
        .gte("submitted_at", oneDayAgo)
      if ((emailCount ?? 0) >= 10) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded: max 10 submissions per day. Try again tomorrow." }),
          { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "86400" } }
        )
      }
    }
    const { count: routeCount } = await supabase
      .from("gps_submissions")
      .select("*", { count: "exact", head: true })
      .eq("route_id", routeId)
      .gte("submitted_at", oneWeekAgo)
    if ((routeCount ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "This route already has several recent submissions under review. Please check back next week." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "604800" } }
      )
    }

    // Look up where this route actually is, so the proximity rules in
    // validateGpsQuality can run. They take `expectedPeakCoords`, but this call
    // passed one argument, so the parameter was always undefined and BOTH blocks
    // that use it -- the "way outside expected area" bounds check and the
    // distance-to-peak score penalty -- were dead. A track on the wrong continent
    // scored the same as one on the route.
    //
    // Prefer the route's own coords, fall back to its area (peaks carry lat/lng on
    // `areas`). If neither is known we pass undefined and the rules stay off rather
    // than rejecting a good track against a coordinate we do not have.
    let expectedPeakCoords: [number, number] | undefined
    const { data: routeRow } = await supabase
      .from("routes")
      .select("lat, lng, areas ( lat, lng )")
      .eq("id", routeId)
      .maybeSingle()
    const areaRow = Array.isArray(routeRow?.areas) ? routeRow?.areas[0] : routeRow?.areas
    const srcLat = routeRow?.lat ?? areaRow?.lat
    const srcLng = routeRow?.lng ?? areaRow?.lng
    if (typeof srcLat === "number" && typeof srcLng === "number") {
      expectedPeakCoords = [srcLat, srcLng]
    }

    // Validate quality
    const validation = validateGpsQuality(gpxData, expectedPeakCoords)

    // Store submission in database
    const { data: submission, error: submitError } = await supabase
      .from("gps_submissions")
      .insert({
        route_id: routeId,
        gpx_data: gpxData,
        climber_email: climberEmail,
        climber_name: climberName || "Anonymous",
        device_type: deviceType,
        climb_date: climbDate,
        notes: notes,
        quality_score: validation.score,
        // Always pending. This endpoint is unauthenticated, so it must never
        // be able to mark a submission approved -- approval is the admin-only
        // job of approve-gps-submission, which is what merges GPX into the
        // route. A high score only *recommends* approval (see `recommendation`).
        status: "pending",
        issues: validation.issues
      })
      .select()
      .single()

    if (submitError) {
      console.error("Database error:", submitError)
      return new Response(
        JSON.stringify({ error: "Failed to store submission", details: submitError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    // Determine recommendation
    let recommendation = "manual_review"
    if (validation.score >= 90) recommendation = "auto_approve"
    if (validation.score < 70) recommendation = "reject"

    const response = {
      success: true,
      valid: validation.valid || validation.score >= 70,
      qualityScore: validation.score,
      issues: validation.issues,
      recommendation: recommendation,
      submissionId: submission.id,
      message:
        validation.score >= 90
          ? "Excellent track! Queued for review — it should clear quickly."
          : validation.score >= 70
            ? "Good track! Will be reviewed within 24 hours."
            : "Track needs improvement. Please provide more waypoints or check coordinates."
    }

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    })
  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})

// GPX parsing and validation utilities for climber GPS submissions

export function parseGpxXml(xmlString) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')

    if (doc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Invalid XML')
    }

    const coords = []
    const trkpts = doc.querySelectorAll('trkpt')
    const wpts = doc.querySelectorAll('wpt')

    // Extract track points first (actual route)
    trkpts.forEach(pt => {
      const lat = parseFloat(pt.getAttribute('lat'))
      const lng = parseFloat(pt.getAttribute('lon'))
      if (!isNaN(lat) && !isNaN(lng)) {
        coords.push([lat, lng])
      }
    })

    // If no track points, try waypoints
    if (coords.length === 0) {
      wpts.forEach(pt => {
        const lat = parseFloat(pt.getAttribute('lat'))
        const lng = parseFloat(pt.getAttribute('lon'))
        if (!isNaN(lat) && !isNaN(lng)) {
          coords.push([lat, lng])
        }
      })
    }

    return coords
  } catch (err) {
    console.error('GPX parse error:', err)
    return []
  }
}

export function parseCoordinateList(text) {
  if (!text || text.trim().length === 0) return []

  const coords = []
  const lines = text.trim().split('\n')

  for (const line of lines) {
    const cleaned = line.trim()
    if (!cleaned) continue

    // Try various formats: "48.123, -121.456" or "48.123,-121.456" or "[48.123, -121.456]"
    const match = cleaned.match(/[\[\(\s]*(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)[\]\)\s]*/)

    if (match) {
      const lat = parseFloat(match[1])
      const lng = parseFloat(match[2])

      // Validate lat/lng ranges
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        coords.push([lat, lng])
      }
    }
  }

  return coords
}

export function validateGpxQuality(coordinates, expectedPeakCoords = null) {
  const issues = []

  if (!coordinates || coordinates.length === 0) {
    return {
      valid: false,
      pointCount: 0,
      hasElevation: false,
      issues: ['No coordinates provided']
    }
  }

  // Rule 1: Minimum 5 waypoints
  if (coordinates.length < 5) {
    issues.push(`Need at least 5 waypoints (has ${coordinates.length})`)
  }

  // Rule 2: Check bounds (if expected peak provided)
  if (expectedPeakCoords) {
    const [peakLat, peakLng] = expectedPeakCoords
    const tolerance = 0.5 // ±0.5 degrees

    for (const [lat, lng] of coordinates) {
      if (Math.abs(lat - peakLat) > tolerance || Math.abs(lng - peakLng) > tolerance) {
        issues.push('Some coordinates way outside expected area (check peak location)')
        break
      }
    }
  }

  // Rule 3: Check for organic terrain following (not all same point, not perfectly straight)
  const uniquePoints = new Set(coordinates.map(c => c.join(',')))
  if (uniquePoints.size < 3) {
    issues.push('Track has too many duplicate points (may be GPS error)')
  }

  // Rule 4: Check if points show realistic distance progression
  let totalDistance = 0
  for (let i = 1; i < coordinates.length; i++) {
    const [lat1, lng1] = coordinates[i - 1]
    const [lat2, lng2] = coordinates[i]
    const dist = haversineDistance([lat1, lng1], [lat2, lng2])
    totalDistance += dist

    // Warn if any single jump is >10 miles (suspicious)
    if (dist > 10) {
      issues.push(`Large jump detected: ${(dist * 5280).toFixed(0)}ft between points (possible GPS dropout)`)
    }
  }

  // Rule 5: Warn if track seems too short (<0.5 miles)
  if (totalDistance < 0.5) {
    issues.push(`Track is very short (${(totalDistance * 5280).toFixed(0)}ft) - may need more waypoints`)
  }

  return {
    valid: issues.length === 0,
    pointCount: coordinates.length,
    totalDistanceMiles: totalDistance,
    hasElevation: false,
    issues
  }
}

export function calculateQualityScore(coordinates, expectedPeakCoords = null) {
  let score = 50 // Start at 50

  if (!coordinates || coordinates.length === 0) return 0

  // Bonus: point count (up to +30)
  const pointBonus = Math.min(30, (coordinates.length - 5) * 2)
  score += pointBonus

  // Bonus: reasonable distance (up to +10)
  let totalDistance = 0
  for (let i = 1; i < coordinates.length; i++) {
    totalDistance += haversineDistance(coordinates[i - 1], coordinates[i])
  }
  if (totalDistance > 2 && totalDistance < 20) {
    score += 10
  }

  // Bonus: geographic spread (up to +10)
  const lats = coordinates.map(c => c[0])
  const lngs = coordinates.map(c => c[1])
  const latSpread = Math.max(...lats) - Math.min(...lats)
  const lngSpread = Math.max(...lngs) - Math.min(...lngs)
  if (latSpread > 0.05 || lngSpread > 0.05) {
    score += 10
  }

  // Penalty: coordinates way off expected peak
  if (expectedPeakCoords) {
    const [peakLat, peakLng] = expectedPeakCoords
    const avgLat = lats.reduce((a, b) => a + b) / lats.length
    const avgLng = lngs.reduce((a, b) => a + b) / lngs.length
    const distToPeak = haversineDistance([avgLat, avgLng], [peakLat, peakLng])

    if (distToPeak > 2) {
      score -= Math.min(30, distToPeak * 5) // Penalty for distance to expected peak
    }
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function haversineDistance(coord1, coord2) {
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

export function detectGpxFormat(text) {
  if (!text || text.trim().length === 0) return null

  const trimmed = text.trim()

  // Check if it's XML (GPX format)
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<gpx')) {
    return 'gpx'
  }

  // Check if it's coordinate list
  if (trimmed.match(/^[\[\(\s]*-?\d+\.?\d*\s*[,\s]\s*-?\d+\.?\d*/m)) {
    return 'coordinates'
  }

  return 'unknown'
}

export function formatCoordinatesForDisplay(coordinates) {
  if (!coordinates || coordinates.length === 0) return 'No coordinates'

  return `${coordinates.length} waypoints, ${haversineDistance(coordinates[0], coordinates[coordinates.length - 1]).toFixed(1)} mi route`
}

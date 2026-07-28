import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface GpsSubmissionRequest {
  routeId: string
  userEmail: string
  gpxData: string
  qualityScore: number
  waypointCount: number
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body: GpsSubmissionRequest = await req.json()
    
    if (!body.routeId || !body.userEmail || !body.gpxData || typeof body.qualityScore !== 'number') {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    if (body.qualityScore < 0 || body.qualityScore > 100) {
      return new Response(JSON.stringify({ error: 'Quality score out of range' }), { status: 400 })
    }

    if (body.waypointCount < 5) {
      return new Response(JSON.stringify({ error: 'Insufficient waypoints' }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    const { data, error } = await supabase
      .from('gps_submissions')
      .insert([{
        route_id: body.routeId,
        user_email: body.userEmail,
        quality_score: body.qualityScore,
        waypoint_count: body.waypointCount,
        gpx_data: body.gpxData,
        status: 'pending'
      }])
      .select()

    if (error) {
      console.error('Database error:', error)
      return new Response(JSON.stringify({ error: 'Failed to save submission' }), { status: 500 })
    }

    return new Response(JSON.stringify({
      success: true,
      submissionId: data?.[0]?.id,
      message: 'GPS data received and queued for review.'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}

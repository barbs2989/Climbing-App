# GPS Phase B Backend — Integration Guide

## What's Ready

✓ Supabase migration: `0054_gps_submissions.sql`
✓ Edge function: `supabase/functions/validate-gps/index.ts`
✓ Integration steps below

## Implementation Steps

### 1. Apply Database Migration

Run this in Supabase SQL editor:

```sql
-- Copy/paste contents of supabase/migrations/0054_gps_submissions.sql
```

### 2. Deploy Edge Function

```bash
supabase functions deploy validate-gps
```

### 3. Update Frontend Integration

In `lib/GpsSubmissionModal.jsx`, update `handleSubmit()`:

```javascript
const response = await fetch(
  `${process.env.VITE_SUPABASE_URL}/functions/v1/validate-gps`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routeId: route.id,
      userEmail: userEmail,
      gpxData: gpxString,
      qualityScore: score,
      waypointCount: waypoints.length
    })
  }
)

const result = await response.json()
if (result.success) {
  showSuccessModal(result.message, score)
}
```

### 4. Email Notifications (Optional)

The edge function currently logs submissions. To add email:

- Integrate Supabase Mail (or SendGrid)
- Send user confirmation: "Thanks! We'll review your GPS data."
- Send admin notification: Route name + quality score + download link

## Testing Checklist

- [ ] Modal renders on routes with `gpx === null`
- [ ] Paste GPX coordinates work
- [ ] File upload works
- [ ] Submission stores in DB with correct status (`pending`)
- [ ] Quality score validates (0-100, min 5 waypoints)
- [ ] Error messages display on form
- [ ] Mobile responsive (390px)

## Next Steps

1. User applies migration to Supabase
2. Deploy edge function
3. Update frontend with endpoint
4. Test end-to-end
5. Go live for 16 routes

## Schema Reference

Table: `gps_submissions`
- route_id (text) — climbing route ID
- user_email (text) — submitter email
- quality_score (int 0-100) — algorithm score
- waypoint_count (int, min 5) — GPS points
- status (pending/approved/rejected)
- submitted_at, reviewed_at (timestamps)
- admin_notes (optional)


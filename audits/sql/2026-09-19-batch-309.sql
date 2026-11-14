-- wa_bacon_peak_diobsud: the Watson Lakes Trailhead waypoint's own `note` claims this
-- trailhead "serves the north-east side of the peak -- the Green Lake Glacier and
-- Watson Lakes approach -- not the Diobsud Creek Glacier side this route is named for."
-- That contradicts the row's own `approach` field (which routes from this exact
-- trailhead, over the Anderson Lakes ridge, into the Diobsud basin and up to the
-- Diobsud Creek Glacier) and the row's own next five waypoints, which trace that
-- identical path step by step (Wilderness-boundary saddle -> Watson Lakes -> Diobsud
-- basin -> Access gully to Diobsud Creek Glacier -> Diobsud Creek Glacier crossing ->
-- summit) with no second trailhead anywhere in the sequence.
-- Corroborated externally: USFS Anderson-Watson Lakes Trail #611 descriptions and
-- multiple trip reports (turns-all-year.com "Mount Watson-Bacon Peak"; onehikeaweek.com
-- "Bacon Peak by Salvation Peak via Diobsud Creek Glacier") both describe the standard
-- Diobsud Creek Glacier approach starting from this same Anderson and Watson Lakes
-- trailhead, via the Mount Watson traverse and the Diobsud Lakes basin -- exactly what
-- this row's own approach text says. The waypoint note is the wrong half.
UPDATE routes
SET waypoints = jsonb_set(
  waypoints,
  '{0,note}',
  '"This is the Anderson and Watson Lakes trailhead, used for the whole climb including the Diobsud Creek Glacier side: the ridge traverse past Watson Lakes drops into the Diobsud basin and up the access gully to the glacier crossing recorded a few waypoints on. It also serves the Green Lake Glacier side used on some descents/loops."'::jsonb
)
WHERE id = 'wa_bacon_peak_diobsud'
  AND waypoints->0->>'name' = 'Watson Lakes Trailhead'
  AND waypoints->0->>'note' = 'This is the Anderson and Watson Lakes trailhead, which serves the north-east side of the peak — the Green Lake Glacier and Watson Lakes approach — not the Diobsud Creek Glacier side this route is named for.';

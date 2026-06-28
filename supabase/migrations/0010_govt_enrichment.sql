-- Phase: government-source enrichment. Columns so the WA (and future) pulls
-- don't drop road access, emergency/rescue, climate normals, structured
-- access/regs, pitch-by-pitch, bail, gear, aid grade, and high point.
-- All nullable; idempotent. Apply in the Supabase SQL editor.
alter table routes
  add column if not exists high_point_ft integer,
  add column if not exists aid_grade     text,
  add column if not exists gear          jsonb,   -- ["rope 60m","6 screws",...]
  add column if not exists approach      text,
  add column if not exists descent_text  text,
  add column if not exists bail          text,
  add column if not exists pitch_detail  jsonb,   -- [{pitch,grade,notes},...]
  add column if not exists itinerary     jsonb,   -- suggested day-by-day plan
  add column if not exists access        jsonb,   -- {landManager,fees,permit,passRequired,closures,rules}
  add column if not exists road          jsonb,   -- {name,status,seasonalGate,driveNote}
  add column if not exists climate       jsonb,   -- {forecastZone,bySeason,...}
  add column if not exists emergency     jsonb;   -- {county,sheriffDispatch,rangerStation,nearestHospital,notes}

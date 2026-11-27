-- WA alpine/mountaineering audit — batch 591 (pass 9)
-- Reviewed 2026-11-26. Each fix below was cross-checked against at least one authoritative
-- source, or against the route's own stored data where that was the authoritative check (see
-- audits/wa-alpine-audit-log.md for the summary). These are PROPOSED fixes for a human to
-- review and run — not yet applied.

-- Lincoln Peak / X Couloir Standard Route (wa_lincoln_peak_standard): `pitches` stored as 2,
-- but the route's own `climbing_route` and `pitch_detail` arrays each break the climb into 5
-- distinct roped sections (Southwest basin/bergschrund, bergschrund/serac crux, lower basin and
-- hidden gully, snow aretes and traverses, X Couloir to the summit) and the descent_text
-- separately describes up to 10 rappels on the way down — all inconsistent with a 2-pitch
-- route. 2 looks like a stale/default value never reconciled with the detailed breakdown
-- written later. Setting pitches to match the route's own 5-section breakdown.
update routes set pitches = 5 where id = 'wa_lincoln_peak_standard';

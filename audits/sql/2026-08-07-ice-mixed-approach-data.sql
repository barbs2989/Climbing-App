-- WA ice/mixed routes: fill approach numbers that the rows themselves already prove. 9 writes.
-- Rationale, evidence per row and the 11 routes deliberately left empty:
--   audits/2026-08-07-ice-mixed-approach-data.md
--
-- Every statement is fill-blanks-only (`and <col> is null`) so it cannot overwrite a
-- concurrent enrichment write, and is scoped to discipline in ('ice','mixed') so a
-- name-shaped id that resolved to the wrong peak matches nothing instead of corrupting it.
--
-- dist_km is ONE-WAY by convention (the app renders round trip as dist_km * 2).
-- loss_ft is only set where gain_ft is already demonstrably a whole-outing ascent --
-- setting it flips the route's tile from "Approach gain" to "Total ascent".

update routes set dist_km = 1.61
  where id = 'wa_early_winter_couloir' and dist_km is null and discipline in ('ice','mixed');

update routes set dist_km = 3.22
  where id = 'wa_east_face_variation' and dist_km is null and discipline in ('ice','mixed');

update routes set dist_km = 0.08
  where id = 'wa_excavation_aka_the_crack' and dist_km is null and discipline in ('ice','mixed');

update routes set dist_km = 0.08
  where id = 'wa_last_chance_for_gas_aka_tricky_start' and dist_km is null and discipline in ('ice','mixed');

update routes set dist_km = 10.46
  where id = 'wa_sw_couloir_and_face' and dist_km is null and discipline in ('ice','mixed');

update routes set loss_ft = 2400
  where id = 'wa_early_winter_couloir' and loss_ft is null and discipline in ('ice','mixed');

update routes set loss_ft = 2500
  where id = 'wa_east_face_variation' and loss_ft is null and discipline in ('ice','mixed');

update routes set loss_ft = 50
  where id = 'wa_excavation_aka_the_crack' and loss_ft is null and discipline in ('ice','mixed');

update routes set loss_ft = 5385
  where id = 'wa_lincoln_peak_wilkes_booth' and loss_ft is null and discipline in ('ice','mixed');


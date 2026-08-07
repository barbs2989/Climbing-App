-- WA rock routes carrying an 'alpine' tag they did not earn. 28 routes.
-- Rationale, evidence and the 73 deliberately-untouched routes: audits/2026-08-07-crag-alpine-mistags.md
-- Guarded three ways: current discipline (idempotent, cannot clobber a concurrent edit), and
-- area_type = 'crag' -- because 91% of WA route ids are derived from the route NAME alone
-- (wa_north_ridge spans five different peaks), so a name-shaped id is never trusted on its own.
-- A mis-resolved id simply matches nothing rather than writing to the wrong peak.

update routes set discipline = 'trad'
  where discipline = 'alpine'
    and area_id in (select id from areas where area_type = 'crag')
    and id in (
    'wa_asymptotic',
    'wa_traverse',
    'wa_woodland_critter_christmas',
    'wa_salish',
    'wa_you_moss_be_joking',
    'wa_artic_rose',
    'wa_ez_way',
    'wa_blood_orgy',
    'wa_astroglide',
    'wa_unnamed_5',
    'wa_smears_jugs_and_rock_roll',
    'wa_astral_projection',
    'wa_north_face_of_the_mole',
    'wa_east_ridge',
    'wa_sidewinder_4',
    'wa_clast_from_the_past',
    'wa_moss_out_for_harambe',
    'wa_north_ridge',
    'wa_half_fast',
    'wa_wings',
    'wa_alice_in_wonderland'
  );

update routes set discipline = 'sport'
  where discipline = 'alpine'
    and area_id in (select id from areas where area_type = 'crag')
    and id in (
    'wa_hottentot',
    'wa_lone_wolf',
    'wa_django',
    'wa_caravan',
    'wa_hail_satan',
    'wa_chitlins_con_carne',
    'wa_ephemeral'
  );

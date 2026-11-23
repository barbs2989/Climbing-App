# Catalog clean-up dossier (read-only, 2026-11-23)

Nothing was written to the database or the repo. Counts were read live with the service key (`count=exact`).
Full per-row data, reference counts for all 26 checked tables and merge needs: `dossier.json`. Raw rows: `raw.json`.

## Schema findings

**No way to hide or retire a route.** `routes` has no status, hidden, retired or withdrawn column. Its only RLS
policy is `routes public read ... USING (true)`, and `lib/db.js` filters on nothing of the kind. Past "withdrawals"
(0301 closed places) were DELETEs with the rows saved to `scripts/data/*-rollback.json`.
The smallest change that would add one: a migration adding `routes.retired_at timestamptz` (plus `retired_reason text`),
and a `retired_at is null` filter on every routes read in `lib/db.js`, `lib/offline.js` and the search/area RPCs.
`areas.route_count` and its rollups would also have to skip retired rows. That touches many readers, so for
these rows a DELETE with a rollback file is far cheaper.

**FK ON DELETE behaviour** (from SUPABASE_SCHEMA.sql):

| Table | Column | FK? | On delete of the route |
|---|---|---|---|
| contributions, gps_submissions, review_ai_verdicts, route_base_checkins, route_base_pin_changes, route_field_confidence, route_field_evidence, route_flags, route_partner_listings, route_ratings, route_views, topo_lines | route_id | yes | CASCADE (rows deleted silently) |
| content_reports | route_id | yes | SET NULL |
| topos | route_id | yes | SET NULL (and ON UPDATE CASCADE, the only one) |
| climb_logs, crews, objectives, hazard_votes, route_difficulty_ratings, user_itineraries | route_id | NO FK | left dangling |
| user_lists, route_link_ups | route_ids text[] | NO FK | left dangling |
| comments | target_id = `<id>`, `<id>__conditions`, `<id>_pitch_N`, `<id>__photo__…` | NO FK | left dangling |
| user_reports, moderation_actions | target_id text | NO FK | left dangling |
| climber_resumes | climbs/hidden_logs jsonb | NO FK | left dangling |

So a delete must be preceded by a zero-count check (the 0278 and 0400 pattern), not trusted to cascade.
`route_field_evidence` PK is `(route_id, field)`. Moving an evidence row onto a keeper conflicts wherever the keeper
already has that field.

**How earlier merges were done.** Migrations 0100/0103/0108/0220/0253/0271/0278/0400 each use a temp table
`m_merge(keep, drop_id)`. They assert each row is still where the plan read it, ABORT if any climber table points at
a dropped id, fill only the keeper's BLANK columns from the twin, append the twin's name to `alt_names`, then DELETE the
twin. The rows are saved to a rollback JSON. 0400 is the most recent and the best template. Its zero-count list still
names `crew_listings`, which is now `route_partner_listings`, and it omits route_field_evidence and route_flags, so a
new one should use the current table list above.
In this research effort, batch G deleted `wa_comb_the_dreamer` by script, with the row saved to
`research-data/route-ledger-2026-11-18/batch-g-deleted-wa_comb_the_dreamer.json`.

**Triggers (0216 → 0218 → 0219).** `trg_refuse_duplicate_route` fires BEFORE INSERT **or UPDATE of name, area_id**.
It refuses a name whose `route_name_key` matches a non-placeholder route in the same area, in a same-named area within
5 km, or in any area within 0.3 km. Placeholder names (Unknown, Project) are never compared, which is how the
`Unknown 5.x` rows and `Project` got in. This affects three kinds of change:
- **A rename to the twin's name must run AFTER the twin is deleted**, in the same transaction. This applies to The Kone
  and Feeling Stabby. Otherwise the trigger refuses it.
- **A MOVE (area_id update) is checked** against the target area. No clash was found for Wind Cave → Sickle Slab or
  Nirvana Ridge → Grand Central.
- The two RENAMES (Jacobs Ladder, Drill's Thrill) have no same-key route nearby. The other WA Jacob's Ladders are in
  Spokane, the Columbia Gorge and on a Mt Erie boulder.

Deleting rows changes `areas.route_count` (trigger-maintained). Run `npm run check:counts` and
`refresh_route_duplicate_names()` after.

## Rows

Reference counts: every one of the 26 route-referencing tables read **0** for every row, except the counts below.
Those are research-only (`route_field_evidence`/`route_field_confidence`, which cascade).
**No climber data (logs, objectives, crews, lists, comments, photos/topos, contributions, ratings, reports) points at
any row in this dossier.**

| Row | Kind | Recommendation | Conf. | Non-zero refs (row / pair) |
|---|---|---|---|---|
| wa_stress_management | gone | DELETE | high | — |
| wa_the_price_of_complacency | gone | DELETE | high | — |
| wa_entrance_exam_now_gone | gone | DELETE | med-high | — |
| wa_blues_cliff_the_open_project_accidental_discharge_p2 | open project | DELETE | high | — |
| wa_blues_cliff_the_open_project_12_gauge_iq_p2 | open project | DELETE | high | — |
| wa_blues_cliff_the_project | open project | DELETE | med-high | — |
| wa_unknown_5_7 → wa_main_face_stopper_popper | dup | MERGE (don't copy fa "??") | med-high | — / ev 1, conf 1 |
| wa_unknown_5_6_left → wa_main_face_watch_your_crotch | dup | MERGE | med-high | — / ev 2, conf 2 |
| wa_unknown_5_6 (~ Belayer Slayer?) | dup? | HOLD | low | — / ev 4, conf 3 |
| wa_orange_sunshine_area_thearetical → wa_the_arete_acal | dup (other sub-area) | MERGE | medium | — / ev 1, conf 1 |
| wa_blownout_direct → wa_south_face_4_blownout_to_1st_anchor | dup | MERGE | high | — / ev 4, conf 2 |
| wa_dod_s_jam_dastardly_crack_linkup → wa_south_face_4_dod_s_dastardly_jam | dup | MERGE (don't copy placeholder fa) | high | — / — |
| wa_three_o_clock_rock_the_kone → wa_the_quin_konehead_…_aka_the_kone | dup | MERGE, then RENAME keeper "The Kone" | med-high | — / — |
| wa_south_early_winters_spire_east_buttress_direct → wa_south_early_winter_spire_direct_east_buttress | dup | MERGE (repoint 1 ev row) | high | ev 1 / ev 8, conf 8 |
| wa_north_early_winters_spire_northwest_corner_a_k_a_boving_pollack_route → wa_news_nw_corner | dup | MERGE (fill stars, lat, lng; repoint 1 ev row) | high | ev 1 / ev 1, conf 1 |
| wa_sunset_slab_booby_trap → wa_booby_vinton | dup | MERGE (alt_name Booby Trap) | medium | — / ev 1, conf 1 |
| wa_feeling_stabby → wa_crowbar_crag_feelin_stabby | dup | MERGE, then RENAME keeper "Feeling Stabby" | high | — / — |
| wa_west_face_7_beth_memorial_route_free ~ …beth_priestley_memorial_route | dup? | KEEP both (aid 5.7+ C1 vs free 5.12a) | medium | — / ev 3, conf 3 |
| wa_three_o_clock_rock_rubber_soul ~ total_soul | absorbed line | DELETE + alt_name on Total Soul (or keep as history) | low-med | — / ev 3, conf 3 |
| wa_lower_castle_wild_traverse ~ bird_s_nest_overhang | suspect | HOLD (same FA string, 5.11 vs 5.8) | low | — / ev 1, conf 1 |
| wa_jacobs_ladder_5_10b_a_1_or_5_11b | name junk | RENAME "Jacobs Ladder" | high | ev 1, conf 1 |
| wa_drill_s_thrill_aka_heretic_s_highway | name junk | RENAME "Drill's Thrill" | high | — |
| wa_austrian_slab_wind_cave | misfiled | MOVE → wa_sickle_slab (1 source) | low-med | — |
| wa_austrian_slab_nirvana_ridge | misfiled | MOVE → wa_grand_central_tower (1 source) | low-med | — |
| wa_north_early_winter_spire_constantino_whitelaw | misfiled id | KEEP (area_id already SEWS; only the opaque id says North) | high | ev 1 |
| wa_lower_castle_endgame, _four_knights, _king_s_indian, _nimzo_indian | suspect set | HOLD pending research (likely imported from another formation) | low | — |
| wa_north_early_winter_spire_christianson_roskelley | suspect | HOLD | low | — |
| wa_north_early_winter_spire_twitch_of_the_death_nerve | suspect | HOLD | low | — |

## Not resolved / caveats
- `conversation_state` could not be counted by route (error 42883). Its target_id is a uuid for dm/crew threads, so it
  cannot hold a route id. This is not a gap.
- The comment, user_reports and moderation_actions prefix filters use LIKE, where `_` is a wildcard. That can only
  over-count, and every count was 0, so no row was missed.
- Duplicate calls rest on the batch research (mostly Mountain Project, sometimes one source). Booby Trap, Thearetical
  and Rubber Soul were not confirmed by any publisher.
- Observed in passing, not from the held files: `wa_lower_castle_zig_zag_iii` is named "ZIG ZAG Iii", with the
  commitment grade in the name. `wa_the_vertebrae` is named "The Vertebrae." with a trailing period. `wa_blownout`
  (5.10b/c, the full Blownout) is a separate row from the merge pair.

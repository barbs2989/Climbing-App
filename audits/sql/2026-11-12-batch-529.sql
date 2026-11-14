-- Batch 529 (pass 8, 2026-11-12)
-- Routes: Needle Peak's North Ridge (Bonanza Peak's NW Ridge link-up); North Early Winters
-- Spire's Northwest Corner/Boving-Pollack Route (two catalog rows -- see flag below) and three
-- bare-shape routes (Christianson-Roskelley, Twitch of the Death Nerve, Vulcan Death Grip);
-- Nooksack Tower's Beckey-Schmidtke North Face and South Face; Lexington Tower's North Face;
-- Castle Peak's "Fight or Flight" (North Face, Left Buttress).

-- wa_news_nw_corner (Northwest Corner / Boving-Pollack Route, North Early Winters Spire):
-- stored length_m is 180 (~590 ft), but Mountain Project's route page gives this climb as
-- "500 ft (152 m)" -- and this database's own sibling row for the same route,
-- wa_north_early_winters_spire_northwest_corner_a_k_a_boving_pollack_route, already stores the
-- correct 152. 180 matches no source found; 152 is independently sourced and already live
-- elsewhere in our own data for the identical climb.
UPDATE routes SET length_m = 152
WHERE id = 'wa_news_nw_corner' AND length_m = 180;

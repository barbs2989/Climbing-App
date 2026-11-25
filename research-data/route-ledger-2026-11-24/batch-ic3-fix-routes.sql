-- Indian Creek batch IC3 (2026-11-24): writes enrich:apply cannot make. Old value in every WHERE.
begin;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_goodbye_cruel_world' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 65 ft (20 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_goodbye_cruel_world' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly 0.4 Camalot or yellow TCU, plus a few 0.5 and blue TCU; six or seven 0.4 pieces protect it well.$q$ where id = 'ut_goodbye_cruel_world' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_heat_searcher' and access is null;

-- length empty. Page type line "Trad, 190 ft (58 m), 2 pitches". Single source; locked-1src after apply.
update routes set length_m = 58 where id = 'ut_heat_searcher' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_hoop_dancer' and access is null;

-- length empty. Page type line "Trad, 350 ft (106 m), 2 pitches, Grade II". Single source; locked-1src after apply.
update routes set length_m = 106 where id = 'ut_hoop_dancer' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Long runners for P1. Blue TCUs and .75 Friends in doubles, one #3.5 Friend, one #3 Camalot, and triples of #1-#3 Friends plus Camalots. There is no anchor at the top and cams there sit in suspect rock, so a bolt kit may be wanted.$q$ where id = 'ut_hoop_dancer' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_kitchen_sink' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_kitchen_sink' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_kitchen_sink' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$2 each from Blue Alien up to #4 Camalot, plus an extra .4 Camalot. Two bolts with chains at the top.$q$ where id = 'ut_kitchen_sink' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_long_bandito_route_hands_into_wide_corner' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_long_bandito_route_hands_into_wide_corner' and pitches = 0;

-- length empty. Page type line "Trad, 150 ft (45 m)". Single source; locked-1src after apply.
update routes set length_m = 45 where id = 'ut_long_bandito_route_hands_into_wide_corner' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A couple of bolts near the top.$q$ where id = 'ut_long_bandito_route_hands_into_wide_corner' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_low_spark' and access is null;

-- length empty. Page type line "Trad, 230 ft (70 m), 2 pitches". Single source; locked-1src after apply.
update routes set length_m = 70 where id = 'ut_low_spark' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Pieces from 1.5 to 4 in, with plenty of 2 and 2.5 in low down.$q$ where id = 'ut_low_spark' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_meat_hooks' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 180 ft (55 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_meat_hooks' and pitches = 0;

-- length empty. Page type line "Trad, 180 ft (55 m)". Single source; locked-1src after apply.
update routes set length_m = 55 where id = 'ut_meat_hooks' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalot sizes: 1-2 #4.5, 2-3 #4, 8-10 #3.5, 4-5 #3 and 1-2 #2; two ropes are needed to get down.$q$ where id = 'ut_meat_hooks' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_ninja' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_ninja' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_ninja' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Friends from 2.0 down to .75, with extras in the 1.0-.75 range.$q$ where id = 'ut_ninja' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_r_o_u_s' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_r_o_u_s' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_r_o_u_s' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Carry a #6 or #4 for the opening moves, then Camalots from #3 down to 0.75; the top is a two-bolt anchor set well left in good rock.$q$ where id = 'ut_r_o_u_s' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sabbatical_36' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 155 ft (47 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_sabbatical_36' and pitches = 0;

-- length empty. Page type line "Trad, 155 ft (47 m)". Single source; locked-1src after apply.
update routes set length_m = 47 where id = 'ut_sabbatical_36' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring fingers up to the biggest cam, a few small pieces low, #3 Camalots most of the way, one 3.5 or #4 and one wide piece on a sling, then #3s to perfect hands (2.5-3") before one small piece.$q$ where id = 'ut_sabbatical_36' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_season_of_the_witch' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_season_of_the_witch' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_season_of_the_witch' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$#0.3 to #2, heavy on #0.5. Ends at chains.$q$ where id = 'ut_season_of_the_witch' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_solo_east' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_solo_east' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Blue Alien up to a #1 Camalot, with extra .75 and .5 Camalots; two good bolts at the anchor.$q$ where id = 'ut_solo_east' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_technicolor' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_technicolor' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_technicolor' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Rack: 6 #2; 2-3 each from #1 down to #.3; optional #3 near the top.$q$ where id = 'ut_technicolor' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_host' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_host' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_the_host' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring at least triples from tips to fists, plus a #5 for the top.$q$ where id = 'ut_the_host' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_violator' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_violator' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_the_violator' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A 3.0 blue Big Bro or #7 BD; BD .6s do not protect the last 20 ft.$q$ where id = 'ut_the_violator' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unknown_ph_fingers_to_hands_splitter' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_unknown_ph_fingers_to_hands_splitter' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_unknown_ph_fingers_to_hands_splitter' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots .3 to 2, with extras for the stretch where off-fingers becomes thin hands. Chains finish it, and a clipping hold sits near the top.$q$ where id = 'ut_unknown_ph_fingers_to_hands_splitter' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unnamed_fingers_in_left_facing_corner' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 65 ft (20 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_unnamed_fingers_in_left_facing_corner' and pitches = 0;

-- length empty. Page type line "Trad, 65 ft (20 m)". Single source; locked-1src after apply.
update routes set length_m = 20 where id = 'ut_unnamed_fingers_in_left_facing_corner' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Carry a 0.4 and several 0.5 Camalots, plus an optional 0.75 near the top; chains at the top.$q$ where id = 'ut_unnamed_fingers_in_left_facing_corner' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_waikiki' and access is null;

-- length empty. Page type line "Trad, 80 ft (24 m), 2 pitches". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_waikiki' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$#4 down to #1 low, and two draws up top. First anchors at 60 ft, second at 80 ft, with two bolts on the upper section.$q$ where id = 'ut_waikiki' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_alley_cat' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_alley_cat' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_alley_cat' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Lots of #1 and #2 Camalots, a couple of #3s, some .75 and .5 for the start, and an optional #4 for the slot at the top; one 60 m rope probably reaches the ground when lowering, though that is uncertain.$q$ where id = 'ut_alley_cat' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_bad_cat' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_bad_cat' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_bad_cat' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Friends: #2 x8, #1.5 x5, #.75 x3, #.5 x2; the fixed anchor is good.$q$ where id = 'ut_bad_cat' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_camping_under_the_influence' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_camping_under_the_influence' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_camping_under_the_influence' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalot: two #2, three #1, four .75, four .5, three .4; maybe a runner or two.$q$ where id = 'ut_camping_under_the_influence' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_collision_course' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_collision_course' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_collision_course' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Double .5 to #4 Camalot, extra #3 and #4; a #6 is optional for the top.$q$ where id = 'ut_collision_course' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_columbian_hit_man' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_columbian_hit_man' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_columbian_hit_man' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly .75s, with a heavy showing of .4-#1, in Camalots from .2 to #2; a few shoulder slings.$q$ where id = 'ut_columbian_hit_man' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_dancing_queen' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_dancing_queen' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_dancing_queen' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$From a #0 TCU up to the old 4.5 and 5 Camalots, with one each of the big sizes.$q$ where id = 'ut_dancing_queen' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_girls_just_wanna_have_guns' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_girls_just_wanna_have_guns' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_girls_just_wanna_have_guns' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring #4 through #6 sizes.$q$ where id = 'ut_girls_just_wanna_have_guns' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_go_drown_in_a_lake_of_diet_coke_fucker' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_go_drown_in_a_lake_of_diet_coke_fucker' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_go_drown_in_a_lake_of_diet_coke_fucker' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly thin hands gear: #1s down to .75 Camalot, a few #2s for the middle roof, fingers-size pieces at the start, and possibly one bigger cam for the wide section. Chains at the top; a 70m rope just reaches the ground when lowering.$q$ where id = 'ut_go_drown_in_a_lake_of_diet_coke_fucker' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_lean_and_green' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_lean_and_green' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_lean_and_green' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Rack is heavy on .75 and .5 Camalots.$q$ where id = 'ut_lean_and_green' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_meow_mix' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring plenty of every size, weighted toward hands and thin hands. A bolt anchor with slings waits on a ledge past the easy first pitch (about 60 ft). Linking to a 165 ft pitch is possible, or split it in two.$q$ where id = 'ut_meow_mix' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_neutron_dance' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A few small pieces, with the bulk of the rack being #3 and #2 Camalots.$q$ where id = 'ut_neutron_dance' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_power_line' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 55 ft (17 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_power_line' and pitches = 0;

-- length empty. Page type line "Trad, 55 ft (17 m)". Single source; locked-1src after apply.
update routes set length_m = 17 where id = 'ut_power_line' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A .5 purple BD to start, tight purples and an orange Metolius, a .4 grey BD, and a yellow Metolius.$q$ where id = 'ut_power_line' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_prime_cuts' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 85 ft (26 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_prime_cuts' and pitches = 0;

-- length empty. Page type line "Trad, 85 ft (26 m)". Single source; locked-1src after apply.
update routes set length_m = 26 where id = 'ut_prime_cuts' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: two #2, three #1, three .75, three .5, four .4 and one .3.$q$ where id = 'ut_prime_cuts' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_steel_pulse' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$BD from 2 down to .4 with an extra .75 and many #1.$q$ where id = 'ut_steel_pulse' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_steer_it_up' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_steer_it_up' and pitches = 0;

-- length empty. Page type line "Trad, 150 ft (45 m)". Single source; locked-1src after apply.
update routes set length_m = 45 where id = 'ut_steer_it_up' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring about 20-25 pieces: Camalots from 4 down to .5, weighted toward 3s and 2s, plus runners and quickdraws.$q$ where id = 'ut_steer_it_up' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sudden_impact' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 160 ft (48 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_sudden_impact' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Rack: 2-3 green Camalots, about 8 reds, a few golds and maybe one blue.$q$ where id = 'ut_sudden_impact' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_judge' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_judge' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_the_judge' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Friends from 3.5 down to 00 Metolius; small cams protect the higher ground. Bring 1 quickdraw.$q$ where id = 'ut_the_judge' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unbelievable' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_unbelievable' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_unbelievable' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Red and gold Camalots for the hand sections, plus fingers-to-tight-hands sizes from purple to green Camalots and a blue Alien.$q$ where id = 'ut_unbelievable' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unnamed_5_11_w_2_bolt_start' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_unnamed_5_11_w_2_bolt_start' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_unnamed_5_11_w_2_bolt_start' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring 2 quickdraws and Camalots from gold down to purple (reds place better than gold), with a #3 or #4 for the moves above the bolts; 2 bolts protect the boulder moves at the start.$q$ where id = 'ut_unnamed_5_11_w_2_bolt_start' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_belly_full_of_bad_berries' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_belly_full_of_bad_berries' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_belly_full_of_bad_berries' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Rack: (1) #5, (2) 4.5, (2-3) 4, (1) each of 3, 2, 1 and .75; an old #4 is better than a C4.$q$ where id = 'ut_belly_full_of_bad_berries' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_coco_s_boathouse' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 135 ft (41 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_coco_s_boathouse' and pitches = 0;

-- length empty. Page type line "Trad, 135 ft (41 m)". Single source; locked-1src after apply.
update routes set length_m = 41 where id = 'ut_coco_s_boathouse' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: as many #2 as you can bring, three or four #1, three or four .75, and one .5; one bolt sits by stacked nuggets.$q$ where id = 'ut_coco_s_boathouse' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_death_of_a_cowboy' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_death_of_a_cowboy' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_death_of_a_cowboy' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$#3 and #2 Camalots on the hand crack, a couple of #1 Camalots below that, and a few green and yellow Aliens at the start. A 70 m rope is needed to reach the ground.$q$ where id = 'ut_death_of_a_cowboy' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_egg_drop_soup' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_fuck_you_and_your_selfie_stick' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 105 ft (32 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_fuck_you_and_your_selfie_stick' and pitches = 0;

-- length empty. Page type line "Trad, 105 ft (32 m)". Single source; locked-1src after apply.
update routes set length_m = 32 where id = 'ut_fuck_you_and_your_selfie_stick' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$About 3 to 5 each of #1 and #2, maybe doubles of #3 and #4, and an optional #5 for pods; lots of slings (BD). A 60 m rope may be too short for a top rope (unconfirmed).$q$ where id = 'ut_fuck_you_and_your_selfie_stick' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_jutting_flake' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 85 ft (26 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_jutting_flake' and pitches = 0;

-- length empty. Page type line "Trad, 85 ft (26 m)". Single source; locked-1src after apply.
update routes set length_m = 26 where id = 'ut_jutting_flake' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Several cams from .5 to #3 and one #5.$q$ where id = 'ut_jutting_flake' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_money' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 85 ft (26 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_money' and pitches = 0;

-- length empty. Page type line "Trad, 85 ft (26 m)". Single source; locked-1src after apply.
update routes set length_m = 26 where id = 'ut_money' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots from #2 down to .3.$q$ where id = 'ut_money' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sparkling_spurs_1st_anchors' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 85 ft (26 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_sparkling_spurs_1st_anchors' and pitches = 0;

-- length empty. Page type line "Trad, 85 ft (26 m)". Single source; locked-1src after apply.
update routes set length_m = 26 where id = 'ut_sparkling_spurs_1st_anchors' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots .3 to #2, heavy on .75 and #1; an optional #4 for the pod three-quarters of the way up.$q$ where id = 'ut_sparkling_spurs_1st_anchors' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_last_day' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_last_day' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_the_last_day' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Thin .5-.75 low, many 1.5-2 in, a few 2.5 and 3 in.$q$ where id = 'ut_the_last_day' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_mystery_machine' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_mystery_machine' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_the_mystery_machine' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One of everything from #4 down to .5. Two ropes are needed to get off.$q$ where id = 'ut_the_mystery_machine' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_optimator_hayutake_direct_start' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_pastafarian' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_pastafarian' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_the_pastafarian' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$0.5 Camalots down to purple TCU or blue Alien; a #2 and/or #4 on a long sling helps at the start.$q$ where id = 'ut_the_pastafarian' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_slaughter_house' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 160 ft (48 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_slaughter_house' and pitches = 0;

-- length empty. Page type line "Trad, 160 ft (48 m)". Single source; locked-1src after apply.
update routes set length_m = 48 where id = 'ut_the_slaughter_house' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$At least three of every size from .4 to #3.$q$ where id = 'ut_the_slaughter_house' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unknown_wide_hands_lf_corner' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_unknown_wide_hands_lf_corner' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_unknown_wide_hands_lf_corner' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring enough #3 Camalots for about 80 ft of sustained wide hands, plus a #4, #2 and #1 (the #4 is useful); the anchor is three 3/8 in bolts and tat with two thin rap rings.$q$ where id = 'ut_unknown_wide_hands_lf_corner' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_beauty_and_the_beast' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_beauty_and_the_beast' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_beauty_and_the_beast' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$#.3 to #.5 Camalots.$q$ where id = 'ut_beauty_and_the_beast' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_cat_wall_to_be_deleted_unnamed_19' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_crankcase' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_crankcase' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_crankcase' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A couple of TCUs, several 1s and 1.5s, quickdraws, and a #1 Camalot or a 2.5 for the top; 4 bolts protect the offwidth section.$q$ where id = 'ut_crankcase' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_esta_dia_bonita' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_esta_dia_bonita' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_esta_dia_bonita' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$1x #4, 2x #3, optional 2x #2, 8x #1, 5x .75 and an optional .5.$q$ where id = 'ut_esta_dia_bonita' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_inconceivable' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_inconceivable' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_inconceivable' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Red Camalots in quantity, plus a few greens and a couple of smaller pieces.$q$ where id = 'ut_inconceivable' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_mad_hatter' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_mad_hatter' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_mad_hatter' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots from .5 to .3 with the most pieces at .4, plus orange TCUs for the section above the mini-roof.$q$ where id = 'ut_mad_hatter' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sparks_wall_sparking_spurs' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots from 2 down to .3, many from 1 to .5; save the .75 and .5 for the top. The first anchor comes after the hands section (5.11).$q$ where id = 'ut_sparks_wall_sparking_spurs' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_switch' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 75 ft (23 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_switch' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$0.4 to 3 BD cams; 60 m rope. Ends at chains.$q$ where id = 'ut_switch' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_crowning' and access is null;

-- length empty. Page type line "Trad, 155 ft (47 m), 2 pitches". Single source; locked-1src after apply.
update routes set length_m = 47 where id = 'ut_the_crowning' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_lgs_last_great_splitter' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 85 ft (26 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_lgs_last_great_splitter' and pitches = 0;

-- length empty. Page type line "Trad, 85 ft (26 m)". Single source; locked-1src after apply.
update routes set length_m = 26 where id = 'ut_the_lgs_last_great_splitter' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unknown_5_10_2' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unknown_5_11_really_long_thin_hands_corner' and access is null;

-- length empty. Page type line "Trad, 200 ft (61 m), 2 pitches". Single source; locked-1src after apply.
update routes set length_m = 61 where id = 'ut_unknown_5_11_really_long_thin_hands_corner' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$P1: a few cams 2"-3" plus small TCUs, with a single bolt belay at the top. P2: mostly 2.5" (red/gold Camalot), a few 3-3.5", and large TCUs 1-2" for the crux bump.$q$ where id = 'ut_unknown_5_11_really_long_thin_hands_corner' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_cattle_call' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_cattle_call' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_cattle_call' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$#1 down to #.3 Camalot.$q$ where id = 'ut_cattle_call' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_chasing_the_dragon' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_chasing_the_dragon' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_chasing_the_dragon' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Rack: 4.0 optional, 3.0 x1, 2.0 x2, 1.0 x2, .75 x1, .5 x2, plus .3 blue Metolius x4-5 and a purple Metolius x1.$q$ where id = 'ut_chasing_the_dragon' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_funny_farm' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 105 ft (32 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_funny_farm' and pitches = 0;

-- length empty. Page type line "Trad, 105 ft (32 m)". Single source; locked-1src after apply.
update routes set length_m = 32 where id = 'ut_funny_farm' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: 1 x .02, 2 x .03, 3 x .04, 4 x .05, 1 x .75, 2 x #2, 2 x #3. One bolt on the right face; two-bolt chain anchor.$q$ where id = 'ut_funny_farm' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_hole_in_the_wall' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_hole_in_the_wall' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_hole_in_the_wall' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One climber used 6 #2, 5 #3, 1 #1 and 1 #4 Camalots; the squeeze takes a #4, and two #4s help to sew it up. A 70 m rope falls just short of the ground, so lowering takes two ropes.$q$ where id = 'ut_hole_in_the_wall' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_i_ve_seen_worse' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_i_ve_seen_worse' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_i_ve_seen_worse' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Singles of blue TCU and #1-#4 C4, doubles of .4 and .3 C4, and 1 quickdraw.$q$ where id = 'ut_i_ve_seen_worse' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_left_affair' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_left_affair' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_left_affair' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Rack: 5 blue TCU and smaller, a yellow TCU at the roof, C3 00/000, and a black Alien for the top.$q$ where id = 'ut_left_affair' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_less_than_zero' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_less_than_zero' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_less_than_zero' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Micro cams, with two bolts.$q$ where id = 'ut_less_than_zero' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_miscarriage' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 145 ft (44 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_miscarriage' and pitches = 0;

-- length empty. Page type line "Trad, 145 ft (44 m)". Single source; locked-1src after apply.
update routes set length_m = 44 where id = 'ut_miscarriage' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: (1) #4, (3) #3, (6) #2, (3) #1, (2) .75, (1) .5, (2) .4, (2) .3. Bolted anchor.$q$ where id = 'ut_miscarriage' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_monster_truck' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_monster_truck' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_monster_truck' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Roughly one each of Camalots 1 through 3.5, and a bunch of 4s and 4.5s; at the top, traverse over to the Crankcase anchors.$q$ where id = 'ut_monster_truck' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_salt_lake_special' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_salt_lake_special' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_salt_lake_special' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams in the .5 to 1 in range, an optional red Camalot, and a few pre-slung small nuts.$q$ where id = 'ut_salt_lake_special' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sumo' and access is null;

-- pitches 0 is invalid. Page type line "Trad, TR, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_sumo' and pitches = 0;

-- length empty. Page type line "Trad, TR, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_sumo' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_trick_or_treat' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_trick_or_treat' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_trick_or_treat' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Gear from 3 down to .3, heavy on .75 and 1 (4-5 each), with a couple of 3s and 2s for the top and no wide gear; the anchor was recently replaced.$q$ where id = 'ut_trick_or_treat' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_bioturbation' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_bioturbation' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$3-4 .75 Camalot, 2 .5 Camalot, 2 #1, 1 #2, 1 green Alien and 2 yellow (#2 Friends may be better mid-route).$q$ where id = 'ut_bioturbation' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_ff1' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_ff1' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_ff1' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$3 Friends or gold Camalots for the first 30 ft; then 3.5 Friend or blue C size as wanted.$q$ where id = 'ut_ff1' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_pregnant_woman_grazing' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 115 ft (35 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_pregnant_woman_grazing' and pitches = 0;

-- length empty. Page type line "Trad, 115 ft (35 m)". Single source; locked-1src after apply.
update routes set length_m = 35 where id = 'ut_pregnant_woman_grazing' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Some 2s, mostly 3s, and a couple of 3.5 or 4.$q$ where id = 'ut_pregnant_woman_grazing' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_hawk' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_hawk' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_the_hawk' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly small gear, with .75 the key size.$q$ where id = 'ut_the_hawk' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_man_who_knew_too_little' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_man_who_knew_too_little' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_the_man_who_knew_too_little' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$C3s from red to grey worked best; 3 protection bolts and a ring anchor.$q$ where id = 'ut_the_man_who_knew_too_little' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_tooth_fairy' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_tooth_fairy' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_tooth_fairy' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Plenty of wide gear plus a few medium-large nuts.$q$ where id = 'ut_tooth_fairy' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_walk_the_plank_2' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_walk_the_plank_2' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_walk_the_plank_2' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Gear from 0.75" to 2.5" plus slings, heavy on finger sizes; 2 bolt anchor.$q$ where id = 'ut_walk_the_plank_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_demolition_2' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_demolition_2' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A triple set from off-fingers up to big hands; add a fresh #5 Camalot to handle the wide stretch. The top is a two-bolt anchor.$q$ where id = 'ut_demolition_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_double_time' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_double_time' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_double_time' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A couple of 2s and plenty of 3s and 4s.$q$ where id = 'ut_double_time' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_dreams_of_electric_aardvarks' and access is null;

-- pitches 0 is invalid. Page type line "Trad, TR, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_dreams_of_electric_aardvarks' and pitches = 0;

-- length empty. Page type line "Trad, TR, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_dreams_of_electric_aardvarks' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Extra thin finger-to-finger sizes (.2-.4 Camalot) and one each from .5 to #3; the anchor is two bolts with chains.$q$ where id = 'ut_dreams_of_electric_aardvarks' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_fairy_tales' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_fairy_tales' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_fairy_tales' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$6 yellow Aliens and 3 green.$q$ where id = 'ut_fairy_tales' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_fringe_walls_white_pattie' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take 1x #5, 2x 2, 4x 1, 6-8 x .75 and 2x .5.$q$ where id = 'ut_fringe_walls_white_pattie' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_little_magic' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_little_magic' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_little_magic' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$(1) #6, (2) #4, (6) #3.$q$ where id = 'ut_little_magic' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_morning_wood' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_morning_wood' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_morning_wood' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Rack: (5) .75, (3) #1 Camalots (a #2 works better), (2) each of .5, .4 and .3; a #5 is optional for the pod.$q$ where id = 'ut_morning_wood' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_good_times' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 140 ft (42 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_good_times' and pitches = 0;

-- length empty. Page type line "Trad, 140 ft (42 m)". Single source; locked-1src after apply.
update routes set length_m = 42 where id = 'ut_good_times' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$#4 down to #2 Camalots, several #4.5 up to the new #5, and one #6. Ends at chains.$q$ where id = 'ut_good_times' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_nathan_martin' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_nathan_martin' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_nathan_martin' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Start with a .2 Camalot and a blue Mastercam, then a blue Metolius or green Alien; the main rack is (2) .3, (3) .4, (5) .5 and (3) .75 Camalots. One bolt mid-route, plus two bolts with chains at the anchor.$q$ where id = 'ut_nathan_martin' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_rip_curl' and access is null;

-- length empty. Page type line "Trad, 130 ft (39 m), 2 pitches". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_rip_curl' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Rack: 0.3-4, heavy on 0.5 to 0.75; the two pitches can be linked as one.$q$ where id = 'ut_rip_curl' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_skid_row' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_skid_row' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_skid_row' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: (1) each of #2 and #1, (3) #.75, (5) #.5, (2) #.4; chains at the top.$q$ where id = 'ut_skid_row' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_super_cat_of_the_desert' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_super_cat_of_the_desert' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_super_cat_of_the_desert' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring 6 or 7 #1 Camalots, several .4, .5 and .75, and a #2.$q$ where id = 'ut_super_cat_of_the_desert' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unknown_easy_hand_crack_right_of_wiggins' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_unknown_easy_hand_crack_right_of_wiggins' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_unknown_easy_hand_crack_right_of_wiggins' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Several #1 and #2 Camalots.$q$ where id = 'ut_unknown_easy_hand_crack_right_of_wiggins' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_war_horse' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_war_horse' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_war_horse' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$(1) #6, (1) #3, (5) #2 and (5) #1, plus slings for the roofs.$q$ where id = 'ut_war_horse' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_barlage_lawlor' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_barlage_lawlor' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_barlage_lawlor' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Ends at a two-bolt anchor with chains; a 70 m rope may not quite reach the ground.$q$ where id = 'ut_barlage_lawlor' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_color_me_badass' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 75 ft (23 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_color_me_badass' and pitches = 0;

-- length empty. Page type line "Trad, 75 ft (23 m)". Single source; locked-1src after apply.
update routes set length_m = 23 where id = 'ut_color_me_badass' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One climber carried 5x #3, 4x #4 and one #5, and wanted more #4s; the anchors are bolted.$q$ where id = 'ut_color_me_badass' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_juvenile_delinquent' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_juvenile_delinquent' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_juvenile_delinquent' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Rack: #4 Camalot, #1, .75 x2, .5 x3, and a yellow C3.$q$ where id = 'ut_juvenile_delinquent' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sea_of_heartbreak' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 95 ft (29 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_sea_of_heartbreak' and pitches = 0;

-- length empty. Page type line "Trad, 95 ft (29 m)". Single source; locked-1src after apply.
update routes set length_m = 29 where id = 'ut_sea_of_heartbreak' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots 1, 0.75, 4 x 0.5, 2 x 0.4, 0.3; optional blue Metolius. Ends at chains.$q$ where id = 'ut_sea_of_heartbreak' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_overlook_2' and access is null;

-- length empty. Page type line "Trad, 200 ft (61 m), 2 pitches". Single source; locked-1src after apply.
update routes set length_m = 61 where id = 'ut_the_overlook_2' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Pitch 1: bring a #5 Camalot and save a couple of #3 for the last part; long runners are helpful.$q$ where id = 'ut_the_overlook_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_question_mark' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 95 ft (29 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_question_mark' and pitches = 0;

-- length empty. Page type line "Trad, 95 ft (29 m)". Single source; locked-1src after apply.
update routes set length_m = 29 where id = 'ut_the_question_mark' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One of everything from tips to hands; used 3 x #3, 1 x #2, .5, .4 and .3.$q$ where id = 'ut_the_question_mark' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_schoolmaster' and access is null;

-- length empty. Page type line "Trad, Aid, 160 ft (48 m), 2 pitches, Grade II". Single source; locked-1src after apply.
update routes set length_m = 48 where id = 'ut_the_schoolmaster' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Start with a handful of finger and hand cams, maybe a #5 for the chimney, and about 12 quickdraws for the last pitch. Pitch one finishes on a big ledge with solid anchors.$q$ where id = 'ut_the_schoolmaster' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unnamed_5_11_at_top_of_trail' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_unnamed_5_11_at_top_of_trail' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_unnamed_5_11_at_top_of_trail' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: (1) #2, (1) #1, (3-4) #.75, (4+) #.5, plus (3) .75 and (2) .5; the anchor at the top needs attention since the route is seldom done.$q$ where id = 'ut_unnamed_5_11_at_top_of_trail' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_big_o' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_big_o' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_the_big_o' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Green C3, #1 C4, red C3 and 2 blue Big Bros, plus the single bolt about 3/4 of the way up (a gold tube is possible); the anchors sit on top of the pillar.$q$ where id = 'ut_the_big_o' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_too_much_cake' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring 10+ of .75 Camalot or 1.5 Friend, one #5 Camalot for the offwidth start, one TCU set for the thin low crack, and a #0 TCU at the notch to keep the rope out.$q$ where id = 'ut_too_much_cake' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_ninja_in_the_shadows' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_ninja_in_the_shadows' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_ninja_in_the_shadows' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Pieces for wide hands (just a few) and runners, followed by many fingers and tips sizes; Aliens, TCUs and BD help.$q$ where id = 'ut_ninja_in_the_shadows' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sacred_space' and access is null;

-- length empty. Page type line "Trad, 300 ft (91 m), 2 pitches". Single source; locked-1src after apply.
update routes set length_m = 91 where id = 'ut_sacred_space' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_blockhead' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 140 ft (42 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_blockhead' and pitches = 0;

-- length empty. Page type line "Trad, 140 ft (42 m)". Single source; locked-1src after apply.
update routes set length_m = 42 where id = 'ut_blockhead' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A triple rack from .4 to #2, two #3s and two #4s, and maybe a #5 up top, though that is uncertain.$q$ where id = 'ut_blockhead' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_carruthers_hauser' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_carruthers_hauser' and pitches = 0;

-- length empty. Page type line "Trad, 150 ft (45 m)". Single source; locked-1src after apply.
update routes set length_m = 45 where id = 'ut_carruthers_hauser' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Doubles from #1 down to .3, and lots of #3 and #2.$q$ where id = 'ut_carruthers_hauser' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_frosted_flakes_2' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_frosted_flakes_2' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_frosted_flakes_2' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$1 each from #3 down to .75 for the start; 4 x 3.5 (#4 C4) and 2 x #4 for the main section; an extra #1 for the finish.$q$ where id = 'ut_frosted_flakes_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_lifer' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_lifer' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_lifer' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Lots of #1, a few #2, a couple of .75, and maybe a #4 for the start.$q$ where id = 'ut_lifer' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_pistol_whipped_kelley_route_14' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$2 x .5, 5 x .75, 2 x 1; bring an extra .75 and a .4 for the last move.$q$ where id = 'ut_pistol_whipped_kelley_route_14' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_gash' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_gash' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_the_gash' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One draw, two BD #4, 1-2 #4 Friend or BD 3.5, 3-4 BD #3, a #1 and a #2. One bolt protects the top offwidth squeeze.$q$ where id = 'ut_the_gash' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unnamed_5_11_in_bloom_guide' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_unnamed_5_11_in_bloom_guide' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_unnamed_5_11_in_bloom_guide' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots from #3 down to #.2, one green Alien and lots of runners; most of the wavy flake takes a #2, the small roof a #1, and the thinning corner switch a #.75. The anchor type at the top is not known.$q$ where id = 'ut_unnamed_5_11_in_bloom_guide' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unsorted_routes_unnamed_5_11_aka_entrance_exam' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams from 0.3 to 3 with the most weight on 2 and 3; bring a #6 for the wedge, which helps.$q$ where id = 'ut_unsorted_routes_unnamed_5_11_aka_entrance_exam' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_election_wall_2_stairway_to_heaven' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$P1: a small start then doubles or triples of #3 and #2. P2: #2-#1 for hands and tight hands, plus a single #4-#5 for the pod.$q$ where id = 'ut_election_wall_2_stairway_to_heaven' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_pack_rat' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_pack_rat' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_pack_rat' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One bolt is clipped.$q$ where id = 'ut_pack_rat' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unnamed_5_2' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_apocalypso_variation_aka_power_hardly_know_her' and access is null;

-- length empty. Page type line "Trad, 130 ft (39 m), 2 pitches". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_apocalypso_variation_aka_power_hardly_know_her' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Two 4s, lots of 2s and 3s, three 1s, and a .5 and slings for the traverse.$q$ where id = 'ut_apocalypso_variation_aka_power_hardly_know_her' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_beach_break' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 85 ft (26 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_beach_break' and pitches = 0;

-- length empty. Page type line "Trad, 85 ft (26 m)". Single source; locked-1src after apply.
update routes set length_m = 26 where id = 'ut_beach_break' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take .5 to 3 sized gear, mostly 2s, and a couple of runners; a drilled angle and one bolt cover the suspect section.$q$ where id = 'ut_beach_break' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_dream_a_little_bigger_darlin' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_dream_a_little_bigger_darlin' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_dream_a_little_bigger_darlin' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A #4 Big Bro, #8 C4 or #12 Valley Giant.$q$ where id = 'ut_dream_a_little_bigger_darlin' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_goliath' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_goliath' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_goliath' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly .75 and 1 inch pieces lower, finger sizes at the top; pair of rings at the anchor, and a 70 m rope barely reaches the ground.$q$ where id = 'ut_goliath' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_have_a_cow' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 140 ft (42 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_have_a_cow' and pitches = 0;

-- length empty. Page type line "Trad, 140 ft (42 m)". Single source; locked-1src after apply.
update routes set length_m = 42 where id = 'ut_have_a_cow' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$(2-4) #5, (3-4) #4, (2) .5-#1, (1) .4, (1) .3.$q$ where id = 'ut_have_a_cow' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_jimmy_dean' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_jimmy_dean' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_jimmy_dean' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Tips to #1 Camalot, mostly .5s.$q$ where id = 'ut_jimmy_dean' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_ocean_negro' and access is null;

-- length empty. Page type line "Trad, 250 ft (76 m), 3 pitches". Single source; locked-1src after apply.
update routes set length_m = 76 where id = 'ut_ocean_negro' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bolts, small gear including nuts, and 2 blue Aliens.$q$ where id = 'ut_ocean_negro' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unnamed_5_11_38_twin_crack_start' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_unnamed_5_11_38_twin_crack_start' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_unnamed_5_11_38_twin_crack_start' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$3 each from #2 down to .5 Camalot, and 2 each of .4 and .3.$q$ where id = 'ut_unnamed_5_11_38_twin_crack_start' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_big_red_2' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_big_red_2' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_big_red_2' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$(2) #6, (3) #5 and #4s.$q$ where id = 'ut_big_red_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_donnelly_canyon_elephant_ear_aka_fish_taco' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Black totem up to #6 Camalot; triples of #1 through #3, doubles of #4 and #5, and singles of the rest. Extend gear as the route wanders.$q$ where id = 'ut_donnelly_canyon_elephant_ear_aka_fish_taco' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_ginzu' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_ginzu' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_ginzu' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A few tips pieces; many from yellow Alien/TCU to red Alien/.5 BD, with doubles of the .75 and #1 BD.$q$ where id = 'ut_ginzu' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_horsasuarus' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_horsasuarus' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_horsasuarus' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$3 each of #5 and #6, 2 each of #4, #3 and #2; or a blue/gold choke tube.$q$ where id = 'ut_horsasuarus' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_jones_in' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_jones_in' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_jones_in' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Friends: .4 x2, .5 x2, .75 x10, 1.0 x8; plus one each of Camalots #3, #2, #1 and #.75.$q$ where id = 'ut_jones_in' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_stella' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 112 ft (34 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_stella' and pitches = 0;

-- length empty. Page type line "Trad, 112 ft (34 m)". Single source; locked-1src after apply.
update routes set length_m = 34 where id = 'ut_stella' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$4-5 #6, 3 #5, 2 #3-4, 1 #2 and 1-2 #1; use #2-3 at the start and save the small cams for the finish.$q$ where id = 'ut_stella' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_trick_or_treat_wall_hong_like_a_horse' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unknown_74' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_4x20' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_4x20' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_4x20' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly very thin gear. One bolt out left by the gong flake; chains at the top.$q$ where id = 'ut_4x20' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_altitude_wall_cruising_altitude' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$C4s from 3 down to .3, with extra 2s and 3s.$q$ where id = 'ut_altitude_wall_cruising_altitude' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_dove_creek_wall_pinto_bean' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$2 x .4, 3 x .5, 1 x red Metolius, 4-6 x .75, 1 x #2.$q$ where id = 'ut_dove_creek_wall_pinto_bean' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_killer' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 140 ft (42 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_killer' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$(1) 3.5, (6) 2.0, (9) 1.5, (6) 1.0 and (4) .75 Friends; an 80 m rope is needed to lower.$q$ where id = 'ut_killer' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_scrunch' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_scrunch' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take 3 draws, anchor draws, and finger pieces up to about #1 Camalot; there are at least 3 bolts, with 2 clipped low and the third higher.$q$ where id = 'ut_scrunch' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_strike_and_dip' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 140 ft (42 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_strike_and_dip' and pitches = 0;

-- length empty. Page type line "Trad, 140 ft (42 m)". Single source; locked-1src after apply.
update routes set length_m = 42 where id = 'ut_strike_and_dip' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Many #1-1.5 Friends or .75 and .5 Camalots, a couple of hand sizes, and runners for the start.$q$ where id = 'ut_strike_and_dip' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_tender_vittles' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_tender_vittles' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Plenty of black, blue and green Aliens, plus a few finger pieces.$q$ where id = 'ut_tender_vittles' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_hostess' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_hostess' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_the_hostess' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Gear from hands to very large, with an extra #4 and #3; it shares an anchor with The Host.$q$ where id = 'ut_the_hostess' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unknown_5_10_3' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_warren_s_left_leaning_crack' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_warren_s_left_leaning_crack' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_warren_s_left_leaning_crack' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Fingers to hands sizes, heavy on the .75 Camalot; an intermediate anchor sits mid-route, followed by the final anchor.$q$ where id = 'ut_warren_s_left_leaning_crack' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_3d_sawzall' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams from 4 down to .5, mostly 1s; gear low in the flake is easy to push in.$q$ where id = 'ut_3d_sawzall' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_from_switzerland_with_love' and access is null;

-- length empty. Page type line "Trad, 60 ft (18 m), 2 pitches". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_from_switzerland_with_love' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Doubles from .5 down to .2, including an orange Metolius; a redpoint rack needs less.$q$ where id = 'ut_from_switzerland_with_love' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_habitado_macho' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Blue Metolius x3.$q$ where id = 'ut_habitado_macho' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_he_s_up_here' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_he_s_up_here' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_he_s_up_here' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$The Where's Carruthers rack plus offwidth gear and extra fist pieces.$q$ where id = 'ut_he_s_up_here' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_laser_s_edge' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_laser_s_edge' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_laser_s_edge' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$BD .4-.75, mostly .5 and .75.$q$ where id = 'ut_laser_s_edge' and detailed_rack is null;

commit;

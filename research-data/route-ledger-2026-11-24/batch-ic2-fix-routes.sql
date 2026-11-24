-- Indian Creek batch IC2 (2026-11-24): writes enrich:apply cannot make. Old value in every WHERE.
begin;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_broken_brain' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_broken_brain' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_broken_brain' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Expect one bolt near the third pod and a few finger and hand pieces low down; on the headwall bring about three each from gold C4 to green C4, plus one purple .5, and there is one bolt by the final pod.$q$ where id = 'ut_broken_brain' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_variety_pack' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 170 ft (52 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_variety_pack' and pitches = 0;

-- length empty. Page type line "Trad, 170 ft (52 m)". Single source; locked-1src after apply.
update routes set length_m = 52 where id = 'ut_variety_pack' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring six to eight finger-size pieces, gray and purple Camalots, a couple of green Aliens, and a couple each of larger pieces up to #2 Camalot; two ropes are needed.$q$ where id = 'ut_variety_pack' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sting_2' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_sting_2' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One .5, three #1, five 1.5, four #2 and four #3.$q$ where id = 'ut_sting_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_goldeneye' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 125 ft (38 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_goldeneye' and pitches = 0;

-- length empty. Page type line "Trad, 125 ft (38 m)". Single source; locked-1src after apply.
update routes set length_m = 38 where id = 'ut_goldeneye' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams from 3 Camalot down to .5, emphasizing #1, .75 and .5, holding back one .5 Camalot or a 1.25 TechFriend for the crux; the well-placed anchors sit at the top.$q$ where id = 'ut_goldeneye' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_let_er_buck' and access is null;

-- pitches 0 is invalid. Page type line "Sport, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_let_er_buck' and pitches = 0;

-- length empty. Page type line "Sport, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_let_er_buck' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$About 12 quickdraws.$q$ where id = 'ut_let_er_buck' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_puzzle_factory' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_puzzle_factory' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_puzzle_factory' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring mostly purple and green Camalots; #1.5 Friends work best.$q$ where id = 'ut_puzzle_factory' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_hydraulic_pump' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_hydraulic_pump' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_hydraulic_pump' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Plenty of 0.75 and 0.5 Camalots, with a 0.4 useful for the last move to the chains.$q$ where id = 'ut_hydraulic_pump' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sparks_wall_best_in_show_airwolf' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Crash pads, plus extra; to get down, downclimb the back side of the boulder, with a rope optional.$q$ where id = 'ut_sparks_wall_best_in_show_airwolf' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_burl_dog' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_burl_dog' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Seven 0.4 cams; the anchors can also be reached by lowering off Kool Cat and climbing up the jugs.$q$ where id = 'ut_burl_dog' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_cobweb_splitter' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_cobweb_splitter' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_cobweb_splitter' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A blue Alien #1.$q$ where id = 'ut_cobweb_splitter' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_family_home_night' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_family_home_night' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_family_home_night' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A couple of hand-size pieces, two #2, six .75, four 1-inch cams, a couple of blue and yellow TCUs, one .00 TCU and small nuts.$q$ where id = 'ut_family_home_night' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_gold_standard' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 140 ft (42 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_gold_standard' and pitches = 0;

-- length empty. Page type line "Trad, 140 ft (42 m)". Single source; locked-1src after apply.
update routes set length_m = 42 where id = 'ut_gold_standard' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring #1 to #4, heavy on 3s and 4s.$q$ where id = 'ut_gold_standard' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_pat_s_blue_ribbon' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_pat_s_blue_ribbon' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_pat_s_blue_ribbon' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring mostly yellow and gray Aliens, a yellow C3, and one or two blue Aliens near the top; rappel from the chains.$q$ where id = 'ut_pat_s_blue_ribbon' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_desert_shield' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_desert_shield' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Three 1 in, six .75 in and four .5 in, plus one each of gold, red and green Camalot, and a few slings and quickdraws.$q$ where id = 'ut_desert_shield' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sacred_cow' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_sacred_cow' and pitches = 0;

-- length empty. Page type line "Trad, 150 ft (45 m)". Single source; locked-1src after apply.
update routes set length_m = 45 where id = 'ut_sacred_cow' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Friends: three #3, seven #2, six #1.5 and two #1, with green Camalots working best on the headwall; the anchors are about 15 ft above the last hand jam.$q$ where id = 'ut_sacred_cow' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unnamed_5_10_flare' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_unnamed_5_10_flare' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_unnamed_5_10_flare' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Two #3, six #2 and one #1 Camalot; anchors at the top.$q$ where id = 'ut_unnamed_5_10_flare' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_bon_voyage' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 115 ft (35 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_bon_voyage' and pitches = 0;

-- length empty. Page type line "Trad, 115 ft (35 m)". Single source; locked-1src after apply.
update routes set length_m = 35 where id = 'ut_bon_voyage' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring a #4 or bigger for the wide middle, lots of cams from 2.5 down to 1.5 inches with most at 2 inches, and small cams saved for the cups near the top; one climber reports needing an 80 m rope to lower, while a 70 m worked for another.$q$ where id = 'ut_bon_voyage' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_liquid_sky' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_optimator' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_optimator' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_optimator' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Use a yellow Alien in the first corner (a #1 fits at the corner switch), then yellow Alien up to orange Metolius; a couple of .5s before the pods; four .75s or red Metolius to the bulge; a .5 or red Alien through the roof; a few orange Metolius or red Aliens to the top; and one .75 at the top.$q$ where id = 'ut_optimator' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_wiggins_ii' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_wiggins_ii' and pitches = 0;

-- length empty. Page type line "Trad, 150 ft (45 m)". Single source; locked-1src after apply.
update routes set length_m = 45 where id = 'ut_wiggins_ii' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Gear from tips up to big hands; one drilled pin sits mid-route just below the tips section.$q$ where id = 'ut_wiggins_ii' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_dentist_chair' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_dentist_chair' and pitches = 0;

-- length empty. Page type line "Trad, 150 ft (45 m)". Single source; locked-1src after apply.
update routes set length_m = 45 where id = 'ut_dentist_chair' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Fingers and hands sizes, several Black Diamond #5 and #2 Big Bros.$q$ where id = 'ut_dentist_chair' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_night_nurse' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_night_nurse' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_night_nurse' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams from 4 down to 0.2, with extras in 1, 0.75 and 0.5; the anchor is two bolts and a chain, and a 70 m rope with knots will lower you, though an 80 m is better.$q$ where id = 'ut_night_nurse' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_stagefright' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_stagefright' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_stagefright' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring two green C3 up to a .75 Camalot plus a #3 Camalot on a double-length sling so it reaches the crack, and one or two green C3 to .5 and three or four .75s for the way to the chains.$q$ where id = 'ut_stagefright' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_air_swedin' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_air_swedin' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring very small pieces up to 1 inch, with doubles or triples of finger-to-hand sizes; a gray TCU can be placed at the crux. It shares the anchor of Swedin-Ringle, which is advised to clip, and lowering takes a 60 m rope.$q$ where id = 'ut_air_swedin' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_mondo' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_mondo' and pitches = 0;

-- length empty. Page type line "Trad, 150 ft (45 m)". Single source; locked-1src after apply.
update routes set length_m = 45 where id = 'ut_mondo' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring one each of #1 Friend and .5, .75, 1 and 2 Camalots, two each of #3 and 3.5 Friends, and six to eight #4 Friends (or extra #4 Camalots); the anchor was fixed long ago, is described as bomber, and is hard to see.$q$ where id = 'ut_mondo' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_second_choice' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_second_choice' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_second_choice' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring Friends in these quantities: three #1, five #1.5 and four #2.$q$ where id = 'ut_second_choice' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_brother_from_another_planet' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_brother_from_another_planet' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_brother_from_another_planet' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: one #6 (two is better), one #5, one #3, two #2, one #1, two to three .75, one .5 and two .4; also two #1 Metolius.$q$ where id = 'ut_brother_from_another_planet' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_flicking_the_bean' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 105 ft (32 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_flicking_the_bean' and pitches = 0;

-- length empty. Page type line "Trad, 105 ft (32 m)". Single source; locked-1src after apply.
update routes set length_m = 32 where id = 'ut_flicking_the_bean' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$For the right crack: one #4, one #3, four #2, two #1, two #.75 and two #.5 cams, with more #4 and #3 for the left crack.$q$ where id = 'ut_flicking_the_bean' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_tenderloins' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_tenderloins' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_tenderloins' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Six 1.5 Friends, four green Camalots, two #1 Camalots, three .5 cams and three orange Metolius.$q$ where id = 'ut_tenderloins' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_octopussy_2' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 200 ft (61 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_octopussy_2' and pitches = 0;

-- length empty. Page type line "Trad, 200 ft (61 m)". Single source; locked-1src after apply.
update routes set length_m = 61 where id = 'ut_octopussy_2' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring one #6 Camalot, three or four each from .5 to #2, and one or two #3s for the top; a chockstone is slung. The anchor is bolts with webbing, and two ropes are needed to rappel.$q$ where id = 'ut_octopussy_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_pistol_whipped' and access is null;

-- length empty. Page type line "Trad, 310 ft (94 m), 3 pitches". Single source; locked-1src after apply.
update routes set length_m = 94 where id = 'ut_pistol_whipped' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Lots of #2 Friends and purple Camalots for the third pitch, and a #4 Camalot helps on the second; expect thin hands and rattly fingers.$q$ where id = 'ut_pistol_whipped' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_thank_god_for_pods' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_thank_god_for_pods' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams from .4 to 3.$q$ where id = 'ut_thank_god_for_pods' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_reincarnation' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 115 ft (35 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_reincarnation' and pitches = 0;

-- length empty. Page type line "Trad, 115 ft (35 m)". Single source; locked-1src after apply.
update routes set length_m = 35 where id = 'ut_reincarnation' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Two to three .75, four to six .5, four .4 and two .3 Camalots plus one red C3; the anchor is bolted and a 70 m rope is needed.$q$ where id = 'ut_reincarnation' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_ziji' and access is null;

-- length empty. Page type line "Trad, 400 ft (121 m), 4 pitches, Grade II". Single source; locked-1src after apply.
update routes set length_m = 121 where id = 'ut_ziji' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Roughly one .4, two .5, five .75, nine 1.0, three 1.5 and two 2.0 cams plus small nuts; the first pitch adds one #2.5, one #4.0 and one #4.5 Camalot. The older #4.5 sizing is meant, so bring a #5 if your cam is the new size.$q$ where id = 'ut_ziji' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_cyborg' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_cyborg' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_cyborg' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A big piece at the start (#4.5 Camalot), then many finger-size cams.$q$ where id = 'ut_cyborg' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_half_shark_alligator_half_man' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_half_shark_alligator_half_man' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_half_shark_alligator_half_man' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring Aliens (two red, two gray, two green and one blue) and draws for the pitons; fixed pitons and KBs protect the crux.$q$ where id = 'ut_half_shark_alligator_half_man' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_blood_sausage' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_blood_sausage' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_blood_sausage' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring two each of .3 to .5 and three .75 Camalots, plus an optional 2" piece for the start; the anchor is two bolts.$q$ where id = 'ut_blood_sausage' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_end_of_the_line' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 180 ft (55 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_end_of_the_line' and pitches = 0;

-- length empty. Page type line "Trad, 180 ft (55 m)". Single source; locked-1src after apply.
update routes set length_m = 55 where id = 'ut_end_of_the_line' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A few .4, a #4 and #3 for the offwidth, and 15 or more of the .5 and .75; use two ropes.$q$ where id = 'ut_end_of_the_line' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_immaculate_conception' and access is null;

-- length empty. Page type line "Trad, 230 ft (70 m), 2 pitches". Single source; locked-1src after apply.
update routes set length_m = 70 where id = 'ut_immaculate_conception' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: one .75, five .5, six .4 and four .3, plus a couple of hand-size pieces for the approach pitch; the anchors are bolted, with a single-bolt belay at the first ledge.$q$ where id = 'ut_immaculate_conception' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_mean_black_dog' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_mean_black_dog' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_mean_black_dog' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One set from fingers to hands plus extra micros, two green C3s at the crux stance, quickdraws and a runner; two bolts and an anchor at the top.$q$ where id = 'ut_mean_black_dog' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_marvelous' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_marvelous' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_marvelous' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Many small cams from tiny up to finger-stack sizes, plus maybe one or two for thin hands.$q$ where id = 'ut_marvelous' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_mega_bucks' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_mega_bucks' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$C4s: one to two #6, five to six #5, four #4, and one each of #3, #2 and #1, with an old #4 handy near the top.$q$ where id = 'ut_mega_bucks' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_ninja_bedwetter' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 140 ft (42 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_ninja_bedwetter' and pitches = 0;

-- length empty. Page type line "Trad, 140 ft (42 m)". Single source; locked-1src after apply.
update routes set length_m = 42 where id = 'ut_ninja_bedwetter' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Five 1.5" pieces, three #1 BD, and three to five each of the .4 and .3 BD. Add a couple of 1" pieces, a #4 for the runout face under the crux, and a Gold for the pod beneath the last roof. Two or so blue Metolius cover the final 10 ft.$q$ where id = 'ut_ninja_bedwetter' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_learning_to_fly' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_learning_to_fly' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_learning_to_fly' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Five to six .4 Camalots and one to two .3.$q$ where id = 'ut_learning_to_fly' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_acapulco' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A single rack from .4 to 4, heavy on the .4 with an extra .5.$q$ where id = 'ut_acapulco' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_lobotomy' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_lobotomy' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_lobotomy' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_winner_takes_all' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_winner_takes_all' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring two green Alien or blue Camalot, three yellow Alien or gray Camalot, three or four gray Alien or orange Metolius, three red Alien or purple Camalot, and one green Camalot.$q$ where id = 'ut_winner_takes_all' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_tasmania' and access is null;

-- pitches 0 is invalid. Page type line "Trad, Sport, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_tasmania' and pitches = 0;

-- length empty. Page type line "Trad, Sport, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_tasmania' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring one bigger cam for the start, one or two at 1 inch, then 3/4 inch and smaller; the anchor is chains.$q$ where id = 'ut_tasmania' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_big_brother' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 121 ft (37 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_big_brother' and pitches = 0;

-- length empty. Page type line "Trad, 121 ft (37 m)". Single source; locked-1src after apply.
update routes set length_m = 37 where id = 'ut_big_brother' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring a .3, two #2s, a 3.5, two or three #4s and at least three #4.5s; an old #5 fits and a new #6 is optional. The anchor is two new 1/2" bolts with chains under a small roof, and a 70 m rope is needed.$q$ where id = 'ut_big_brother' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_bruce_lee_as_fuck' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_bruce_lee_as_fuck' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_bruce_lee_as_fuck' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring singles of .4, .5 and .75, three #1s, single #2 and #3, three new #4s, two #5 Friends, two old #4s and two new #5s.$q$ where id = 'ut_bruce_lee_as_fuck' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_humble_pie' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_humble_pie' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_humble_pie' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Doubles from purple C3 up to green C4, plus one #1 C4 for the start.$q$ where id = 'ut_humble_pie' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_christmas_tree' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 140 ft (42 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_christmas_tree' and pitches = 0;

-- length empty. Page type line "Trad, 140 ft (42 m)". Single source; locked-1src after apply.
update routes set length_m = 42 where id = 'ut_christmas_tree' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$TCUs: 14 blue, six yellow, two red, two purple and one orange.$q$ where id = 'ut_christmas_tree' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_fringe_walls_rasta_safari' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams from #2 Camalot down to .3; one party used a #2, three #1, two .75, five .5, two .4 and one .3, and extra .5s are worth considering; chains at the top, and a 60 m rope is noted.$q$ where id = 'ut_fringe_walls_rasta_safari' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_god_damn' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_god_damn' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_god_damn' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring BD Camalots in .4, two .5s up to 3, plus extra 1s, 2s and 3s; the anchor is chains.$q$ where id = 'ut_god_damn' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_positraction' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_positraction' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_positraction' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots from #0.4 to #2; a 60 m rope is enough, and the belayer should be anchored.$q$ where id = 'ut_positraction' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sun_dawg' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_sun_dawg' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_sun_dawg' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A few of each hand size, plus a .75 for the top.$q$ where id = 'ut_sun_dawg' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unnamed_5_11_4' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_too_much_candy' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 125 ft (38 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_too_much_candy' and pitches = 0;

-- length empty. Page type line "Trad, 125 ft (38 m)". Single source; locked-1src after apply.
update routes set length_m = 38 where id = 'ut_too_much_candy' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One quickdraw, six #5 and four #4, with an optional #6; a lone protection bolt near the start is not used on the free ascent.$q$ where id = 'ut_too_much_candy' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_ultimate_crack' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_ultimate_crack' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_ultimate_crack' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One #4, one #3, four to five green, four to five purple, four grey and three blue (.3) cams, plus two to three blue Metolius. A drilled angle near the top can be clipped. An 80 m rope works; a 70 m may come up just short.$q$ where id = 'ut_ultimate_crack' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_2nd_meat_wall_frozen_meat_curtains' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring .5 to 2 sizes, mostly 1s and 2s; there is one bolt in the flake, and an 80 m rope just reaches the ground.$q$ where id = 'ut_2nd_meat_wall_frozen_meat_curtains' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_2nd_meat_wall_hot_pork_sunday' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$The first pitch takes thin fingers up to red Camalots; for the second, one climber reported four red, seven green, two purple, two gray and one blue Camalot.$q$ where id = 'ut_2nd_meat_wall_hot_pork_sunday' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_3am_crack' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 115 ft (35 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_3am_crack' and pitches = 0;

-- length empty. Page type line "Trad, 115 ft (35 m)". Single source; locked-1src after apply.
update routes set length_m = 35 where id = 'ut_3am_crack' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Four #1 Camalots and mostly #2 and #3; one reporter took six of each.$q$ where id = 'ut_3am_crack' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_4x4_4x4' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Three 000 C3s, two 00 C3s, two grey TCUs, two purple TCUs and one blue TCU.$q$ where id = 'ut_4x4_4x4' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_big_jon' and access is null;

-- length empty. Page type line "Trad, 350 ft (106 m), 3 pitches". Single source; locked-1src after apply.
update routes set length_m = 106 where id = 'ut_big_jon' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$First pitch: #6, #5, #3 and #1 Camalots plus a finger piece; second pitch: hand pieces, a #5 and a #4; third pitch: six 1.5-inch units, one 2-inch and three .5; a ring anchor sits atop the first pitch.$q$ where id = 'ut_big_jon' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_cave_route' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_cave_route' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Five #2 Friends, two #1 Camalots, three .75 and two .5, plus one 2.5 Friend; bolted anchor. The crack can eat the rope when you pull it.$q$ where id = 'ut_cave_route' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_herbie_s_king_cobra' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_herbie_s_king_cobra' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_herbie_s_king_cobra' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams from #4 Camalot down to .3, an optional #5, and stoppers.$q$ where id = 'ut_herbie_s_king_cobra' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_like_a_prayer' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_like_a_prayer' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_like_a_prayer' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring small gear plus assorted cams.$q$ where id = 'ut_like_a_prayer' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_machete' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_machete' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_machete' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Four purple TCUs, four .3 Camalots, three .4 Camalots, one blue TCU, one gray TCU and one 000 C3.$q$ where id = 'ut_machete' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_six_star_crack' and access is null;

-- length empty. Page type line "Trad, 250 ft (76 m), 2 pitches". Single source; locked-1src after apply.
update routes set length_m = 76 where id = 'ut_six_star_crack' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots from .3 to 3: seven 1, six .75 and four .5; the first-pitch face has a few bolts, with the belay at bolts under the second pitch.$q$ where id = 'ut_six_star_crack' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_angry_inch_2' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 45 ft (14 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_angry_inch_2' and pitches = 0;

-- length empty. Page type line "Trad, 45 ft (14 m)". Single source; locked-1src after apply.
update routes set length_m = 14 where id = 'ut_the_angry_inch_2' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Six .5 Camalots and two .4 Camalots; three bolts with slings make the anchor.$q$ where id = 'ut_the_angry_inch_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_wavy_gravy' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_wavy_gravy' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_wavy_gravy' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring one #2, one #2.5, several #3s and one #3.5 Friend, plus a couple of runners for drag.$q$ where id = 'ut_wavy_gravy' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_3_strikes_you_re_out' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_3_strikes_you_re_out' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_3_strikes_you_re_out' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring one #1.75 Friend, two #.5, four #.75, four #2 Friends, one #1 and three #2 Camalots.$q$ where id = 'ut_3_strikes_you_re_out' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_4_x_4' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_4_x_4' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_4_x_4' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Roughly two #3.5 Camalots, four #3 Camalots, one #3 Friend and two #2 Camalots, as an approximate guess.$q$ where id = 'ut_4_x_4' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_bad_rad_duality' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_bad_rad_duality' and pitches = 0;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_battle_of_the_bulge' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_battle_of_the_bulge' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_battle_of_the_bulge' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Seven #2 Friends, three #0.75 Camalots, two #1 Camalots and one #2.5 Friend (for the lower anchors); there are two sets of anchors, and the upper set is slightly lower in quality.$q$ where id = 'ut_battle_of_the_bulge' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_black_corner' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams: three #2 Friends, four #1 Camalots, three .75 Camalots, one .5 Camalot, two red Metolius and two orange Metolius; the anchor is bolts.$q$ where id = 'ut_black_corner' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_black_uhuru' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_black_uhuru' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Friends up to 3 inches, heavy in the .5 to 2 inch range; a 70 m rope reaches the ground, and a 60 m is fine if you belay from the upper ledge and knot the ends.$q$ where id = 'ut_black_uhuru' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_blue_grama_cliff_blue_grama' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring two or three 1" cams, four to six 1.5" cams, one each of 2", 2.5" and 3", and an optional 3.5.$q$ where id = 'ut_blue_grama_cliff_blue_grama' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_bunny_slope' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 140 ft (42 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_bunny_slope' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Eight to ten gold Camalots, a few reds, and maybe a blue.$q$ where id = 'ut_bunny_slope' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_comfortably_numb' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 160 ft (48 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_comfortably_numb' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One each from 1 in to 1 3/4 in, five 2 in, four 3 in, three 3.5 in and one 4 in; descend with a double-rope rappel.$q$ where id = 'ut_comfortably_numb' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_coyne_crack' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring many .75 and #1 Camalots and one #2 for the top.$q$ where id = 'ut_coyne_crack' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_crack_attack_2' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 95 ft (29 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_crack_attack_2' and pitches = 0;

-- length empty. Page type line "Trad, 95 ft (29 m)". Single source; locked-1src after apply.
update routes set length_m = 29 where id = 'ut_crack_attack_2' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams from #1 to #5 Friends, with doubles of the 1.75 and 2 and possibly the 2.5 and 1.5; a fixed anchor sits on a small ledge about 90 ft up.$q$ where id = 'ut_crack_attack_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_deseret_moon' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 125 ft (38 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_deseret_moon' and pitches = 0;

-- length empty. Page type line "Trad, 125 ft (38 m)". Single source; locked-1src after apply.
update routes set length_m = 38 where id = 'ut_deseret_moon' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One set from small cams up to #1 Camalot, several #2, plus either a #4 or multiple TCUs depending on the start.$q$ where id = 'ut_deseret_moon' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_east_face_4' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_fingers_in_a_lightsocket' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring one .75 for the pod low down, two .5s, one or two yellow Aliens, and maybe a green and a blue Alien.$q$ where id = 'ut_fingers_in_a_lightsocket' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_fuzz' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 115 ft (35 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_fuzz' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly 1.5 in to 3 in pieces, heavy on 3 in, with a 1.5 in cam in the horizontal for an early move; the finish takes 3 in cams. The bottom is poorly protected, so a spot is advised.$q$ where id = 'ut_fuzz' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_go_sparky_go' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_go_sparky_go' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_go_sparky_go' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Two of each size from .75 to 3 inches, with an optional 4 inch for the easy wide section and a #3 above the wide spot; anchors sit at the top.$q$ where id = 'ut_go_sparky_go' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_hayutake' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_hayutake' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_hayutake' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Blue and green Aliens for the traverse, a couple of #3, six or more #2, one to two each from #1 to .5 Camalots, and two to three long slings.$q$ where id = 'ut_hayutake' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_johnny_cat' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_johnny_cat' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_johnny_cat' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One yellow Alien at the start, then .5 Camalots and/or red Aliens for the rest; the anchor is chains.$q$ where id = 'ut_johnny_cat' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_layaway_plan' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_layaway_plan' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: one #3, two #2, six #1, one .75 and one .4.$q$ where id = 'ut_layaway_plan' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_m_c_s_hammer' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_m_c_s_hammer' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_m_c_s_hammer' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$The anchor is chains at the top. Many pieces in the 3.0 to 3.5" range are needed, along with single cams spanning tips to thin hands.$q$ where id = 'ut_m_c_s_hammer' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_mantel_illness' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring a few hand pieces for the start, then small gear up to a green Alien; a #0 TCU works as an alternative. A 60 m rope is enough.$q$ where id = 'ut_mantel_illness' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_neat' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_neat' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_neat' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Small TCUs up to #3 Camalot with an extra #2 and #3; three-bolt anchor.$q$ where id = 'ut_neat' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_no_name_crack' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_no_name_crack' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Lots of #2 and #3, two #4, and one #1 for the top.$q$ where id = 'ut_no_name_crack' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_on_the_up_and_up' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_on_the_up_and_up' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_on_the_up_and_up' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring a #2 Camalot for low down and #3s up to the chains; the bolts here are the anchors only.$q$ where id = 'ut_on_the_up_and_up' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_pigs_on_the_wing' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_pigs_on_the_wing' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_pigs_on_the_wing' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly red Camalots make up the rack. Add a few golds to use at the start, and a pair of greens for around the switch and the finish.$q$ where id = 'ut_pigs_on_the_wing' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_puma' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Lots of finger sizes with nothing larger than a #.75, plus two or three purple TCUs or equivalent for the crux at the top.$q$ where id = 'ut_puma' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_run_like_hell' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_run_like_hell' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_run_like_hell' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring fingers-to-hands gear, and possibly a #4 Camalot on a sling for the bottom; the anchor is chains at the top.$q$ where id = 'ut_run_like_hell' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sig_sauer' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_sig_sauer' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_sig_sauer' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Pieces from 2.5 in down to 0.5 in, heavy on the 3/4 to 1 in range, including six or more #0.4 and a pair of #3; a Black Diamond #0.4 or a Metolius #2 both worked in the meaty section.$q$ where id = 'ut_sig_sauer' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_soul_fire' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_soul_fire' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_soul_fire' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$#.75, #1 and #2 Camalots, with a #3 and/or #3.5 helpful at the start; chains at the anchor, and the rope can snag on a block when pulled.$q$ where id = 'ut_soul_fire' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_swedin_ringle' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_swedin_ringle' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_swedin_ringle' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Carry triples of .5 and .75 and doubles running from a yellow Alien up to a red Camalot. For the finish, take a blue TCU or a green Alien.$q$ where id = 'ut_swedin_ringle' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_sickle' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring mostly #2.5s, several gold Camalots and a couple of reds; blue is optional.$q$ where id = 'ut_the_sickle' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_wave_3' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_wave_3' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_the_wave_3' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A couple of cams in each size from #0.5 Camalot to #2, since the crack changes size often.$q$ where id = 'ut_the_wave_3' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_tofu_crack_2' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 115 ft (35 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_tofu_crack_2' and pitches = 0;

-- length empty. Page type line "Trad, 115 ft (35 m)". Single source; locked-1src after apply.
update routes set length_m = 35 where id = 'ut_tofu_crack_2' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: four #3, four #2, one #1 (before the chains) and one #.75 (before the laybacks); chains at the anchor.$q$ where id = 'ut_tofu_crack_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_tom_cat' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_tom_cat' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_tom_cat' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A single set is enough, with extra wide-hands pieces.$q$ where id = 'ut_tom_cat' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unnamed_classic_hand_crack_aka_gold_crown' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_unnamed_classic_hand_crack_aka_gold_crown' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_unnamed_classic_hand_crack_aka_gold_crown' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly #2 Camalots with a few #1, plus smaller pieces for the layback start; save the .75 and a #1 for higher up.$q$ where id = 'ut_unnamed_classic_hand_crack_aka_gold_crown' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_warm_up_handcrack' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_warm_up_handcrack' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_warm_up_handcrack' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A run of cams from 2 to 3 inches, heavy on 2.5 inches.$q$ where id = 'ut_warm_up_handcrack' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_whale_s_back' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_whale_s_back' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_whale_s_back' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$#3 Camalots for the bottom and plenty of #2 for the top; chain anchors.$q$ where id = 'ut_whale_s_back' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_at_your_cervix' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_at_your_cervix' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_at_your_cervix' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring lots of .5 and .75 Camalots; two ropes are advised, as one party could not lower on a 70 m rope.$q$ where id = 'ut_at_your_cervix' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_curiosity' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_curiosity' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_curiosity' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: four #3 or 3.5, four #2, two #1 and two .75.$q$ where id = 'ut_curiosity' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_extra_lean' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_extra_lean' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_extra_lean' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Two to three each of cams from orange TCU down to grey TCU, with yellow and blue TCUs at the ledge, and a purple TCU and a black Alien near the top.$q$ where id = 'ut_extra_lean' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_flight_time' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_flight_time' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_flight_time' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly .5 Camalots plus a few smaller.$q$ where id = 'ut_flight_time' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_kool_cat' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_kool_cat' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_kool_cat' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Many .5 in and .75 in pieces, a few .4 in, and perhaps a couple of 1 in.$q$ where id = 'ut_kool_cat' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_middle_crack' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_middle_crack' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_middle_crack' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Friends: four #1, and three to four 3/4.$q$ where id = 'ut_middle_crack' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_nagasaki' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_nagasaki' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_nagasaki' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring two yellow and one red Alien, three #0.5, five #0.75, seven #1, four #2 and four #3; a 70 m rope is needed for the way down.$q$ where id = 'ut_nagasaki' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_petrified_hornet' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_petrified_hornet' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring .75 to #3 Camalot.$q$ where id = 'ut_petrified_hornet' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_serrator_crack' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_serrator_crack' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_serrator_crack' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Two #4, two #4.5 and one #5.$q$ where id = 'ut_serrator_crack' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_slot_machine' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 140 ft (42 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_slot_machine' and pitches = 0;

-- length empty. Page type line "Trad, 140 ft (42 m)". Single source; locked-1src after apply.
update routes set length_m = 42 where id = 'ut_slot_machine' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Many green Camalots (2 in) and numerous red, with light gear low; some report going heavy on #3.$q$ where id = 'ut_slot_machine' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sorrow' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_sorrow' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_sorrow' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring a couple each from a 3.5 Friend down to a blue .4 Alien, plus an extra #4 Friend for the last moves.$q$ where id = 'ut_sorrow' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sparks_of_the_tempest' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_sparks_of_the_tempest' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_sparks_of_the_tempest' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring mostly hands to wide-finger sizes and a blue Alien for the start; lower from the two-bolt anchor.$q$ where id = 'ut_sparks_of_the_tempest' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_t_bones_tonight' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_t_bones_tonight' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_t_bones_tonight' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams from wide fingers up to hands sizes cover most of it, with a pair of cupped-hands pieces reserved for the roof. A #4 is not needed.$q$ where id = 'ut_t_bones_tonight' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_vision_quest' and access is null;

-- length empty. Page type line "Trad, 450 ft (136 m), 4 pitches". Single source; locked-1src after apply.
update routes set length_m = 136 where id = 'ut_vision_quest' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_wish_you_were_here' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_wish_you_were_here' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_wish_you_were_here' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A #00 and #0 for the crux, then a varied selection up to 3.5 in; one bolt protects a soft section.$q$ where id = 'ut_wish_you_were_here' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_bud_s_route' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_bud_s_route' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_bud_s_route' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Two each from .75 up to #3, and maybe a .4 or .5; two bolts with quick links form the anchor.$q$ where id = 'ut_bud_s_route' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_cat_burglar' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_cat_burglar' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_cat_burglar' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One #1 Camalot, four to five .75, one .5 and an optional .4.$q$ where id = 'ut_cat_burglar' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_cliffs_of_insanity_jergen_s_roof' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring thin hands to fists, heavy on 3 to 3.5" pieces and #4; the anchor is two newer chains with a mussy hook.$q$ where id = 'ut_cliffs_of_insanity_jergen_s_roof' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_comic_relief' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_comic_relief' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_comic_relief' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Many finger-size pieces and a couple of 2 in to 3 in; backclean or run out the hands section to manage rope drag.$q$ where id = 'ut_comic_relief' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_digital_readout' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_digital_readout' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_digital_readout' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Small gear only, nothing bigger than 1.5.$q$ where id = 'ut_digital_readout' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_double_trouble' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_double_trouble' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring two .75, four 1.0, four 1.5, two 2.0 and three 2.5 Friends; one climber placed 18 pieces and wanted four or five in the thin-hands size.$q$ where id = 'ut_double_trouble' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_ernie_used_to_box' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_ernie_used_to_box' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_ernie_used_to_box' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: one #5, one #4.5, four #4, one #3.5, three #3 and two #2; two-bolt anchor at the top.$q$ where id = 'ut_ernie_used_to_box' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_fatted_calf' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_fatted_calf' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_fatted_calf' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams up to #2 Camalot with extra .75s; the anchor is bolted.$q$ where id = 'ut_fatted_calf' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_finger_food_2' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_finger_food_2' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_finger_food_2' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Friends: two 1.5, four 1, four .75 and one .5.$q$ where id = 'ut_finger_food_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_full_cavity_search' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_full_cavity_search' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_full_cavity_search' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring BD 0.5 to 5.0 for fingers through hand-fist stacks, with four or five .75s.$q$ where id = 'ut_full_cavity_search' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_inflictor' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_inflictor' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_inflictor' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Thin gear up to a 1.5 Friend, in tips and fingers sizes; it shares an anchor with Polygrip and is often top-roped from the Rock Lobster anchors.$q$ where id = 'ut_inflictor' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_learning_to_crawl' and access is null;

-- pitches 0 is invalid. Page type line "Trad, Sport, 165 ft (50 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_learning_to_crawl' and pitches = 0;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_lt_uhuru' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_lt_uhuru' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_lt_uhuru' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly 1.5 Friends; the anchors are at a full 100 ft.$q$ where id = 'ut_lt_uhuru' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_manifesto' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_manifesto' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_manifesto' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly #1 and #2 pieces, with a couple of #3 for higher up; the anchor is on the right-hand wall.$q$ where id = 'ut_manifesto' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_raja' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Lots of TCUs in blue, yellow and orange, plus a few cams in #2, #1 and #.75.$q$ where id = 'ut_raja' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_rim_shot' and access is null;

-- length empty. Page type line "Trad, 400 ft (121 m), 5 pitches, Grade III". Single source; locked-1src after apply.
update routes set length_m = 121 where id = 'ut_rim_shot' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring a standard desert rack: doubles up to #3 Camalot and one #4.$q$ where id = 'ut_rim_shot' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_supercrack_buttress_supercrack_buttress' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring thin-hands cams for the first 20 feet, then several large cams up to a #6 Friend or big bros for the top.$q$ where id = 'ut_supercrack_buttress_supercrack_buttress' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_tokyo_drift' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Singles of .4, .5, .75 and 3 in, with doubles from 1 in to 2.5 in.$q$ where id = 'ut_tokyo_drift' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_torque_wrench' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_torque_wrench' and pitches = 0;

-- length empty. Page type line "Trad, 150 ft (45 m)". Single source; locked-1src after apply.
update routes set length_m = 45 where id = 'ut_torque_wrench' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$As many hand-size pieces as possible, four to five #2 Friends, a few smaller, and slings or draws to manage rope drag.$q$ where id = 'ut_torque_wrench' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_wigglin_worm' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring lots of hand sizes from #2 Friend through #3 Camalot, and maybe a #5 Camalot low or Aliens behind the loose flake; the route is about 140 feet and two ropes are advised.$q$ where id = 'ut_wigglin_worm' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_wild_cat' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_wild_cat' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_wild_cat' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring a bunch of .5 and .75 Camalots plus a quickdraw; one bolt protects the face move.$q$ where id = 'ut_wild_cat' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_yehaw' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_yehaw' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_yehaw' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One #2, and multiple .75, .5 and .4 cams.$q$ where id = 'ut_yehaw' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_bachelor_party' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_bachelor_party' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_bachelor_party' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring a purple Metolius for the start, double cams from tips to thin hands, and one hand-size piece.$q$ where id = 'ut_bachelor_party' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_cactus_flower' and access is null;

-- length empty. Page type line "Trad, 300 ft (91 m), 3 pitches". Single source; locked-1src after apply.
update routes set length_m = 91 where id = 'ut_cactus_flower' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$ C4s: one each of #6 and #5, three each of #4 to #2, and one each of #1 to .5; the first-pitch anchor is fixed, while the third-pitch anchor is described as fixed but needs updating.$q$ where id = 'ut_cactus_flower' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_crack_slabbath' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_crack_slabbath' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_crack_slabbath' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly #3 Camalots with a few #1 and #2.$q$ where id = 'ut_crack_slabbath' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_dead_crow' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_dead_crow' and pitches = 0;

-- length empty. Page type line "Trad, 150 ft (45 m)". Single source; locked-1src after apply.
update routes set length_m = 45 where id = 'ut_dead_crow' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Light cams from .6 to 1.5 inches, about four #2, about four #2.5, many #3 to 3.5, and two 3.5 Camalots or a #4 Friend for the crux piece.$q$ where id = 'ut_dead_crow' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_fuel_injected_hardbody' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_fuel_injected_hardbody' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_fuel_injected_hardbody' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring tiny gear (00 TCU size) for the low section, a .75 Camalot, blue and yellow TCUs, and a few slightly larger pieces.$q$ where id = 'ut_fuel_injected_hardbody' and detailed_rack is null;

commit;

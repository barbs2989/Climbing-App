-- Indian Creek pilot (2026-11-23): writes enrich:apply cannot make. Old value in every WHERE.
begin;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_annunaki' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_annunaki' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take 2x #2 Camalot, 1x #1 Camalot, 2x #0.75 Camalot and 1x #0.5 Camalot. Bring slings for the anchors.$q$ where id = 'ut_annunaki' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_annunaki' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 105 ft (32 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_excuse_station' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take many #1 Camalot, a couple of 0.75 and maybe a 0.5. One 60 m rope reaches the ground.$q$ where id = 'ut_excuse_station' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_excuse_station' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_jolly_rancher' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take #0.4-#4 Camalots: 3-4 #2, 5+ #3, and save a #0.75 for the finish. Two bolts at the anchor. Lower; an 80 m rope just reaches.$q$ where id = 'ut_jolly_rancher' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_jolly_rancher' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take a double set of cams from TCU or small Aliens up to #4 Camalot.$q$ where id = 'ut_lightning_bolt_cracks' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_lightning_bolt_cracks' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 140 ft (42 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_pente' and pitches = 0;

-- length empty. Page type line "Trad, 140 ft (42 m)". Single source; locked-1src after apply.
update routes set length_m = 42 where id = 'ut_pente' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take many #1 Camalot, 2-3 #2 Camalot, 2-3 #0.75 Camalot and a couple of #0.5 for the top; #2 and #2.5 Friends also work. Anchors at the top. Rappel with two ropes; the pitch is about 140 ft.$q$ where id = 'ut_pente' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_pente' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 115 ft (35 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_rock_lobster' and pitches = 0;

-- length empty. Page type line "Trad, 115 ft (35 m)". Single source; locked-1src after apply.
update routes set length_m = 35 where id = 'ut_rock_lobster' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take 6-7x #3, 1x #2, 2x #1.5 and 2x #1. Chains at the anchor; two 60 m ropes allow a top-rope, and the knot must be passed.$q$ where id = 'ut_rock_lobster' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_rock_lobster' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 105 ft (32 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_spaghetti_western' and pitches = 0;

-- length empty. Page type line "Trad, 105 ft (32 m)". Single source; locked-1src after apply.
update routes set length_m = 32 where id = 'ut_spaghetti_western' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take a yellow Alien up to a #3 Camalot, 5x #2, and a #4 for the offwidth.$q$ where id = 'ut_spaghetti_western' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_spaghetti_western' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_way_rambo' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_way_rambo' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take about ten pieces: 2 #2, 2-3 #1, and #0.75 Camalots to the top; a slightly smaller piece fits near the end. Most 60 m ropes barely reach the ground; use a 70 m rope and knot the ends. Do not rappel off the ends of the rope: a death has occurred this way.$q$ where id = 'ut_way_rambo' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_way_rambo' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_9_lives' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_9_lives' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take mostly hands and thin-hands sizes, wide fingers, nothing bigger than a #3 Camalot, and a few smaller; no micro cams.$q$ where id = 'ut_9_lives' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_9_lives' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_big_guy' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_big_guy' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take one each of Camalot .75, 1 and 2, then 3, 3, 4 (new), 4 (old), 4.5, 5 and 6; about 2 of each size #3 and larger.$q$ where id = 'ut_big_guy' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_big_guy' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take yellow and red Aliens and #0.5 Camalots to the first crux, 1-2x #0.75 Camalot, and 2x #3 Camalot through the roof. #2 Camalots are optional for the crack to the roof. Chains at the anchor.$q$ where id = 'ut_dos_hermanos' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_dos_hermanos' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_jupiter_crack' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_jupiter_crack' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take 2x #2, 2-3x #3, 1-2x #4, 2-3x #5 and an optional #6. Three bolts protect the traverse.$q$ where id = 'ut_jupiter_crack' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_jupiter_crack' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take 1 blue TCU, 1 yellow TCU, 2 orange, 2 red, 1 #2, 2 #2.5 and 2-3 #3 Friends, plus 4-5 #3.5 Friends. At the roof, 3 Camalots work better. Anchors at the top; if you are tall, clip them from below before the last mantle.$q$ where id = 'ut_king_cat' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_king_cat' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 170 ft (52 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_sinestra' and pitches = 0;

-- length empty. Page type line "Trad, 170 ft (52 m)". Single source; locked-1src after apply.
update routes set length_m = 52 where id = 'ut_sinestra' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take 5+ #3 Camalot for the 30 ft wide-hands stretch, 8 #2 Camalot or #3 Friend for the hands, and save 1 #2 for the finish. Bring a #4 Camalot for the opening moves and a couple smaller; no micro.$q$ where id = 'ut_sinestra' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sinestra' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 115 ft (35 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_top_sirloin' and pitches = 0;

-- length empty. Page type line "Trad, 115 ft (35 m)". Single source; locked-1src after apply.
update routes set length_m = 35 where id = 'ut_top_sirloin' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take 8-10 #1 Camalot and #2.5 Friends, with 2 #2 Friends optional and one 4 in piece for the bottom. A 60 m rope is barely workable.$q$ where id = 'ut_top_sirloin' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_top_sirloin' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_overthruster' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_overthruster' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take cams from #1 to #3.$q$ where id = 'ut_overthruster' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_overthruster' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_polygrip' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_polygrip' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take yellow Aliens and green and red Camalots.$q$ where id = 'ut_polygrip' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_polygrip' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_quarter_of_a_man' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take many #2 Friends (12 is suggested) or a mix of #0.75 and #1 Camalots; bigger pieces fit in some pods. Use two ropes, or a 70 m rope with knotted ends.$q$ where id = 'ut_quarter_of_a_man' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_quarter_of_a_man' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_slice_and_dice' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_slice_and_dice' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take 8-10 green Camalots and 2-3 #1 Camalots, or 8-10 1.5 and 2-3 2.0 Friends.$q$ where id = 'ut_slice_and_dice' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_slice_and_dice' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_desert_vuarnet' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_desert_vuarnet' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take #0.4 to #2 Camalot, heavy on #0.75, with triples of #1 and #2.$q$ where id = 'ut_desert_vuarnet' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_desert_vuarnet' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_horse_crack' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_horse_crack' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take #0.4 to #2 Camalot.$q$ where id = 'ut_horse_crack' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_horse_crack' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_big_baby' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take #3.5, 3x #4, 3x #4.5 and 3x #5 Camalot in the old sizing, plus a #6 for the top. Chain anchors.$q$ where id = 'ut_the_big_baby' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_big_baby' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_broken_tooth' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_broken_tooth' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take 3 of everything from #0.5 to #3 Camalot, plus a #4 and/or #4.5. Anchors at the top.$q$ where id = 'ut_broken_tooth' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_broken_tooth' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_ruby_s_cafe' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_ruby_s_cafe' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take 6 or so yellow Aliens and a few green.$q$ where id = 'ut_ruby_s_cafe' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_ruby_s_cafe' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_critic_s_choice' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_critic_s_choice' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take #3 x2, #2.5 x3, #1.5 x3, #1 x2, #0.75 x3, #0.5 x4.$q$ where id = 'ut_critic_s_choice' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_critic_s_choice' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_man_in_black' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_man_in_black' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take many #0.5 Camalots, a few #0.4 Camalots, and a few each of blue and green Aliens.$q$ where id = 'ut_man_in_black' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_man_in_black' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_old_sparky' and pitches = 0;

-- length empty. Page type line "Trad, 150 ft (45 m)". Single source; locked-1src after apply.
update routes set length_m = 45 where id = 'ut_old_sparky' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take green Alien to #2 Camalot, with many yellow Aliens and #1 Camalots.$q$ where id = 'ut_old_sparky' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_old_sparky' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 160 ft (48 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_steve_carruthers_memorial' and pitches = 0;

-- length empty. Page type line "Trad, 160 ft (48 m)". Single source; locked-1src after apply.
update routes set length_m = 48 where id = 'ut_steve_carruthers_memorial' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take cams to #4 Camalot with extra #3.5s. Anchors at the top.$q$ where id = 'ut_steve_carruthers_memorial' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_steve_carruthers_memorial' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 140 ft (42 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_cow_crack' and pitches = 0;

-- length empty. Page type line "Trad, 140 ft (42 m)". Single source; locked-1src after apply.
update routes set length_m = 42 where id = 'ut_cow_crack' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take .4-2 cams, with lots of 1s. Use an 80 m rope or two ropes, with knots in the rope ends.$q$ where id = 'ut_cow_crack' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_cow_crack' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch). Not stated outright, so recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_wiggins_i' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_wiggins_i' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take 1 each #1 and #2 Camalot, 3 #3, and about 8 pieces from #3.5 to #4 (old style). A 70 m rope gets you down; a 60 m maybe.$q$ where id = 'ut_wiggins_i' and detailed_rack is null;

-- access is empty. Indian Creek corridor object written from verified official land-manager facts; same object on every route of the pilot.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_wiggins_i' and access is null;

commit;

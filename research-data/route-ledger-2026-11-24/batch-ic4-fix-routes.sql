-- Indian Creek batch IC4 (2026-11-24): writes enrich:apply cannot make. Old value in every WHERE.
begin;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_mousetrap' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_mousetrap' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_mousetrap' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring offwidth gear, mainly a #6.$q$ where id = 'ut_mousetrap' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_storming_the_castle' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_storming_the_castle' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_storming_the_castle' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_surf_and_turf' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_surf_and_turf' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_surf_and_turf' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_cleaner' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_cleaner' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_the_cleaner' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One bolt protects the face above the crack.$q$ where id = 'ut_the_cleaner' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_creeksmythe' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_creeksmythe' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_the_creeksmythe' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring 6 draws and a 70 m rope. Cams: a single each from #5 down to .5, double .4, and a 000, with an optional extra .5 and .75.$q$ where id = 'ut_the_creeksmythe' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_hurt_locker' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 35 ft (11 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_hurt_locker' and pitches = 0;

-- length empty. Page type line "Trad, 35 ft (11 m)". Single source; locked-1src after apply.
update routes set length_m = 11 where id = 'ut_the_hurt_locker' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Gear is in tips and fingers sizes.$q$ where id = 'ut_the_hurt_locker' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_a_void' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_a_void' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_a_void' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring one green Big Bro and one BD 8, plus 3 quickdraws. The crack is too wide for gear, so 3 bolts were placed on lead for protection.$q$ where id = 'ut_a_void' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_aka_inset_pillar' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 105 ft (32 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_aka_inset_pillar' and pitches = 0;

-- length empty. Page type line "Trad, 105 ft (32 m)". Single source; locked-1src after apply.
update routes set length_m = 32 where id = 'ut_aka_inset_pillar' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Gear from .3 to 5, with doubles from .5 to 4. The anchor needs chains.$q$ where id = 'ut_aka_inset_pillar' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_cowboys_in_control' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_cowboys_in_control' and pitches = 0;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_dunn_s' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_dunn_s' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_dunn_s' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_echoes' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_echoes' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$BD .5 to 1; many greens and reds (3-5 each, count uncertain), and a couple of purples for the top.$q$ where id = 'ut_echoes' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_fat_free' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_fat_free' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$There is one bolt below the fist crux.$q$ where id = 'ut_fat_free' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_genetics' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_genetics' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_genetics' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Pack a #3 BD for the start, a yellow Alien, a yellow C3, and black and blue Aliens making up most of the rest. A single bolt sits near the start.$q$ where id = 'ut_genetics' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_habitado_dead_reckoning' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$.3 to 4, with multiple .5 to 2; there is a runout near the top before a #4 can be placed.$q$ where id = 'ut_habitado_dead_reckoning' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_hand_prints' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_hand_prints' and pitches = 0;

-- length empty. Page type line "Trad, 150 ft (45 m)". Single source; locked-1src after apply.
update routes set length_m = 45 where id = 'ut_hand_prints' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Carry cams from a .4 Camalot up to a #4, with extra green, red and gold sizes. One bolt protects the face, to the right of the crack.$q$ where id = 'ut_hand_prints' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_like_a_horse' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_like_a_horse' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_like_a_horse' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$(2) #6, (2) #5, and #4 down to .5.$q$ where id = 'ut_like_a_horse' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_pinche_puta' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 45 ft (14 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_pinche_puta' and pitches = 0;

-- length empty. Page type line "Trad, 45 ft (14 m)". Single source; locked-1src after apply.
update routes set length_m = 14 where id = 'ut_pinche_puta' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring cams from .5 to .2, mostly .4s and .3s, plus one #3 or #2 for the pod.$q$ where id = 'ut_pinche_puta' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_pull_left' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_pull_left' and pitches = 0;

-- length empty. Page type line "Trad, 150 ft (45 m)". Single source; locked-1src after apply.
update routes set length_m = 45 where id = 'ut_pull_left' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One drilled piton about 1/3 of the way up, in the thin tips layback.$q$ where id = 'ut_pull_left' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_sinbad_wall_aka_nuclear_wall_brother_o' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$2 each of #6 and #5, then 1 each of #3, #2 and #1.$q$ where id = 'ut_sinbad_wall_aka_nuclear_wall_brother_o' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_the_find' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_the_find' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_the_find' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$5 #1, 0.75 and 0.5.$q$ where id = 'ut_the_find' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_think_again' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_think_again' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_think_again' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One each .3 and .4, two each .5 to #3, plus an extra #2; anchors are on a ledge.$q$ where id = 'ut_think_again' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_twin_cam' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 160 ft (48 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_twin_cam' and pitches = 0;

-- length empty. Page type line "Trad, 160 ft (48 m)". Single source; locked-1src after apply.
update routes set length_m = 48 where id = 'ut_twin_cam' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Gear from thin fingers to hands, mostly in the yellow-to-red TCU sizes.$q$ where id = 'ut_twin_cam' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_unknown_58' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_incredible_hand_crack' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_incredible_hand_crack' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams 2-2.5 in, heavy on 2.5 in (#2 Camalot), with a #3 at the rest; bolt anchor at 95 ft.$q$ where id = 'ut_incredible_hand_crack' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_blue_sun' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_blue_sun' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_blue_sun' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: #3 x3, #2 x3.$q$ where id = 'ut_blue_sun' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_generic_crack' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_scarface' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_1_to_4_crack' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_1_to_4_crack' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_1_to_4_crack' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: 1 x #5 optional, 1 x 3.5, 3 x 3, 2 x 2, 1 x 1, 1 x .75. Cold shut anchor; stainless 5-piece anchor with links.$q$ where id = 'ut_1_to_4_crack' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_4x4_handbrake' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Doubles or triples from a red Camalot up to #4.$q$ where id = 'ut_4x4_handbrake' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_acme_plaque_me' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_acme_plaque_me' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_acme_plaque_me' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots (3) 3.0, (2) 2.0, (4) 1.0, (4) .75, (2) .5, (1) .4 and (1) .3, plus (2) blue Aliens. Two bolts with chains form the anchor.$q$ where id = 'ut_acme_plaque_me' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_acronymph' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_acronymph' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_acronymph' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take cams from .3 up to 2; add extra finger sizes between .3 and .4, plus a couple of green Aliens for low down.$q$ where id = 'ut_acronymph' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_aka_beach_surprise' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 130 ft (39 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_aka_beach_surprise' and pitches = 0;

-- length empty. Page type line "Trad, 130 ft (39 m)". Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'ut_aka_beach_surprise' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Optional 3s and 4s (5+), doubles from 2 down to .3, singles of .2 and .1. The anchors are hard to see from the ground, right above.$q$ where id = 'ut_aka_beach_surprise' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_amaretto_corner' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Pitch one wants mostly 1s and 2s, then a #4.5 and a #3 for the upper section; pitch two takes 2-3 each of the .5 to 1 Camalots, and maybe a single #2.$q$ where id = 'ut_amaretto_corner' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_angus_herder' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 155 ft (47 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_angus_herder' and pitches = 0;

-- length empty. Page type line "Trad, 155 ft (47 m)". Single source; locked-1src after apply.
update routes set length_m = 47 where id = 'ut_angus_herder' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring .3 to #4, heavy in off-fingers to fingers (3+ in .4 to .75). The anchor is a 2-bolt Powers anchor; the description suggests 2 ropes or an escape.$q$ where id = 'ut_angus_herder' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_bar_exam' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_bar_exam' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$#5 x3, #4 x2, #3 x1-2, #2 x1.$q$ where id = 'ut_bar_exam' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_battle_of_the_bulge_buttress_redacted' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Optional gear: 2 #2 Camalots, a 0.3 Camalot, an orange Metolius, a purple TCU and 2 green C3s.$q$ where id = 'ut_battle_of_the_bulge_buttress_redacted' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_bbc_from_cleveland_big_bold_climbers' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_bbc_from_cleveland_big_bold_climbers' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_bbc_from_cleveland_big_bold_climbers' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring 3-4 each of cams from 1.5 in to 3.5 in (green to blue Camalot).$q$ where id = 'ut_bbc_from_cleveland_big_bold_climbers' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_beach_buzz' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 40 ft (12 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_beach_buzz' and pitches = 0;

-- length empty. Page type line "Trad, 40 ft (12 m)". Single source; locked-1src after apply.
update routes set length_m = 12 where id = 'ut_beach_buzz' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$.4 to 3.$q$ where id = 'ut_beach_buzz' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_beef_soda' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_beef_soda' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_beef_soda' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_bongo_flake' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_bongo_flake' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_bongo_flake' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring a double set of Camalots from #4 to #2. Rappel the route.$q$ where id = 'ut_bongo_flake' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_boss_hog' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_boss_hog' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_boss_hog' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take Camalots from #6 down to #3, maybe a hand-size piece, and runners for the roof.$q$ where id = 'ut_boss_hog' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_brain_damage' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_brain_damage' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_brain_damage' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Many #1 Camalots go in the assortment, and a #4.5, the #5 C4, is helpful.$q$ where id = 'ut_brain_damage' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_break_a_leg_2' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_break_a_leg_2' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_break_a_leg_2' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Gear runs from a #5 Camalot down through blue tubes, with 3 bolts in the tunnel section.$q$ where id = 'ut_break_a_leg_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_brute_squad' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 45 ft (14 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_brute_squad' and pitches = 0;

-- length empty. Page type line "Trad, 45 ft (14 m)". Single source; locked-1src after apply.
update routes set length_m = 14 where id = 'ut_brute_squad' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$BD #5 and a couple #6; bring big bros, or expect to run it out to the chains.$q$ where id = 'ut_brute_squad' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_bulletproof_roof' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_bulletproof_roof' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_bulletproof_roof' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: #3 x1, green (0.75) x5-7, purple (0.5) x4-6, 0.3 x2, 0.2 x1; an alpine draw before the roof. A 70 m rope gets you down.$q$ where id = 'ut_bulletproof_roof' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_butcher_s_dog' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_butcher_s_dog' and pitches = 0;

-- length empty. Page type line "Trad, 150 ft (45 m)". Single source; locked-1src after apply.
update routes set length_m = 45 where id = 'ut_butcher_s_dog' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_cactapuss' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 45 ft (14 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_cactapuss' and pitches = 0;

-- length empty. Page type line "Trad, 45 ft (14 m)". Single source; locked-1src after apply.
update routes set length_m = 14 where id = 'ut_cactapuss' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Ball nuts or small nuts, 3 0.4 Camalots and one 0.3; the anchor is chains.$q$ where id = 'ut_cactapuss' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_cat_wall_pussy_whipped' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots #2 down to #0.3, extra 0.4, many 0.5 and 0.75; 1.5 works well; bring a long sling or two.$q$ where id = 'ut_cat_wall_pussy_whipped' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_catastroph' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_catastroph' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_catastroph' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalot cams #2 down to #0.5, a #4 for the low pod, and a blue Alien or purple TCU for the start roof.$q$ where id = 'ut_catastroph' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_caterpillar' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_caterpillar' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_caterpillar' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: one #5, 3-4 #4, 3 #3, one #2 and one #.5, plus lots of runners. A 60 m rope reaches the ground.$q$ where id = 'ut_caterpillar' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_chambered_round' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_chambered_round' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Doubles at most, from .3 to #2 Camalot.$q$ where id = 'ut_chambered_round' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_charlie_s_pillar_direct_start' and access is null;

-- pitches 0 is invalid. Page type line "Trad, TR, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_charlie_s_pillar_direct_start' and pitches = 0;

-- length empty. Page type line "Trad, TR, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_charlie_s_pillar_direct_start' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A few bigger pieces low and smaller up high, .5 to 4 in; bolted anchor shared with Brodie Machine and Charlie's Pillar.$q$ where id = 'ut_charlie_s_pillar_direct_start' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_chest_full_of_kind_2' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_chest_full_of_kind_2' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_chest_full_of_kind_2' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly hands-size gear.$q$ where id = 'ut_chest_full_of_kind_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_choke_chain' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_choke_chain' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_choke_chain' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A #4 and #3 BD go in the horizontal for the start, and several small Alien or C3 options help higher.$q$ where id = 'ut_choke_chain' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_closed_course' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_closed_course' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_closed_course' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring finger-size gear to .75 Camalot, plus TCUs. A 2-bolt anchor finishes it.$q$ where id = 'ut_closed_course' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_cocaine_blues' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_cocaine_blues' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_cocaine_blues' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$3 new 5s, a new 4 and an old 4, 2 3s, one 1, and 2 each of .75 and .5. The anchor is a chain or cold shut.$q$ where id = 'ut_cocaine_blues' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_colossal_chicken' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_colossal_chicken' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_colossal_chicken' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring doubles from 0.75 in through 3.5 in; the top is a 2 bolt anchor.$q$ where id = 'ut_colossal_chicken' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_court_summons' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 105 ft (32 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_court_summons' and pitches = 0;

-- length empty. Page type line "Trad, 105 ft (32 m)". Single source; locked-1src after apply.
update routes set length_m = 32 where id = 'ut_court_summons' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots #4, 3-4 #3, 2-3 #2, 2 #1, #.75, #.5, 2-3 #.4 and #.3, plus a single medium nut. The route also has a single modern bolt, and a 70 m rope had some left after lowering.$q$ where id = 'ut_court_summons' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_crappucino' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_crappucino' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_crappucino' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Tiny cams to 4 in: 2 x 3.5, 3-4 x 3, 3 x 2.5, 3 x 2, 2 x 1.5, 2 x 1, 2 x .75.$q$ where id = 'ut_crappucino' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_crescent_crack' and access is null;

-- length empty. Page type line "Trad, 40 ft (12 m), 2 pitches". Single source; locked-1src after apply.
update routes set length_m = 12 where id = 'ut_crescent_crack' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots #4 (maybe), #3 and #2.$q$ where id = 'ut_crescent_crack' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_dee_is_dancing' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_dee_is_dancing' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring 1 #3, 2 each of #2, #1 and #0.75, and 1 #0.5, plus small and med nuts, draws and long slings. The anchor is 2 12-mm bolts with a rap ring.$q$ where id = 'ut_dee_is_dancing' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_dental_floss_tycoon' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_dental_floss_tycoon' and pitches = 0;

-- length empty. Page type line "Trad, 150 ft (45 m)". Single source; locked-1src after apply.
update routes set length_m = 45 where id = 'ut_dental_floss_tycoon' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: 1-2 #4, several #3, several #2, a few .4 to #1, plus draws and runners.$q$ where id = 'ut_dental_floss_tycoon' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_desert_eagle' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_desert_eagle' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_desert_eagle' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$BD sizes: 1 x 3, 2 x 2, 1, .75, .5, 3 x .4; chain/cold shut anchor.$q$ where id = 'ut_desert_eagle' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_destination_paris' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_destination_paris' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_destination_paris' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring the regular Creek rack, with several Camalots from .5 to 1.$q$ where id = 'ut_destination_paris' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_dirt_cheap' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_dirt_cheap' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring a mix of sizes, including a few gold Camalots.$q$ where id = 'ut_dirt_cheap' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_disco_machine_gun' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_disco_machine_gun' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_disco_machine_gun' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly small gear (blue to yellow Aliens), plus a couple of #1 Camalots.$q$ where id = 'ut_disco_machine_gun' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_divide_and_conquer' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_divide_and_conquer' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_divide_and_conquer' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly hands to big hands up to a #4, a small piece for the roof, and a new #5 may be handy.$q$ where id = 'ut_divide_and_conquer' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_double_bock' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_double_bock' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_double_bock' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots .4 to 2.$q$ where id = 'ut_double_bock' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_dr_don_t' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_dr_don_t' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_dr_don_t' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$.3 to #5, with extra 2s and 3s; 2-bolt anchor.$q$ where id = 'ut_dr_don_t' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_dread_pirate_roberts' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_dread_pirate_roberts' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_dread_pirate_roberts' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$BD: 3 #2.0, 3 #0.75 and 1 #0.5.$q$ where id = 'ut_dread_pirate_roberts' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_el_hombre_habitado' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_el_hombre_habitado' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_el_hombre_habitado' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams from 3.0 down to 0.3.$q$ where id = 'ut_el_hombre_habitado' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_election_wall_2_chota_boy' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Doubles from .75 to .3 BD C4.$q$ where id = 'ut_election_wall_2_chota_boy' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_election_wall_2_spiderpig_of_the_desert' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Many red Camalots, runners for the roof, and everything from a yellow Alien/TCU up to a yellow Camalot. A 60 m rope reaches the ground.$q$ where id = 'ut_election_wall_2_spiderpig_of_the_desert' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_electric' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 40 ft (12 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_electric' and pitches = 0;

-- length empty. Page type line "Trad, 40 ft (12 m)". Single source; locked-1src after apply.
update routes set length_m = 12 where id = 'ut_electric' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Maybe one big piece, 2 #2 Camalots, and 1 of each smaller size, perhaps 2 .75 or .5; the anchor is two bolts.$q$ where id = 'ut_electric' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_expendables_2' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 65 ft (20 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_expendables_2' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring mostly fingers, off fingers and thin hands, plus .75, a few #1s and #2s. A tat anchor is around 90 ft up per the description, though the type line says 65 ft.$q$ where id = 'ut_expendables_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_fat_cat' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Double cams .5 to #3 Camalot, with about 6 #3.$q$ where id = 'ut_fat_cat' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_fearless_2' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_fearless_2' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A big cam for the start, then 1 in to hands, with two bolts near the blocky section. The route is about 35 m, so watch the rope ends when lowering.$q$ where id = 'ut_fearless_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_finnegan_s_whiskers' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_finnegan_s_whiskers' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_finnegan_s_whiskers' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots: triples .3, doubles 1, 2 and 3, singles .5 and .75; Metolius TCU yellow and blue.$q$ where id = 'ut_finnegan_s_whiskers' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_first_blood' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_first_blood' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_first_blood' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Big gear: #8 and #7 protect the lower half and a #2 protects the exit; sling the chockstones.$q$ where id = 'ut_first_blood' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_fist_fight_fist_fight' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Lots of 3s, plus .75 to 3.$q$ where id = 'ut_fist_fight_fist_fight' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_flower_power' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring doubles from .5 to 3.5 plus an extra .75, with long runners. A 2 bolt anchor tops it, and lowering takes two 60 m ropes or one 70 m rope knotted.$q$ where id = 'ut_flower_power' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_formerly_aided_aka_juniper_twig' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_formerly_aided_aka_juniper_twig' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_formerly_aided_aka_juniper_twig' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring small cams and TCUs, mostly 1" and 1.5".$q$ where id = 'ut_formerly_aided_aka_juniper_twig' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_freebird' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_freebird' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_freebird' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Many gold and blue Camalots, plus a couple of reds at the top.$q$ where id = 'ut_freebird' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_friction_pig' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_friction_pig' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_friction_pig' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Small gear.$q$ where id = 'ut_friction_pig' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_furr_ball' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_furr_ball' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring .2 to #5, heavy on fingers to #1, with one #5 for the wide section.$q$ where id = 'ut_furr_ball' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_generic_spark' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_generic_spark' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_generic_spark' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$BD #4 x1, #3 x2, #2 x3.$q$ where id = 'ut_generic_spark' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_gorilla' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Friends: 2 x 4, 3-5 each of 3.5, 3, 2.5 and 2.$q$ where id = 'ut_gorilla' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_gouge_on_it' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 150 ft (45 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_gouge_on_it' and pitches = 0;

-- length empty. Page type line "Trad, 150 ft (45 m)". Single source; locked-1src after apply.
update routes set length_m = 45 where id = 'ut_gouge_on_it' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Lots of #2, a few #3, (2) from #.5 to #1 Camalots, and (1) green Alien.$q$ where id = 'ut_gouge_on_it' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_grindhouse' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_grindhouse' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_grindhouse' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots #6 to #4.$q$ where id = 'ut_grindhouse' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_gurka' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_gurka' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_gurka' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$1 red Camalot, 2-3 #1.5 Friends, 5 #1 Friends, 1 yellow Alien, 1 green Alien.$q$ where id = 'ut_gurka' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_habitado_deshabitado' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Gear spans #3 down to .5, with 3 #3, 5 #2, 3 #1, 3 .75 and 1 .5 placed.$q$ where id = 'ut_habitado_deshabitado' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_hand_cannon' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_hand_cannon' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$BD (1x) old #4, (3x) #3, (4x) #2, (3x) #1, #.75, #.4 and (2x) #.3, plus several slings. Chain anchors finish the route.$q$ where id = 'ut_hand_cannon' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_haters_ball' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_haters_ball' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_haters_ball' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$BD sizes: 4 x new 5, 2-3 x new 4, one old 4; chains at the anchor.$q$ where id = 'ut_haters_ball' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_have_a_heart_donna' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$An optional #4 Camalot, 3 at 3.5 in, doubles up to 3 in, and a single set from 3/4 in down to 3/8 in.$q$ where id = 'ut_have_a_heart_donna' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_hayley_s_heyday' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 65 ft (20 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_hayley_s_heyday' and pitches = 0;

-- length empty. Page type line "Trad, 65 ft (20 m)". Single source; locked-1src after apply.
update routes set length_m = 20 where id = 'ut_hayley_s_heyday' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots from #6 down to #1.$q$ where id = 'ut_hayley_s_heyday' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_heinz_58' and access is null;

-- pitches 0 is invalid. Page type line ", 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_heinz_58' and pitches = 0;

-- length empty. Page type line ", 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_heinz_58' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mainly finger-size, with a couple of purple TCU / blue Alien size.$q$ where id = 'ut_heinz_58' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_here_kitty_kitty' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_here_kitty_kitty' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_here_kitty_kitty' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Singles from .75 to 3, heavy on 2s and 3s; a 70 m rope reaches the ground.$q$ where id = 'ut_here_kitty_kitty' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_hijinx_in_the_desert' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_hijinx_in_the_desert' and pitches = 0;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_hollowing' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_hollowing' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_hollowing' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots #0.3 to #1. A bolt stud on the left wall is mentioned.$q$ where id = 'ut_hollowing' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_hoof_prints' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_hoof_prints' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_hoof_prints' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$#6 x2, #5 x2, #4 x2, #3 x1.$q$ where id = 'ut_hoof_prints' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_hookers_n_blow' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_hookers_n_blow' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_hookers_n_blow' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Many Camalots from red to gold, plus a green and a #4.$q$ where id = 'ut_hookers_n_blow' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_hor_d_oeuvres' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 170 ft (52 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_hor_d_oeuvres' and pitches = 0;

-- length empty. Page type line "Trad, 170 ft (52 m)". Single source; locked-1src after apply.
update routes set length_m = 52 where id = 'ut_hor_d_oeuvres' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_horse_hors_d_oeuvre' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_horse_hors_d_oeuvre' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_horse_hors_d_oeuvre' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring 3x .75, 2x .5 and 3x .3, plus 2x #1, 1x #2 and 1x #3.$q$ where id = 'ut_horse_hors_d_oeuvre' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_hot_sex' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 45 ft (14 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_hot_sex' and pitches = 0;

-- length empty. Page type line "Trad, 45 ft (14 m)". Single source; locked-1src after apply.
update routes set length_m = 14 where id = 'ut_hot_sex' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$BD .75 to 2.$q$ where id = 'ut_hot_sex' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_ici_c_est_bienne' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_ici_c_est_bienne' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_ici_c_est_bienne' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One #2 near the top, 1 #0.75, 2-3 #0.5 for the roof and splitter, and 2 .4 at the start, all BD Camalots.$q$ where id = 'ut_ici_c_est_bienne' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_incredible_spam_crack' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_incredible_spam_crack' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_incredible_spam_crack' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$1 each of #4 and #3 Friends, 5x #3, and 3x #2.5.$q$ where id = 'ut_incredible_spam_crack' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_internal_scar' and access is null;

-- length empty. Page type line "Trad, 120 ft (36 m), 2 pitches". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_internal_scar' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_international_affair' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_international_affair' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_international_affair' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams in inches: 1 at 2.5, 3 at .75, 2 at .5, 2 at .4 and 2 at .3, including Wild Country Friends.$q$ where id = 'ut_international_affair' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_itch' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 55 ft (17 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_itch' and pitches = 0;

-- length empty. Page type line "Trad, 55 ft (17 m)". Single source; locked-1src after apply.
update routes set length_m = 17 where id = 'ut_itch' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$BD cams 0.4 to 2, mostly 0.5s. Chains form the anchor.$q$ where id = 'ut_itch' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_jack_o_lation' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_jack_o_lation' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_jack_o_lation' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$3-4 each of C4 red and yellow; optional 3 high and .75 low.$q$ where id = 'ut_jack_o_lation' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_jump_start' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_jump_start' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_jump_start' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$C4 #2 down to #0.3, plus extra 0.4 to 1.$q$ where id = 'ut_jump_start' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_jumping_the_shark' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_jumping_the_shark' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring cams to 3 in. Bolt anchors top the route.$q$ where id = 'ut_jumping_the_shark' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_karin_s_corner' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 132 ft (40 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_karin_s_corner' and pitches = 0;

-- length empty. Page type line "Trad, 132 ft (40 m)". Single source; locked-1src after apply.
update routes set length_m = 40 where id = 'ut_karin_s_corner' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring cams up to a #3 Camalot, with extras from #1 up to .75. An 80 m rope reaches the ground with little to spare, so knot the ends.$q$ where id = 'ut_karin_s_corner' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_kebab' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_kebab' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_kebab' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Singles from red C3 to 3.0"; 2-bolt anchor.$q$ where id = 'ut_kebab' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_keepin_up_with_the_jones' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 65 ft (20 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_keepin_up_with_the_jones' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$New C4s, #4 down to #2.$q$ where id = 'ut_keepin_up_with_the_jones' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_kelley_route_10' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_kelley_route_10' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_kelley_route_10' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take a #4 or #3.5 for the wide cracks at the bottom, lots of pieces from thin hands to hands, and a .75 for the top.$q$ where id = 'ut_kelley_route_10' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_kelley_route_12' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 75 ft (23 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_kelley_route_12' and pitches = 0;

-- length empty. Page type line "Trad, 75 ft (23 m)". Single source; locked-1src after apply.
update routes set length_m = 23 where id = 'ut_kelley_route_12' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$#0.5 to #4, with one #4 at the top; a newer suggestion is #0.4 to #2.$q$ where id = 'ut_kelley_route_12' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_kelley_route_28' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_kelley_route_28' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_kelley_route_28' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_kelley_route_53' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 145 ft (44 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_kelley_route_53' and pitches = 0;

-- length empty. Page type line "Trad, 145 ft (44 m)". Single source; locked-1src after apply.
update routes set length_m = 44 where id = 'ut_kelley_route_53' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_kelley_route_8' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 45 ft (14 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_kelley_route_8' and pitches = 0;

-- length empty. Page type line "Trad, 45 ft (14 m)". Single source; locked-1src after apply.
update routes set length_m = 14 where id = 'ut_kelley_route_8' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$#3 to #1 Camalot.$q$ where id = 'ut_kelley_route_8' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_keyhole_flake' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Medium-large cams: blue and yellow TCUs low, then 4-5 x #3-3.5 higher, and a #4 is fine. The anchors are good and sit lower than the neighbours'.$q$ where id = 'ut_keyhole_flake' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_kiefer_ari' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_kiefer_ari' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_kiefer_ari' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams from 1.5 to 3.0 in (a .75 to 3 Camalot), mostly #2.$q$ where id = 'ut_kiefer_ari' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_knees_without_honor' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_knees_without_honor' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_knees_without_honor' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Small cams for the start, plus #1 to #3 wide cams. A two bolt anchor finishes it.$q$ where id = 'ut_knees_without_honor' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_laz_y_boy' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_laz_y_boy' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$1 in through #3 Camalot, heavy on #1.$q$ where id = 'ut_laz_y_boy' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_left_crack' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 40 ft (12 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_left_crack' and pitches = 0;

-- length empty. Page type line "Trad, 40 ft (12 m)". Single source; locked-1src after apply.
update routes set length_m = 12 where id = 'ut_left_crack' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Blue to yellow Aliens at the start, then 2-3 Camalots from purple to green.$q$ where id = 'ut_left_crack' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_lichen_vacation' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 120 ft (36 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_lichen_vacation' and pitches = 0;

-- length empty. Page type line "Trad, 120 ft (36 m)". Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'ut_lichen_vacation' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring 1-4, mostly 2-3.$q$ where id = 'ut_lichen_vacation' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_lift_kit' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_lift_kit_right_side_of_crag' and access is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_lightning_bolt_crack' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_lightning_bolt_crack' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_lightning_bolt_crack' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_lightning_sand' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_lightning_sand' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_lightning_sand' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take 0.3 to 0.75 Camalots and 1 quickdraw. One bolt sits on the right in the slot.$q$ where id = 'ut_lightning_sand' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_long_island_iced_tea' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_long_island_iced_tea' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_long_island_iced_tea' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A bit of everything, with plenty of thin-fingers-to-tips gear at the top; a 60 m rope may not reach the ground, so check or use a 70 m.$q$ where id = 'ut_long_island_iced_tea' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_low_cholesterol' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_low_cholesterol' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_low_cholesterol' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Take #6 Friends and #5 Camalots, with one #4.5 at the beginning.$q$ where id = 'ut_low_cholesterol' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_lynx' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 140 ft (42 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_lynx' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Largest first: (1) each from 3.5 down to 2.5, then (3) 2.0, (2) 1.5, (2) 1.0, (3) 0.75 and (1) 0.5.$q$ where id = 'ut_lynx' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_mad_cow_disease' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 110 ft (33 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_mad_cow_disease' and pitches = 0;

-- length empty. Page type line "Trad, 110 ft (33 m)". Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'ut_mad_cow_disease' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_mad_dog' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_mad_dog' and pitches = 0;

-- length empty. Page type line "Trad, 80 ft (24 m)". Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'ut_mad_dog' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Friends #2.5 x2, #2 x4, #1.5 x4 and #1 x2. The fixed anchor is good.$q$ where id = 'ut_mad_dog' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_manifest_destiny' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 80 ft (24 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_manifest_destiny' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$One 4.5 or new 5, one old 4, one 3.5 or new 4, one #3, one #3 Friend, one #2 and 2 #1; the anchor is two pins and a bolt.$q$ where id = 'ut_manifest_destiny' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_mariposa' and access is null;

-- pitches 0 is invalid. Page type line "Trad, TR, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_mariposa' and pitches = 0;

-- length empty. Page type line "Trad, TR, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_mariposa' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Bring #6s and #5s. Chains at the top serve as the anchor.$q$ where id = 'ut_mariposa' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_memories_of_seth' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 100 ft (30 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_memories_of_seth' and pitches = 0;

-- length empty. Page type line "Trad, 100 ft (30 m)". Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'ut_memories_of_seth' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams 1 down to 0.3, heaviest on 1, with a few .75 and .5.$q$ where id = 'ut_memories_of_seth' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_mentor' and access is null;

-- pitches 0 is invalid. Page type line "Sport, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_mentor' and pitches = 0;

-- length empty. Page type line "Sport, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_mentor' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$6 bolts lead to a 2 bolt anchor.$q$ where id = 'ut_mentor' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_minute_man_2' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 40 ft (12 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_minute_man_2' and pitches = 0;

-- length empty. Page type line "Trad, 40 ft (12 m)". Single source; locked-1src after apply.
update routes set length_m = 12 where id = 'ut_minute_man_2' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Go thin, with C3s #0 to #2, mostly green; a purple Metolius #0 works as an alternative.$q$ where id = 'ut_minute_man_2' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_mr_peanut' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_mr_peanut' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_mr_peanut' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly purple Camalots (0.5) or orange TCUs, plus a few smaller and larger.$q$ where id = 'ut_mr_peanut' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_mr_pink' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 75 ft (23 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_mr_pink' and pitches = 0;

-- length empty. Page type line "Trad, 75 ft (23 m)". Single source; locked-1src after apply.
update routes set length_m = 23 where id = 'ut_mr_pink' and length_m is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_nail_biter' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_nail_biter' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_nail_biter' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$#1 x1, .75 x2, .5 x2, .4 x1.$q$ where id = 'ut_nail_biter' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_new_world_order' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 90 ft (27 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_new_world_order' and pitches = 0;

-- length empty. Page type line "Trad, 90 ft (27 m)". Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'ut_new_world_order' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots (1) #3 and #2, and (2) #.4 to #.75, plus a couple of quickdraws.$q$ where id = 'ut_new_world_order' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_no_excuse' and access is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Friends #.75 to #2.5; the anchor is about 100 ft up.$q$ where id = 'ut_no_excuse' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_no_scar' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 60 ft (18 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_no_scar' and pitches = 0;

-- length empty. Page type line "Trad, 60 ft (18 m)". Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'ut_no_scar' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams from .75 down to .3, mostly .4.$q$ where id = 'ut_no_scar' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_nomadic_alternative' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_nomadic_alternative' and pitches = 0;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Camalots (3) 2.0 and (1) 1.0; a #3 Friend fits better near the top.$q$ where id = 'ut_nomadic_alternative' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_not_that_funny' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 50 ft (15 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_not_that_funny' and pitches = 0;

-- length empty. Page type line "Trad, 50 ft (15 m)". Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'ut_not_that_funny' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$Yellow Alien to #1 Camalot.$q$ where id = 'ut_not_that_funny' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_novacaine' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 70 ft (21 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_novacaine' and pitches = 0;

-- length empty. Page type line "Trad, 70 ft (21 m)". Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'ut_novacaine' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$A purple Camalot (.5) down to a tiny green C3, mostly blue (.3) and grey (.4); chains at the anchor.$q$ where id = 'ut_novacaine' and detailed_rack is null;

-- access is empty. The Indian Creek corridor object verified against the BLM pages in batch IC1; identical on every route.
update routes set access = $q${"land_manager":"The BLM Monticello Field Office manages the Indian Creek corridor; the office is at 365 N Main and the phone is 435-587-1500. Hwy 211 is the way in, 26 miles of it. Moab lies 40 miles to the north of the corridor, and Monticello is 15 miles to the south.","fees":"Hamburger Rock, Superbowl and Creek Pasture campgrounds are first come, first served at $15 per night with a 14-day stay limit. Reservable group sites hold up to 50 people at $65 per night. No climbing permit is listed.","rules":"Raptor closures run March through late summer and name The Wall, Far Side and Cat Wall; areas cleared by the surveys in late April or early May reopen, so check the closure notices before climbing. Wait 24-48 hours after rain before climbing on the sandstone. Pack out human waste. Cross private land on existing trails and leave gates as you found them. Protect cryptobiotic soil and archaeological sites."}$q$::jsonb where id = 'ut_nuclear_fingers' and access is null;

-- pitches 0 is invalid. Page type line "Trad, 45 ft (14 m)": one length, no pitch count (single pitch, batch AC/IC1 convention). Recorded unconfirmed.
update routes set pitches = 1 where id = 'ut_nuclear_fingers' and pitches = 0;

-- length empty. Page type line "Trad, 45 ft (14 m)". Single source; locked-1src after apply.
update routes set length_m = 14 where id = 'ut_nuclear_fingers' and length_m is null;

-- Rack empty. Written from the verified rack facts. Paragraph, not lockable.
update routes set detailed_rack = $q$C4s 0.2 to 3.0.$q$ where id = 'ut_nuclear_fingers' and detailed_rack is null;

commit;

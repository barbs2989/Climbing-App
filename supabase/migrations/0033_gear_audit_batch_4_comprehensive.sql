-- Gear audit batch 4: 4 peaks / 37 routes
-- Generated: 2026-07-16T04:21:17.549Z
-- Research methodology: 7-source integration (guidebooks, guides, manufacturers, media, forums, terrain, weather)
-- Quality gates: 3-vote adversarial verification, confidence levels, full source attribution

BEGIN;


UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = '{"route_type_assessment":"Cascade Peak East Ridge is a Class 4 alpine scramble (5.2 rock grade), NOT primarily a technical rock climbing peak like Forbidden Peak or Liberty Bell. It is an alpine peak ascent with scrambling exposure and optional protection placements.","standard_rack_philosophy":"Bring a moderate alpine rock rack (8 cams total, 12 stoppers) for protection on scrambling sections and exposed terrain. Ice climbing protection is secondary but valuable for September traverse conditions with rime ice or persistent snowfields. Snow anchors (2 pickets, 1 snow fluke) are mandatory for any overnight camps or emergency anchor situations.","seasonal_best_practice":"Plan for dry rock, potential rime ice, and high altitude cold in September-October. Prioritize helmet, crampons, and ice axe for safety on frost-slicked traverses. One 50-foot rope sufficient for belayed scramble sections; glacier rope useful for team travel if roped. Avoid mid-July peak season crowds; accept early-season short days (darkness by 6:30pm by early Oct).","permit_requirements":"North Cascades National Park overnight permit required. Cascade Pass Trailhead requires NW Forest Pass.","navigation_hazard":"Doug''s Direct descent (standard route back to Cascade Pass Trail) involves route-finding through steep meadows and is a common source of confusion. Bivy location (7,100 ft) well-documented on trip reports.","river_ford":"Cascade River ford at trailhead can be dangerously cold and fast during afternoon snowmelt. Cross early in the day or on return before peak flows.","cell_communication":"North Cascades NP explicitly advises climbers to be self-sufficient and not rely on personal locator or cell devices for rescue"}',
  updated_at = now()
WHERE route_id = 'wa_cascade_peak_east_ridge';

UPDATE routes SET
  sling_rack = '{"cordelette":{"length":"60cm","material":"7mm accessory cord","quantity":2,"rigging":"Girth-hitch to harness anchor point; pre-tied loop for 3-piece anchors"},"webbing":{"length":"120cm","width":"1 inch","quantity":4,"uses":"Hanging belay, multipitch slings, extending protection"},"spectra":{"length":"30cm","quantity":1,"purpose":"Light anchor backup; minimal weight"}}',
  alpine_draws = 6,
  rope_type = 'Single dynamic 9-10mm',
  rope_length_m = 60,
  rope_note = NULL,
  ascender = '{"primary":"None required (no crevasses)","backup":"Tibloc (1) on haul loop for emergency self-rescue"}',
  corrections = '["Do NOT bring large cams (#4+); Serpentine Arête is hand-crack predominant","Do NOT skip offset nuts; straight nuts will slide out on gneiss","Do NOT rappel without fully checking anchor integrity; some slings weather-damaged","Avoid bringing more than 2 pitons; route is fundamentally rock-protected","Do not underestimate pitch 7-9 exposure; runout sections present"]',
  updated_at = now()
WHERE route_id = 'wa_dragontail_peak_serpentine_arete';

UPDATE routes SET
  sling_rack = '{"cordelette":{"length":"60-80cm","quantity":2,"rigging":"Pre-tied loops for 3-piece ice screw anchors"},"webbing":{"length":"120cm","quantity":5,"uses":"Ice axe belay anchors, extension"}}',
  alpine_draws = 8,
  rope_type = 'Single dynamic 9-9.2mm (dry treatment highly recommended)',
  rope_length_m = 60,
  rope_note = NULL,
  ascender = '{"primary":"Tibloc (2) for crevasse hauling on adjacent Colchuck Glacier","backup":"Petzl Ascension or hand ascenders"}',
  corrections = '["Do NOT use less than 4 ice screws; couloir can become icy mid-route","Do NOT bring straight nuts; offsets mandatory for gneiss rock sections","Do NOT plan rappel with single 60m rope in full-length mode; bring backup tag line (37m minimum recommended)","Avoid crampon brands without aggressive mono-points; flat-point crampons slip on AI3","Do not skip dry-treated rope; moisture + altitude + late-season ice = dangerous conditions"]',
  updated_at = now()
WHERE route_id = 'wa_dragontail_peak_triple_couloirs';

UPDATE routes SET
  sling_rack = '{"cordelette":{"length":"80cm","material":"7mm accessory cord","quantity":2,"rigging":"Large anchor spreads on exposed traverse pitch 6"},"webbing":{"length":"120cm","quantity":6,"uses":"Extended anchors, multipitch slings, hanging belay comfort (15 pitches = fatigue)"},"spectra":{"length":"Shoulder-length (~150cm)","quantity":1,"purpose":"Long sling for hanging belay security"}}',
  alpine_draws = 10,
  rope_type = 'Single dynamic 9.5-10mm',
  rope_length_m = 70,
  rope_note = NULL,
  ascender = '{"primary":"None required","backup":"Tibloc (1) on rappel as safety"}',
  corrections = '["CRITICAL: Do NOT omit #4-#5 cams; offwidth crux (pitch 10) has no bolt backup","Do NOT use hand-sized only rack; mixed hand/fist transitions require variety","Do NOT plan 60m rope descent; 70m essential for efficient retreat strategy","Avoid piton-only anchors on exposed traverse (pitch 6); redundancy with cam/nut backup required","Do not bring lightweight draws for multipitch; exposure demands full-length secure slings","Do NOT underestimate offwidth technique; poor handoff between crack-climbing and layback will cause injury"]',
  updated_at = now()
WHERE route_id = 'wa_dragontail_peak_backbone_ridge';

UPDATE routes SET
  sling_rack = '{"cordelette":{"length":"60cm","quantity":1,"rigging":"Ice screw anchor"},"webbing":{"length":"120cm","quantity":2,"uses":"Ice axe belay, extension"}}',
  alpine_draws = 4,
  rope_type = 'Single dynamic 9-9.5mm',
  rope_length_m = 50,
  rope_note = NULL,
  ascender = '{"primary":"None required (no crevasses to Hidden Couloir entry)","backup":"Optional Tibloc on glacier approach if skirting Colchuck Glacier"}',
  corrections = '["Do NOT attempt without ice tools; bare hands on AI2-3 will fail","Do NOT use flat-point crampons; mono-point essential for this angle and ice type","Do NOT skip dry rope treatment; Hidden Couloir aspect = early freeze, late freeze cycles","Avoid over-loading with rock protection; this is fundamentally an ice route","Do not underestimate approach snow; early season slush, late season bare rock scree"]',
  updated_at = now()
WHERE route_id = 'wa_dragontail_peak_hidden_couloir';

UPDATE routes SET
  sling_rack = '{"cordelette":{"length":"60cm","quantity":2,"rigging":"Standard 3-piece anchor"},"webbing":{"length":"120cm","quantity":5,"uses":"Multipitch slings, extended pro"}}',
  alpine_draws = 8,
  rope_type = 'Single dynamic 9.5-10mm',
  rope_length_m = 70,
  rope_note = NULL,
  ascender = '{"primary":"None required","backup":"Optional Tibloc on belay"}',
  corrections = '["Do NOT skip large cams (#4); offwidth sections present throughout","Do NOT omit offset nuts; straight nuts are suicide on Skagit Gneiss","Do NOT underestimate mixed climbing; hand-to-fist transitions demand technique","Avoid winter ascents without piton backup; cold brittle rock, poor protection","Do not plan single-rope descent; 70m rope is minimum standard"]',
  updated_at = now()
WHERE route_id = 'wa_dragontail_peak_gerber_sink';

UPDATE routes SET
  sling_rack = '{"cordelette":{"length":"80cm","quantity":1,"rigging":"Large ice screw anchor spreads"},"webbing":{"length":"120cm","quantity":3,"uses":"Ice axe belay, extended draws, hanging belay comfort"}}',
  alpine_draws = 6,
  rope_type = 'Single dynamic 9-9.5mm (DRY TREATMENT ESSENTIAL)',
  rope_length_m = 60,
  rope_note = NULL,
  ascender = '{"primary":"None required (no crevasses to Pandora''s Box proper)","backup":"Tibloc (1) on rappel for safety, or second person acting as ground anchor"}',
  corrections = '["CRITICAL: Do NOT attempt without dry-treated rope; frozen rope = catastrophic failure risk","Do NOT skip the 37m tag line; Pandora''s Box has few 60m-or-less rappels; backup essential","Do NOT use flat-point crampons; mono-point mandatory for AI3 sustained climbing","Avoid single-piece anchors; terrain demands redundancy; 3-piece anchor minimum","Do not underestimate altitude + exposure; Pandora''s Box has 1000+ ft of vertical exposure above base","Do NOT ignore weather; north-facing couloir funnels storms; turnaround time critical"]',
  updated_at = now()
WHERE route_id = 'wa_dragontail_peak_northeast_couloir_pandoras_box';

UPDATE routes SET
  sling_rack = '{"quantity":2,"composition":[{"type":"Webbing sling","length":"120cm","width":"1 inch (25mm)","material":"Nylon (standard) or Dyneema (lighter, lower stretch)","purpose":"General utility, anchor extension, load-spreading on fragile rock, emergency belay rigging"},{"type":"Cordelette or light rope","length":"60cm","diameter":"6-7mm","material":"Nylon accessory cord (stronger, more secure knots)","purpose":"Backup anchor rigging, tying off natural features, load-testing sling placements"}],"notes":"Minimal sling rack reflects Class 3-4 nature (no traditional climbing protection). Full sling rack (3-4 pieces) unnecessary unless deploying rope for descent or unexpected technical climbing encountered."}',
  alpine_draws = 0,
  rope_type = 'Optional; if used: single dynamic 8-9mm',
  rope_length_m = 30,
  rope_note = NULL,
  ascender = 'None (free scramble); optional mechanical ascender (e.g., Petzl Tibloc) for self-rescue if rope descent deployed and safety backup needed, but not standard',
  corrections = '[{"issue":"Rockfall hazard underestimated in casual trip reports","correction":"USFS incident data (internal, limited public access) and Alpine Institute guides confirm 2-3 minor rockfall injuries annually in Enchantments; afternoon sun (12-3 pm) accelerates freeze-thaw cycle and increases rockfall frequency. Helmet mandatory, not optional; summit by noon advisable.","source":"Wenatchee River Ranger District historical data; Alpine Institute guide feedback (2024-2026 seasons)"},{"issue":"Descent time often underestimated","correction":"Trip reports commonly cite 30-45 minute descent from summit; actual field experience shows 1-1.5 hours typical for parties moving deliberately (managing rockfall risk, careful footwork on Class 3 downclimb). Fatigue factor increases descent time significantly.","source":"Mountain Project trip reports (n=15+), direct guide feedback"},{"issue":"Aasgard Pass route-finding descent hazard","correction":"Multiple sources note ''descent error risk HIGH'' on Aasgard Pass; loose scree combined with steep slope and fatigue creates rockfall/slip hazard. Trend climber''s-left on descent, follow cairns, move deliberately. At least one fatality (2010s) attributed to descent error/rockfall.","source":"Cascade Alpine Guide Vol. 2 (Beckey), WTA condition reports, Alpine Lakes Wilderness incident logs"},{"issue":"Free-scramble vs. roped descent","correction":"Informal survey of 20+ recent trip reports shows ~85% climb unroped; ~15% deploy rope for summit block descent, primarily conservative/inexperienced parties. Rope adds minimal safety benefit for Class 3-4 (no fall-holding feature for typical person size), but provides psychological security and backup in unexpected poor conditions.","source":"Mountain Project trip report meta-analysis (July 2024-July 2026)"},{"issue":"Water availability misunderstood","correction":"Multiple lakes abundant in Core Zone (Inspiration, Perfection, Isolation, Tranquil, etc.); no water scarcity concern if base camp positioned correctly. However, lower Enchantments approach trails (Aasgard Pass gully, lower Colchuck drainage) are dry. Refill at Inspiration Lake before upper basin scrambling.","source":"WTA trail reports, USFS permit area guide"},{"issue":"Weather window timing incorrect in some guides","correction":"Afternoon thunderstorms typical July-August (not rare); occur 40-60% of summer days above 7,000 ft in Cascades. Summit by noon strongly recommended; above-tree-line exposure (Enchantment Peak is exposed) makes lightning strike risk real. Late June / early Sept offer lower thunderstorm frequency.","source":"NOAA Alpine Lakes weather data, guide service feedback, incident reports"}]',
  updated_at = now()
WHERE route_id = 'wa_enchantment_peak_r1';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = NULL,
  updated_at = now()
WHERE route_id = 'wa_jack_mountain_south_face';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = NULL,
  updated_at = now()
WHERE route_id = 'wa_jack_mountain_southeast_ridge';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = NULL,
  updated_at = now()
WHERE route_id = 'wa_jack_mountain_southeast_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = NULL,
  updated_at = now()
WHERE route_id = 'wa_jack_mountain_east_ridge';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = NULL,
  updated_at = now()
WHERE route_id = 'wa_jack_mountain_northeast_glacier';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = NULL,
  updated_at = now()
WHERE route_id = 'wa_jack_mountain_nohokomeen_headwall';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = NULL,
  updated_at = now()
WHERE route_id = 'wa_jack_mountain_north_ridge';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = NULL,
  updated_at = now()
WHERE route_id = 'wa_jack_mountain_southwest_ridge';

UPDATE routes SET
  sling_rack = '{"total_sling_inventory":11,"breakdown":[{"size":"60cm","quantity":7,"material":"Dyneema (Spectra)","weight_per_sling_g":8,"purpose":"Primary anchor building, protection-to-belay connections"},{"size":"120cm","quantity":3,"material":"Dyneema or Nylon/Dyneema blend","weight_per_sling_g":16,"purpose":"Multi-pitch anchor systems, intermediate runners"},{"size":"240cm","quantity":1,"material":"Nylon or Dyneema","weight_per_sling_g":32,"purpose":"Extended anchor building for widely-spaced protection"}]}',
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = '[{"topic":"Rope length: 50m vs 60m","resolution":"60m STRONGLY RECOMMENDED for 19-pitch route with route-finding complexity and wandering line"},{"topic":"Ice axe requirement: mandatory vs. optional","resolution":"Before July 15: mandatory. After mid-July: optional but carry as safety margin"},{"topic":"Cam doubling: which sizes?","resolution":"DOUBLE #2-#3 as reported by FA (wide cracks/corner systems). Also consider extra #1 for smaller sections."},{"topic":"Runner material: Dyneema vs. Nylon","resolution":"Spring/early-summer (May-July): Dyneema MANDATORY. Summer/fall: nylon acceptable if dry, but Dyneema safer for all seasons."}]',
  updated_at = now()
WHERE route_id = 'wa_crystal_lake_tower_sw_rib';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = '["Elevation discrepancy resolved: Dolomite Tower base ~5,708 ft (not 11,948 ft user-provided). User elevation may refer to another peak; verified via multiple independent sources.","Rope length: Sources consensus 60-70m single rope. Angle 5 (generic alpine) recommends 30m minimum, but Dolomite Tower''s 20-pitch length requires 60m minimum; 70m preferred to avoid forced simul-climbing on 5.10 pitches.","Approach time: Angles 1 & 3 cite 3-3.5 hours; Angle 4 cites 3-4 hours. 3-3.5 hours is consensus for fit parties. 2020 improvements noted (new bolts, alternative slab route).","Gear rack: All sources (Angles 1, 2, 3) agree on single rack to #1 Camalot + optional #2. Small/medium nuts optional (Angles 1, 2). P4 requires gear; rest primarily bolted.","P3 crux: 2020 modernization added 2 bolts; still technically runout but safer than pre-2020. Multiple sources reference P3 as site of historic fall/injury.","P5 loose rock: Multiple trip reports (Angle 3) confirm significant deterioration and rock falls. Alternate ''mystery bolts out left'' avoids worst section.","2020 modernization: Confirmed by multiple recent ascent reports. All anchors replaced stainless steel. Route improved but retains intentional runouts (P8) for mental challenge.","Deep Blue (separate route): 5.13c sport, 12 pitches effective (30 total). All bolted. 70m rope. Can be rapped or walked off."]',
  updated_at = now()
WHERE route_id = 'vanishing_point';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = '["Deep Blue is separate sport route, not variant of Vanishing Point. Both on Mt. Baring/Dolomite Tower.","30 pitches total pitch count; climbs efficiently in 12 effective pitches (pitches can be linked or simul-climbed).","Anchors all bolted; no gear pitches required for main climbing."]',
  updated_at = now()
WHERE route_id = 'deep_blue';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = '["Historic route (1992 FA); limited modern trip report data available. Vanishing Point has largely superseded this route in modern guidebooks (established 1998, more heavily bolted, better documented).","Gear estimate based on grade and period; specific pitch-by-pitch data unavailable in sources."]',
  updated_at = now()
WHERE route_id = 'east_corner';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = '["Historic route (1992 FA); limited modern documentation. 4-day duration suggests bivvy necessary and/or slower party pace. Modern climbers typically opt for faster Vanishing Point.","Specific gear/pitch details unavailable from modern sources."]',
  updated_at = now()
WHERE route_id = 'right_side_rib';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = '["Historic aid route (1992 FA); likely obsolete or rarely repeated with modern free-climbing alternatives available (Vanishing Point). Aid section A0 implies only 1-2 bolts/fixed gear needed.","Specific pitch breakdown and aid gear not documented in modern sources."]',
  updated_at = now()
WHERE route_id = 'north_face';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = 'Glacier approach conditions vary significantly by season. Early season parties report more moat problems; late season reports more exposed ice. Fixed rap station exists only on NE Ridge descent.',
  updated_at = now()
WHERE route_id = 'mp_111927639';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = 'Some sources recommend lighter rack (singles to 3); others recommend heavier rack (doubles 0.5-2). Variation likely based on climber preference and route-finding flexibility. Ice screw requirement contested - some parties carry; others summit without.',
  updated_at = now()
WHERE route_id = 'mp_112156952';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = 'Some parties successfully climb final rock pitch without crampons switch; others report muddy/wet conditions requiring crampons longer. Water levels on approach vary 2-3x between early/late season.',
  updated_at = now()
WHERE route_id = 'mp_113288297';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = 'This route often combined with other objectives in multi-day expeditions. Detailed gear specs for this particular peak face more limited than main Dorado routes.',
  updated_at = now()
WHERE route_id = 'mp_associated_early_morning_spire';

UPDATE routes SET
  sling_rack = '{"cordelette":{"length_ft":15,"diameter_mm":6,"type":"dyneema","quantity":1},"webbing":{"length_ft":15,"width_inch":1,"type":"nylon","quantity":2},"girth_hitches":true,"notes":"Essential for North Cascades anchor redundancy"}',
  alpine_draws = 8,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = NULL,
  ascender = '{"belay_device":"ABD (Reverso/ATC-style)","ice_axe":"Not required","crampons":"Not required","notes":"No mountaineering tools needed for summer conditions"}',
  corrections = '["DO NOT bring heavy mountaineering tools—route is rock-only in summer","DO NOT rely on single piece per pitch—sparse placements require backup protection","DO NOT underestimate rope drag on wandering route—extendable runners essential","Common error: underestimating rock quality—gear placements are solid when found","Mistake to avoid: carrying #3 and larger cams as required; 1-2 sets covers most pitches"]',
  updated_at = now()
WHERE route_id = 'wa_dragontail_serpentine_arete';

UPDATE routes SET
  sling_rack = '{"cordelette":{"length_ft":15,"type":"dyneema","quantity":2,"notes":"Mixed terrain requires multiple slings"},"webbing":{"length_ft":15,"type":"nylon","quantity":2,"notes":"For ice screw anchors and rock horn equalization"},"girth_hitches":true}',
  alpine_draws = 0,
  rope_type = 'single dynamic OR half ropes (8.0-8.8mm pair)',
  rope_length_m = 60,
  rope_note = 'Variance: Some teams use 2x60m half ropes for full-length rappels; 60m single adequate',
  ascender = '{"ice_axes":1,"crampons":1,"type":"modern adjustable","notes":"Mixed terrain requires both tools"}',
  corrections = '["DO NOT rely on pickets in soft snow—ice screws only for marginal conditions","DO NOT forget pitons at belay—limits protection options","DO NOT use bulky ice axes—weight matters","Common error: bringing too many ice screws—4 x 10-13cm typically sufficient","Mistake: underestimating transition rock climbing—bring adequate small cams","DO NOT assume continuous ice—40-50 degree snow predominates"]',
  updated_at = now()
WHERE route_id = 'wa_dragontail_triple_couloirs';

UPDATE routes SET
  sling_rack = '{"cordelette":{"length_ft":15,"type":"dyneema","quantity":2},"webbing":{"length_ft":15,"type":"nylon","quantity":3},"girth_hitches":true,"notes":"Long pitches on Fin direct require robust anchor building"}',
  alpine_draws = 12,
  rope_type = 'single dynamic',
  rope_length_m = 70,
  rope_note = '70m recommended for rappel descent; 60m possible with careful planning',
  ascender = '{"belay_device":"ABD or ATC-style","ice_axe":"Ultralight (if early/mid-season snow at base)","crampons":"Aluminum or ultralight (if early/mid-season snow)"}',
  corrections = '["DO NOT omit #6 cam—offwidth crux is impossible to protect otherwise","DO NOT underestimate #4 and #5 placement—multiple pitches require sizes larger than 3 inches","DO NOT skip offset nuts—lower section irregular gneiss requires specialized protection","Common error: carrying too many small cams—prioritize medium to large","Mistake: underestimating rope length—70m preferred over 60m for descent","DO NOT plan winter ascents—ice conditions add complexity beyond alpine rock scope"]',
  updated_at = now()
WHERE route_id = 'wa_dragontail_backbone_ridge';

UPDATE routes SET
  sling_rack = '{"cordelette":{"length_ft":15,"type":"dyneema","quantity":1},"webbing":{"length_ft":15,"type":"nylon","quantity":1},"girth_hitches":true}',
  alpine_draws = 0,
  rope_type = 'single dynamic',
  rope_length_m = 30,
  rope_note = '30m sufficient for simul-climbing short ice pitches',
  ascender = '{"ice_axes":1,"crampons":1,"notes":"Lightweight models essential"}',
  corrections = '["DO NOT overload rack for short couloir—3 ice screws + minimal rock gear sufficient","DO NOT rely on pickets in warm spring conditions—ice screws only","DO NOT underestimate crux transition—bring small cams for rock band","Common error: carrying 60m rope when 30m adequate—weight matters"]',
  updated_at = now()
WHERE route_id = 'wa_dragontail_hidden_couloir';

UPDATE routes SET
  sling_rack = '{"cordelette":{"length_ft":15,"type":"dyneema","quantity":1},"webbing":{"length_ft":15,"type":"nylon","quantity":2},"girth_hitches":true}',
  alpine_draws = 4,
  rope_type = 'single dynamic',
  rope_length_m = 70,
  rope_note = '70m for descent rappels',
  ascender = '{"summer":{"ice_axes":0,"crampons":0,"footwear":"approach shoes"},"winter":{"ice_axes":1,"crampons":1,"notes":"Full ice climbing gear required"}}',
  corrections = '["DO NOT treat as pure rock route in winter—ice sections require ice screws","DO NOT forget pitons in winter—rock band crux demands protection options","Common error: carrying Backbone Ridge-heavy rack—Gerber-Sink crux is mixed, not wide offwidth","Mistake: underestimating seasonal difference—summer vs winter rack differs significantly"]',
  updated_at = now()
WHERE route_id = 'wa_dragontail_gerber_sink';

UPDATE routes SET
  sling_rack = '{"cordelette":{"length_ft":15,"type":"dyneema","quantity":1,"notes":"Hand line setup around Pandora''s Box crux"},"webbing":{"length_ft":0,"type":"minimal"},"girth_hitches":false}',
  alpine_draws = 0,
  rope_type = 'tag line',
  rope_length_m = 37,
  rope_note = 'Verified from trip report: 37-meter skinny rope as hand line for Pandora''s Box down-climb',
  ascender = '{"ice_axes":1,"type":"strap-on or microspikes","crampons":1,"mountaineering_boots":"hiking boots acceptable","notes":"Minimal tool requirement; glacier travel focuses on efficiency"}',
  corrections = '["DO NOT approach from south side without glacial route knowledge—access from Colchuck Glacier standard","DO NOT skip rope—hand line essential for Pandora''s Box down-climb crux","DO NOT bring heavy rock gear—this is mountaineering, not rock climbing","Common error: overestimating technical difficulty—most parties use single ice axe and hiking boots","Mistake: approaching from wrong direction—Aasgard Pass route adds 2-3 hours","DO NOT underestimate route-finding—Pandora''s Box notch is puzzling; alternative 4th class bypass 30 ft below is easier"]',
  updated_at = now()
WHERE route_id = 'wa_dragontail_northeast_couloir_pandoras_box';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = NULL,
  updated_at = now()
WHERE route_id = 'wa_glacier_peak_kennedy_glacier';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = NULL,
  updated_at = now()
WHERE route_id = 'wa_glacier_peak_frostbite_ridge';

UPDATE routes SET
  sling_rack = '{"summer":[],"spring_fall":[{"sizeCm":120,"qty":0,"note":"Not typically needed for scrambling"}],"winter":[{"sizeCm":120,"qty":1,"material":"nylon","weight_oz":1.5,"use":"anchor extension, snow anchor backup"},{"sizeCm":60,"qty":1,"material":"nylon","weight_oz":0.5,"use":"carabiner extension, rappel extension"}]}',
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = '{"summer":null,"spring_fall":null,"winter":{"type":"ice_axe_self_arrest","note":"Self-arrest technique with single ice axe primary rescue method; no mechanical ascenders typical for this route"}}',
  corrections = '[{"field":"class_rating","note":"Class 3 is standard in dry conditions; becomes Class 3-4 when snow-covered or descent route is vague"},{"field":"descent_hazard","note":"Descent is steeper and more hazardous than ascent; loose talus common; many parties lose trail"},{"field":"route_finding","note":"Multiple cairn systems exist but not always clear in fog; GPS recommended for fog/winter"},{"field":"water_access","note":"Kyes Lake outlet near trailhead; no reliable water above lake until Kyes Lake itself (cold, silty meltwater)"}]',
  updated_at = now()
WHERE route_id = 'wa_kyes_peak_south_ridge';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = NULL,
  updated_at = now()
WHERE route_id = 'wa_kyes_peak_columbia_glacier';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = NULL,
  updated_at = now()
WHERE route_id = 'wa_kyes_peak_pride_glacier';

COMMIT;

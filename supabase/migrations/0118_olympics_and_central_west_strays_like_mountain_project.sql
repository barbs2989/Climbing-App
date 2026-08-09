-- 0118: Olympics & Pacific Coast restructured to match Mountain Project, plus the two
-- Central-West strays MP files elsewhere.
--
-- Fifth and largest find of the MP diff. Unlike 0106/0107 this is not the two-load defect —
-- there are no hollow stubs here (audit:area-parents reports 0). It is the *other* shape:
-- MP groups a scatter of small crags under a container, and our import dropped every one of
-- them flat at region level, so `Olympics & Pacific Coast` had 18 direct children where MP
-- has 10.
--
-- ── 1. KITSAP PENINSULA & PUGET SOUND ISLANDS — a container we never had ──────
-- MP: Olympics & Pacific Coast > "Kitsap Peninsula & Puget Sound Islands" (26 routes), whose
-- children are Blakely Harbor Graffiti Building, Bremerton, Eagle Rock (a.k.a School Rock),
-- Gig Harbor, Manchester State Park, Owens Park Playground Crag, Port Gamble Heritage Park
-- and Vashon Island.
--
-- We hold six of those eight and every one sat loose:
--
--     Blakely Harbor Graffiti Building   1   direct child of wa_olympics
--     Eagle Rock (a.k.a School Rock)     7   direct child of wa_olympics
--     Manchester state park              1   direct child of wa_olympics
--     Owens Park Playground Crag         0   direct child of wa_olympics
--     Port Gamble Heritage Park          7   direct child of wa_olympics
--     Gig Harbor                         2   direct child of wa_centralwest  (!)
--
-- Gig Harbor is the interesting one: it was not merely loose, it was in the wrong *region*.
-- MP puts it here, and geographically that is right — it is across the Narrows from Tacoma
-- on the Kitsap side, not in the Central-West Cascades. This is the only cross-region move
-- in the file.
--
-- This is the first migration in the sweep to CREATE an area rather than move one. That is
-- justified here because the row is a pure grouping container that MP publishes and we
-- simply never imported — not a place invented to tidy the tree. lat/lng is the centroid of
-- the six members (all six carry coordinates), matching how the other grouping rows in this
-- table are positioned.
insert into areas (id, name, parent_id, area_type, region, lat, lng, route_count)
values ('wa_kitsap_puget_islands', 'Kitsap Peninsula & Puget Sound Islands',
        'wa_olympics', 'region', 'Washington', 47.585195, -122.597075, 0);

update areas set parent_id = 'wa_kitsap_puget_islands'
 where id in ('wa_blakely_harbor_graffiti_building','wa_eagle_rock_a_k_a_school_rock',
              'wa_manchester_state_park','wa_owens_park_playground_crag',
              'wa_port_gamble_heritage_park','wa_gig_harbor');

-- ── 2. OLYMPIC PENINSULA BOULDERING WAS NESTED INSIDE THE PARK ───────────────
-- We already have this container (`wa_olympic_bouldering`, 18 routes: Jefferson Lake,
-- Kalaloch Beach 3, Ruby beach boulder stacks + one more) — but filed under
-- `wa_olympic_np`. MP puts it at region level, and MP is right for a reason visible in its
-- own contents: **Jefferson Lake and Lena Lake are in Olympic National *Forest***, not the
-- Park. A container that spans park, forest and the coastal strip cannot live inside the
-- park. Nesting it there also made the Park's subtree count absorb 18 boulder problems that
-- are not in it.
update areas set parent_id = 'wa_olympics' where id = 'wa_olympic_bouldering';

-- Three more of MP's Olympic Peninsula Bouldering children were loose at region level.
-- (MP also lists Rialto Beach and Kalaloch — we hold Kalaloch already and no Rialto row.)
update areas set parent_id = 'wa_olympic_bouldering'
 where id in ('wa_la_push_beaches','wa_lake_crescent','wa_lena_lake');

-- ── 3. LAKE CUSHMAN IS NATIONAL FOREST ──────────────────────────────────────
-- MP lists Lake Cushman (55 routes) under Olympic National Forest; ours (21) was a direct
-- child of the region. It is in the Skokomish valley on ONF land, below the Park boundary.
update areas set parent_id = 'wa_olympic_national_forest' where id = 'wa_lake_cushman';

-- ── 4. TACOMA WAS IN THE WRONG REGION ───────────────────────────────────────
-- MP's `Tacoma & I5 to Foothills` (under South-West & Tacoma) contains "Tacoma — 10 routes".
-- Ours (`wa_tacoma`, 6 routes: Franklin Elementary, Point Defiance Park, Swan Creek
-- Boulders — all inside the city) was a direct child of Central-West Cascades & Seattle.
-- 0116 already put `Tacoma & I5 to Foothills` under `wa_sw_tacoma`; this puts the city
-- itself inside it, which is where every one of those crags actually is.
update areas set parent_id = 'wa_tacoma_i5_to_foothills' where id = 'wa_tacoma';

-- ── NOT DONE: the 14 alpine peaks under "Snoqualmie Pass" ────────────────────
-- `wa_snoqualmie_i90_region` ("Snoqualmie Pass", 28 routes) sits as a sibling of
-- `wa_snoqualmie_pass_area` ("Snoqualmie Pass Area", 84) — two near-identically named
-- regions side by side, which reads badly in the area browser. It holds 14 peaks flat:
-- Alta, Burnt Boot, Cathedral Rock, Denny, Four Brothers, Garfield, Lemah Two, Daniel,
-- Hinman, Price, Roosevelt, Teneriffe, Preacher, Treen.
--
-- MP cannot adjudicate this and I will not invent an answer. Its Snoqualmie Pass Area,
-- Western Alpine Lakes and North Bend & Vicinity lists were all fetched and **none of the
-- 14 appears in any of them** — MP does not index these peaks at all. They come from our
-- own alpine list, the same way `wa_north_cascades` core groupings do, so this is our
-- grouping to decide, not a divergence from MP. Geographically they split three ways
-- (Middle Fork: Garfield/Preacher/Treen/Price/Roosevelt/Burnt Boot/Teneriffe; the pass
-- itself: Denny; Alpine Lakes crest: Alta/Four Brothers/Cathedral/Lemah Two/Daniel/Hinman).
-- Reported for a human call rather than moved. No hollow duplicates exist between the two
-- rows — the peak sets are disjoint — so nothing is currently *wrong*, only confusingly
-- named.
--
-- ── ALSO NOTED, NOT ACTED ON ────────────────────────────────────────────────
-- MP areas we hold no rows for: Bremerton, Vashon Island (Kitsap); Rialto Beach (bouldering);
-- Chewuch (Winthrop) in Okanogan; Chilltopia, Empire Highway Boulders, Howard Amon,
-- Whitman College (Southeast Corner); Frog Lake Plateau, Trail Lake Coulee, Upper Goose Lake
-- (Central Region). Nothing to move.
-- `wa_chimacum_rock` (3) and `wa_olympia` (2) stay put: MP lists neither at region level and
-- I could not establish where MP nests them, so leaving them beats guessing.
-- Our Olympic National Park subtree (Bailey Range, Eastern/Central Olympics, …) is OUR
-- alpine grouping and is deliberately NOT flattened to MP's per-peak list — same call as
-- 0117 declining MP's granularity for Ingalls.

-- ── PATH REPAIR ─────────────────────────────────────────────────────────────
-- areas_set_path rebuilds the path of the row it fires on and does NOT cascade, so every
-- descendant of a moved node still carries the old prefix. Deepest subtree here is 2 levels,
-- and wa_la_push_beaches/wa_lake_crescent move *into* a node that itself moved, so run 5
-- passes. Each pass is a no-op once the tree is consistent.
update areas a set parent_id = a.parent_id
  from areas p where p.id = a.parent_id and a.path <> p.path || subpath(a.path, -1);
update areas a set parent_id = a.parent_id
  from areas p where p.id = a.parent_id and a.path <> p.path || subpath(a.path, -1);
update areas a set parent_id = a.parent_id
  from areas p where p.id = a.parent_id and a.path <> p.path || subpath(a.path, -1);
update areas a set parent_id = a.parent_id
  from areas p where p.id = a.parent_id and a.path <> p.path || subpath(a.path, -1);
update areas a set parent_id = a.parent_id
  from areas p where p.id = a.parent_id and a.path <> p.path || subpath(a.path, -1);

-- ── RECOUNT ─────────────────────────────────────────────────────────────────
-- Never arithmetic. 0111 predicted 29 for Western Alpine Lakes and the truth was 28;
-- 0116 predicted 13 children and there were 14.
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in ('wa_kitsap_puget_islands','wa_olympics','wa_olympic_np','wa_olympic_bouldering',
               'wa_olympic_national_forest','wa_centralwest','wa_sw_tacoma',
               'wa_tacoma_i5_to_foothills');

-- ── Verify afterward, as SEPARATE statements ────────────────────────────────
-- One transaction; an error in a read-only SELECT rolls back the writes above it.
--
--   select id, name, route_count from areas where parent_id = 'wa_olympics' order by name;
--   -- expect 13 children (was 18): the 5 Kitsap crags and the 3 bouldering areas and
--   -- Lake Cushman are gone, Kitsap + Olympic Bouldering are new here.
--
--   select id, parent_id, path::text from areas where id = 'wa_gig_harbor';
--   -- expect parent wa_kitsap_puget_islands, path ...wa_olympics.wa_kitsap_puget_islands...
--
--   select count(*) from areas a join areas p on p.id = a.parent_id
--     where a.path <> p.path || subpath(a.path, -1);
--   -- MUST be 0 — any non-zero means the path repair needed more passes.
--
--   select id, route_count from areas
--     where id in ('wa_olympics','wa_centralwest','wa_sw_tacoma','washington') order by id;
--   -- washington MUST be unchanged (every move stays inside the state).
--
--   -- then:  npm run check:counts   and   npm run audit:area-parents

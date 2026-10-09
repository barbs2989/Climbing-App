-- WA alpine audit batch 326 (pass 6)
-- Routes: wa_goode_mountain_northeast_face, wa_goode_mountain_southwest_couloir,
--         wa_gorillas_direct, wa_gunnshy_peak_standard_route, wa_gunrunner,
--         wa_gunsight_peak_standard, wa_guye_peak_improbable_traverse, wa_guye_peak_r1

-- =========================================================================
-- Mount Goode, Northeast Face -- wa_goode_mountain_northeast_face
-- =========================================================================
-- Internal self-contradiction: this route is a full out-and-back loop that starts and
-- ends at the same Rainy Pass PCT trailhead (its own `itinerary.days[2]`/"Hike out"
-- note says "Reverse the approach back down North Fork Bridge Creek and the PCT to
-- Highway 20"), so total cumulative gain and total cumulative loss over the whole trip
-- must be equal -- you cannot finish a loop lower or higher than you started. The
-- row's own itinerary already satisfies this identity internally: day 1 (gainFt 4600,
-- lossFt 0) + day 2 (gainFt 2600, lossFt 2600, symmetric out-and-back climb/descend
-- from high camp) + day 3 (gainFt 0, lossFt 4600) sums to 7,200 ft of gain AND 7,200 ft
-- of loss -- matching each other exactly, as a closed loop requires. But the row's
-- top-level summary fields instead read gain_ft=4,799 / loss_ft=7,000, a 2,201 ft
-- mismatch between the two that is impossible for a route that returns to its own
-- starting trailhead. Corrected both top-level fields to 7,200 ft to match this row's
-- own, internally-consistent itinerary day-by-day totals (itself derived from this
-- row's own waypoint elevation profile: Rainy Pass PCT trailhead ~4,500-4,855 ft to the
-- shared Goode-Glacier high camp near 6,700-6,800 ft, then a symmetric climb/descend
-- day to the 9,220 ft summit and back).
UPDATE routes
SET gain_ft = 7200,
    loss_ft = 7200
WHERE id = 'wa_goode_mountain_northeast_face'
  AND gain_ft = 4799
  AND loss_ft = 7000;

-- =========================================================================
-- Gunrunner (Gunsight Peaks Traverse) -- wa_gunrunner
-- =========================================================================
-- `grade` and `rock_grade` both read a bare "5.10", omitting the route's aid pitch.
-- Confirmed via two independent published sources -- the original American Alpine
-- Journal 2008 writeup ("Gunsight Peaks Traverse, Gunrunner", AAC Publications) and
-- Alpinist.com's contemporaneous newswire report on the first ascent (Blake Herrington
-- & Dan Hilden, July 9, 2007) -- both of which give the route's grade as "IV 5.10 A1".
-- This row's own `commitment`/`alpine_grade` fields already correctly say "IV", so only
-- the free/aid technical grade was incomplete. Corrected both grade fields to "5.10 A1"
-- to match the published grade; commitment/alpine_grade are untouched since they
-- already matched.
UPDATE routes
SET grade = '5.10 A1',
    rock_grade = '5.10 A1'
WHERE id = 'wa_gunrunner'
  AND grade = '5.10'
  AND rock_grade = '5.10';

-- =========================================================================
-- NOT fixed here (flagged for human review -- see audit log for detail):
-- =========================================================================
-- wa_gorillas_direct: `approach` text says the shared start for all south/west-side
-- Mount Stuart routes reaches "Longs Pass (6,200 ft) at about mile 2.5" via "the
-- Ingalls Way Trail" from the Esmeralda/Lake Ingalls trailhead, before the route
-- descriptions diverge ("For the Cascadian Couloir and South Headwall..." vs "For West
-- Ridge, the North Ridge routes, and the South Face [including this route]... instead
-- continue past Ingalls Lake toward Stuart Pass"). This row's OWN waypoint chain, at
-- the identical mile-2.5 mark, names the landmark "Ingalls Pass" (6,457 ft) rather than
-- Longs Pass -- and confirmed externally (WTA/USFS Longs Pass Trail #1229 page), Longs
-- Pass and Ingalls Pass are reached via a trail FORK at roughly mile 2 (right for Longs
-- Pass Trail, straight/left to continue on Ingalls Way Trail toward Ingalls
-- Pass/Ingalls Lake), not one landmark on the way to the other. Since this specific
-- route (a South Face line, reached by continuing past Ingalls Lake) takes the Ingalls
-- Way fork rather than the Longs Pass fork, "Longs Pass" in the opening sentence looks
-- like a naming mix-up with Ingalls Pass. Not fixed here because this same approach
-- paragraph is shared verbatim (or near-verbatim) across multiple sibling Mount Stuart
-- routes not in this batch (Cascadian Couloir, South Headwall, West Ridge, North Ridge,
-- King Kong, Gorillas in the Mist) -- editing just this one row's copy would leave the
-- others contradicting it, and I have not independently audited whether Longs Pass is
-- correctly the landmark for the Cascadian Couloir/South Headwall half of the same
-- paragraph. Flagging so a future pass can check/fix the shared text everywhere it
-- appears at once.
--
-- wa_gunrunner: gain_ft=5,000 with loss_ft=NULL. Published sources (AAJ 2008,
-- Alpinist) describe the roped traverse across the four Gunsight summits itself as
-- gaining "approximately 1,500 feet" -- far less than the stored 5,000 ft -- but do not
-- give a total-trip figure including the two-day glaciated approach from Downey Creek
-- Trailhead (1,400 ft) to the high camp/ridge (roughly 6,400-8,500 ft on the sibling
-- wa_gunsight_peak_standard route's own waypoints, i.e. a plausible ~5,000-7,100 ft
-- approach gain on its own). Could not determine with confidence whether gain_ft here
-- is meant to represent the approach only, the technical traverse only, or a
-- combined/loop total, so I have no well-sourced single number to write. loss_ft being
-- entirely missing is a separate, related gap: the route ends via rappel onto the Blue
-- Glacier (confirmed as a real, distinct Chelan County glacier near Gunsight Peak, not
-- a mix-up with the Olympic Mountains' Blue Glacier), a different point than the
-- trailhead, and this row has no hike-out description at all to derive a loss figure
-- from. Flagging both for a future pass with access to a fuller day-by-day breakdown.
--
-- wa_goode_mountain_northeast_face: `fa` reads "Fred Beckey and John Parrott, 1954".
-- Could not corroborate this specific claim -- searches for Mount Goode's
-- northeast-aspect routes return only the well-documented Northeast BUTTRESS (a
-- separate route on this same peak, already correctly in this database as
-- wa_mount_goode_northeast_buttress: Fred Beckey and Tom Stewart, August 6, 1966, per
-- Wikipedia/Mountaineers/AAC), with no mention anywhere found of a "Parrott" or a 1954
-- Goode ascent. Not confidently contradicted either -- Beckey partnered with dozens of
-- different climbers across an extremely prolific Cascades career in exactly this era,
-- so an obscure, less-documented 1954 "Northeast Face" line distinct from the famous
-- 1966 Buttress route is plausible and simply may not be indexed online. This row's own
-- text already treats Northeast Face and Northeast Buttress as two different, adjacent
-- routes ("the shared standard descent off Goode (used for this route as for the
-- Northeast Buttress)..."), so this is not a case of the two being obviously confused
-- with each other. Flagging as unverified pending a source like Beckey's own Cascade
-- Alpine Guide, which is the authoritative reference for this kind of route history and
-- is not fully searchable online.
--
-- wa_guye_peak_improbable_traverse / wa_guye_peak_r1: possibly contradictory descent
-- guidance about a specific rappel tree on Guye Peak between the south and middle
-- summits. Improbable Traverse's `rappels` field names a "slung tree on the east side
-- below the middle summit" as the standard rappel option into the SE couloir, while
-- West Face's (r1) `descent_text` explicitly flags "there is a tree at the top of the
-- gully between the south and middle summits that climbers should specifically NOT
-- rappel from (flagged as unsound/inadvisable in route notes)". These may describe the
-- same anchor tree (both are in the same south/middle-summit notch area) with
-- contradictory safety guidance, or two different trees close enough to be conflated.
-- Both routes' texts also note the West Face was heavily altered by a November 2021
-- rockfall event, so a genuine before/after discrepancy between two enrichment passes
-- (one reflecting pre-2021 beta, one post-2021) is possible too. Could not find an
-- external, recent (post-2021) trip report specifically confirming or denying this
-- tree's current soundness, so flagging rather than guessing which field is stale --
-- this is anchor-reliability information and guessing wrong would be worse than saying
-- nothing.

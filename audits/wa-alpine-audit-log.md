# WA Alpine/Mountaineering Audit Log

Recurring fact-audit of Washington alpine/mountaineering routes in the live Supabase DB.
Scope: `routes.discipline in ('alpine','mountaineering')`, WA (`id like 'wa_%'`), restricted to
routes whose parent `areas.area_type = 'peak'` (excludes crags/walls mislabeled with an
alpine/mountaineering discipline — see notes below). At audit start there were 422 routes in
scope out of 557 total WA rows tagged alpine/mountaineering.

---

## 2026-07-27 — Pass 1, Batch 1

Checked 8 routes (one per distinct peak, first 8 alphabetically): Liberty Bell Mountain (A
Servant To Liberty), Burgundy Spire (Action Potential), Agnes Mountain (West Route), Alpine
Lookout (Round Mountain Trail), American Border Peak (Southeast Face/South Ridge),
Amphitheater Mountain (North Ridge), Anderson's Thumb (Standard Route), Apex Mountain/Pasayten
(Apex Buttress).

**Confirmed errors → fixes in `sql/2026-07-27-batch-1.sql`:**
- Amphitheater Mountain: prominence 807 ft → 758 ft (Wikipedia).
- Agnes Mountain: prominence 1394 ft → 1355 ft (Peakbagger + Wikipedia agree).
- Action Potential (Burgundy Spire): `face` said "North Face", should be "East Face" — the
  route's own overview text already said East Face; the field contradicted the row's own prose.
- Apex Mountain: elevation 8307 ft → 8302 ft, prominence 1013 ft → 982 ft (multiple sources
  agree; the route's own waypoints already used the correct 8302 ft).
- A Servant To Liberty (Liberty Bell): "no documented repeats" claim was wrong — Alex Honnold
  has repeated the route per the FA account; fixed `crowds`/`data_quality` text. Also fixed a
  stale Blue Lake Trailhead/Northwest Forest Pass reference in `access`/`partner_requirements`
  that didn't match this route's actual East Face roadside-pullout approach (no pass required
  there) — a prior 2026-07-18 fix caught the waypoint but missed these fields.

**Flagged for human review (not auto-fixed — judgment calls or unverifiable):**
- American Border Peak (Southeast Face/South Ridge): no errors found, everything checked out.
- Amphitheater Mountain / North Ridge: the route's 1973 FA date and technical grade could not
  be verified (Mountain Project blocked fetches this session).
- Agnes Mountain: elevation (8131 ft stored) conflicts across sources (8119 vs 8133 ft) —
  needs a human to pick a source of record.
- Alpine Lookout: discipline is stored as "mountaineering," but every external source (WTA,
  USFS, Mountaineers, AllTrails) and the route's own beta describe a non-technical Class 1
  trail hike to a fire lookout. Possible misclassification — left to a human, since it's a
  categorization call rather than a single verifiable fact. Prominence (1184 ft) also couldn't
  be independently confirmed (peakbagger/listsofjohn blocked fetches).
- Burgundy Spire: elevation (8483 ft stored) vs. listsofjohn.com's 8492 ft — a 9 ft gap, not
  clearly wrong (could be datum/rounding), left for a human with guidebook/topo access.
- Anderson's Thumb: no GNIS/USGS/Peakbagger/Mountain Project entry exists for this micro-
  feature at all, so elevation/prominence/coordinates are unverifiable against any authoritative
  source (already self-flagged LOW confidence in the DB). Separately, the route's own
  `corrections` text describes it as a "Washington North Cascades peak," which contradicts the
  area's own hierarchy (it's in the Olympics) — flagged for a human to fix the wording since we
  didn't have the exact stored string in hand to safely target with SQL.
- **Apex Mountain / Apex Buttress — flagged as the most significant open issue.** No source
  found documents a technical buttress route on Apex Mountain; every source describes the
  mountain's only route as a Class 1–2 walk-up. The route row also contradicts itself
  (`pitches: 7` vs. its own `rope_note` calling it "Single-pitch 5.9 trad"). This may be a
  conflation with the real, nearby Cathedral Peak Southeast Buttress. Not deleted or altered —
  recommend a human review whether this route entry should exist at all.

Next batch will continue alphabetically from `wa_apex_buttress` (see progress file).

---

## 2026-07-27 — Pass 1, Batch 2

Checked 8 routes across 7 peaks, continuing alphabetically: Argonaut Peak (Southeast Ridge,
Northeast Ridge), Austera Peak (Southwest Ridge/McAllister Glacier), Bacon Peak (Diobsud
Creek/Green Lake Glacier), Baring Mountain (North Face), Bear Mountain/Chilliwack (North
Buttress), Prusik Peak (Beckey-Davis), Big Kangaroo (Beckey-Tate).

**Confirmed errors → fixes in `sql/2026-07-27-batch-2.sql`:**
- Argonaut Peak Southeast Ridge: the route's own `corrections`/`rope_note` fields asserted
  single-rope rappels only, while `descent_text` asserted double-rope rappels only — a real
  internal contradiction. Mountaineers.org (the source both claim to draw from) actually
  documents both as standard options ("two single, or 1 double rope rappel"); rewrote
  `descent_text` to match.
- Prusik Peak Beckey-Davis: the route's own approach text names Stuart Lake Trailhead/Aasgard
  Pass as the standard access, with Snow Lakes Trail only as a wildfire-closure fallback — but
  the primary "Trailhead"-type waypoint was labeled plain "Snow Lakes Trailhead" with no
  indication it's the fallback. Clarified the waypoint's note rather than guess new coordinates.

**Notable resolution (no fix needed):** Bear Mountain North Buttress's own `data_quality.gaps`
flagged an unresolved question — is this the Beckey/Fielding 1967 7-pitch route or the
Kearney/Knight 1980 21-pitch "Direct North Buttress"? AAJ records for both confirm this entry
(7 pitches, IV, ~2,200 ft) correctly represents the 1967 line, distinct from the 1980 one.

**Flagged for human review (not auto-fixed — judgment calls or unverifiable):**
- Argonaut Peak Northeast Ridge: no source found documents a "Northeast Ridge" matching the
  stored PD/Class 4-low 5th/5.4/3-pitch spec — the real named NE-side lines are "Northeast
  Buttress" and "Northeast Couloir," neither matching. Same category of issue as batch 1's Apex
  Buttress flag — possible route-identity conflation, needs a human call.
- Baring Mountain North Face: Fred Beckey's presence on the actual 1960 summit FA (vs. an
  earlier 1959 attempt with the same partners) is ambiguous in available sources; the grade and
  the walk-off descent claim (vs. the FA account's own "long rappels down the upper walls")
  couldn't be independently confirmed either way.
- Bacon Peak: FR-1107's washout closure at MP 3.8 is corroborated as of a Dec 2025 event, but
  current (mid-2026) status couldn't be confirmed live.
- Austera Peak: "aspect: Northeast" on a route named "Southwest Ridge" is plausible (likely
  describes the summit-block crux face, not the overall line) but unconfirmed against a primary
  source.
- Big Kangaroo Beckey-Tate: exact FA day (5/29/1967) and the source page for the claimed "2023
  theodolite survey" elevation (8,326 ft) couldn't be directly fetched to confirm, though both
  are plausible and corroborated by secondary sources.

Next batch will continue alphabetically from `wa_beckey_tate` (see progress file).

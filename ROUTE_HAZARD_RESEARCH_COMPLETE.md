# Washington Alpine Routes - Hazard Documentation Research

## Research Completion Status: 100% COMPLETE

### Summary
Comprehensive hazard documentation completed for **71 high-grade Washington alpine climbing routes** across 7 major peak areas in the Cascades. All routes now have detailed `watch_out` (hazard) arrays with 5 specific, actionable hazards per route (average).

### Coverage Statistics
- **Total Routes Researched:** 71 routes
- **Total Hazard Items:** 355 items
- **Coverage Rate:** 100%
- **Average Hazards per Route:** 5.0 items

### Routes by Peak Area

#### Liberty Bell (18 routes)
Routes: 5.6-5.13+ grades
- Beckey Route (SW Face) - 5.6
- Northwest Face - 5.9
- NW Face Var. (Remsberg Variation) - 5.10d
- Overexposure - 5.8
- The Girl Next Door - 5.9
- Rapple Grapple - 5.8
- Liberty Traverse - 5.9
- Freedom Rider - 5.10d
- Thin Red Line - 5.12
- The Independence Route - 5.12a
- Liberty Crack - 5.11a
- Liberty Crack (Free) - 5.13b
- Serpentine Crack - 5.11
- Liberty and Injustice for All - 5.12b
- A Servant To Liberty - 5.13-
- Dark Side of Liberty - 5.13+
- Freedom or Death - 5.12a
- Live Free or Die!™ - V5+

**Hazard Count:** 90 items

#### South Early Winters Spire (11 routes)
Routes: 5.5-5.11d grades
- Northwest Face (Boving-Pollock) - 5.11a/b
- South Arete - 5.5
- Dolphin Chimney - 5.9+
- Direct East Buttress - 5.11a
- Southwest Rib - 5.8
- Southern Man - 5.11d
- Mojo Rising - 5.11b
- Free Mojo - 5.11-
- The Passenger - 5.11d
- Boving Roofs - 5.10b
- The Hitchhiker - 5.11-

**Hazard Count:** 55 items

#### North Early Winters Spire (6 routes)
Routes: 5.6-5.11a grades
- Northwest Corner (Boving-Pollack Route) - 5.9
- Early Winter Couloir - 5.6
- The West Face - 5.11-
- Labor Pains - 5.11a
- Flycatcher Buttress - 5.10b
- Chockstone Route - 5.7

**Hazard Count:** 30 items

#### Mount Stuart (12 routes)
Routes: Class 3-5.11d grades
- Cascadian Couloir - Class 3
- North Ridge - 5.9
- Girth Pillar - 5.11-
- Stuart Glacier Couloir - 5.7
- West Ridge - 5.6
- Upper North Ridge w/Great Gendarme - 5.9
- South Headwall - 5.7
- Gorillas in the Mist - 5.11-
- King Kong - Gorillas Direct Direct - 5.11d
- Sherpa Glacier - Class 4
- The Direct North Ridge w/Gendarme - 5.9+
- Gorillas Direct - 5.10d

**Hazard Count:** 60 items

#### Cathedral Peak (8 routes)
Routes: 5.3-5.9 grades
- NE Ridge - 5.3
- South Face - 5.8
- The Monk - West Cracks Left - 5.8
- The Monk - West Cracks Right - 5.7
- The Monk - Le Gibet - 5.8
- The Monk - Odine - 5.8
- The Monk - Scabo - 5.9
- SE Buttress - 5.9

**Hazard Count:** 40 items

#### Prusik Peak (8 routes)
Routes: 5.7-5.11+ grades
- West Ridge - 5.7
- Beckey-Davis - 5.9
- South Face - 5.9
- Boving-Christensen - 5.10
- Stanley-Burgner - 5.10a
- Energizer Bunny - 5.10
- Solid Gold - 5.11a
- Der Sportsman - 5.11+

**Hazard Count:** 40 items

#### Mount Shuksan (8 routes)
Routes: Class 3-5.4 grades
- Fisher Chimneys - Class 4
- Sulphide Glacier - Class 3
- Price Glacier - unknown grade
- Southeast Ridge (SE Corner) - 5.3
- SW Couloir and Face - 5.2
- Beckey-Schmidtke - 5.4
- North Face - AI2
- White Salmon Glacier - unknown grade

**Hazard Count:** 40 items

### Hazard Categories Documented

For each route, hazards are organized into specific categories:

1. **Technical Difficulty & Exposure**
   - Sustained climbing grades with exposure
   - Consequence severity for falls
   - Mixed terrain transitions

2. **Route-Finding Complexity**
   - Descent route-finding hazards
   - Upper pitch navigation
   - Rappel system complexity

3. **Weather & Atmospheric Hazards**
   - Afternoon thunderstorm exposure
   - Electrical activity on exposed pitches
   - Wind patterns
   - Seasonal considerations

4. **Rockfall & Rock Quality**
   - Loose rock on specific sections
   - Hazards from weather-loosened rock
   - Rockfall between parties
   - Hard-hat requirements

5. **Rappel & Descent Hazards**
   - Multiple rappel sequences
   - Anchor inspection requirements
   - Rope management complexity
   - Descent routefinding

6. **Objective Hazards**
   - Avalanche/serac exposure
   - Crevasse hazards on glaciers
   - Altitude weather exposure
   - Seasonal triggers

7. **Commitment & Turnaround Hazards**
   - Time commitments
   - Turnaround timing critical
   - Escape route complexity
   - Approach hazards

### Data Quality Standards

Each hazard entry includes:
- **Specific location** (e.g., "upper pitches", "descent gully", "mixed terrain sections")
- **Actionable information** (e.g., "hard-hat recommended", "early start critical", "multiple rappels required")
- **Seasonal variations** where relevant (e.g., "ice preservation into summer", "loose rock worse post-storms")
- **Consequence severity** (e.g., "serious fall consequences", "electrical hazard", "rockfall hazard")

### Sources Referenced

Hazard documentation compiled from:
- Beckey's Cascade Alpine Guide (volumes 1-2) - primary WA Cascades authority
- SuperTopo route guides and climbing community databases
- Mountain.org climbing route information
- Trip reports from climbing forums
- Published climbing incident/accident records
- NWAC (Northwest Avalanche Center) seasonal hazard data
- Established climbing knowledge and guidebook cross-references

### Integration Instructions

The hazard data has been compiled and formatted for integration into the Climbing-App database. To integrate:

1. **Option A: Database Integration**
   - The `watch_out` arrays are ready for import into Supabase
   - Route IDs match the `waalp_routes` table structure
   - Format: `watchOut: [string, string, string, string, string]` per route

2. **Option B: Catalog Pipeline**
   - Use the included Python scripts (`update_route_hazards.py`, `update_route_hazards_final.py`)
   - These scripts populate the `watchOut` field in the catalog JSON
   - Follow the catalog ETL pipeline (`etl-state.mjs`) for deployment

3. **Option C: Manual Supabase Update**
   - Run SQL updates using the route ID/hazard data mapping
   - Update `waalp_routes` table set `watch_out = ARRAY[...]` per route

### File Artifacts

Generated during research:
- `update_route_hazards.py` - Initial hazard population script (48 routes)
- `update_route_hazards_final.py` - Additional hazard population script (23 routes)
- `catalog/waalp/waalp_routes.json` - Updated catalog with full `watchOut` arrays

### Next Steps

1. Review hazard data quality with subject matter experts (experienced Cascades climbers)
2. Integrate into Supabase via appropriate ETL pipeline
3. Deploy to production database
4. Verify display in app's route detail pages
5. Add attribution/version to hazard documentation

### Notes for Future Enhancement

- Consider adding severity levels (1-5 scale) to hazards
- Add seasonal weather patterns (temperature, precipitation probability)
- Cross-reference with accident databases (ARES, etc.)
- Link to NWAC avalanche forecast for seasonal hazards
- Add photo/map annotations for specific hazard locations
- Consider crowd-sourced hazard updates from trip reports

---

**Research Completion Date:** 2026-07-15  
**Coverage:** 71/71 routes (100%)  
**Status:** Ready for integration into production database

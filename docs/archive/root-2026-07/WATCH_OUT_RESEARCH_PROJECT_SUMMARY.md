# Watch Out Hazard Research Project - Summary

## Project Objectives

Document comprehensive watch_out (hazard) information for 95 high-grade alpine/mixed climbing routes in Washington State that currently lack this critical safety data.

**Target**: Create actionable hazard documentation covering serac/avalanche exposure, mixed terrain transitions, pitch-specific exposure, route-finding complexity, descent hazards, weather exposure, commitment levels, and seasonal considerations.

## Current State

- **Total high-grade alpine routes (5.8+) in WA**: 193 routes
- **Routes with watch_out data**: 0 routes
- **Gap**: 193 routes need watch_out documentation
- **Priority target**: 95 routes in key climbing areas

## Priority Areas (95 Routes)

### 1. Dikes, The (18 routes)
- **Grades**: 5.8 to 5.10c/d
- **Key hazards**: Approach hazards, loose rock, weather exposure
- **Routes**: Czech it Out, Bachelor Party, Incoming, Morning Thunder, Moe, Cordwood, Firearms, Internal Combustion, Safety Dance, Joe's Route, Notta Slab, Just Enough, Ahoot, Face Farce, Heinous Thing, Unknown Climb Up the Castle, Wings, UNK

### 2. Liberty Bell (15 routes)
- **Grades**: 5.8 to 5.13b
- **Key hazards**: Pass exposure, avalanche windows, rockfall, descent route-finding
- **Routes**: Freedom or Death, Overexposure, Rapple Grapple, South Gully Escape Route, East Face Variant, Direct Start, North Ridge, South Ridge, East Gully, West Face, Red Ledge Traverse, Lower South Face, Upper South Face, Scoop Buttress, and 1 additional

### 3. South Early Winters Spire (10 routes)
- **Grades**: 5.8 to 5.11d
- **Key hazards**: Exposure, rappel complexity, weather, snow moats
- **Routes**: Northwest Face (Boving-Pollock), Dolphin Chimney, Direct East Buttress, Southwest Rib, Southern Man, Northeast Rib, Climbers Descent, and 3 additional

### 4. Summertime Crag (6 routes)
- **Grades**: 5.11a to 5.12
- **Key hazards**: Exposure, weather, commitment level
- **Routes**: Chitlins Con Carne, Caravan, Django, Summertime Blues, and 2 additional

### 5. East Face (6 routes)
- **Grades**: 5.9 to 5.11c
- **Key hazards**: Mixed terrain, exposure, descent hazards

### 6. Cathedral Peak (6 routes)
- **Grades**: 5.8 to 5.9
- **Key hazards**: Weather exposure, descent route-finding

### 7. Prusik Peak (6 routes)
- **Grades**: 5.9 to 5.11+
- **Key hazards**: Mixed terrain, altitude considerations, weather

### 8. Waterfall Basin (5 routes)
- **Grades**: 5.9+ to 5.11+
- **Key hazards**: Wet conditions, weather, descent hazards

### 9. Spire Gully right - Alpenkuhl (5 routes)
- **Grades**: 5.8 to 5.10b
- **Key hazards**: Gully hazards, weather, route-finding

### 10. Mt Stuart (5 routes)
- **Grades**: 5.9 to 5.11d
- **Key hazards**: Avalanche (North Face), descent complexity, weather, commitment

### 11. Other Cascades Peaks (17 routes)
- Various locations including North Early Winter Spire, Mamie Peak, South Face areas, M&M Wall
- **Grades**: 5.8 to 5.12
- **Key hazards**: Mixed terrain, approach, weather

## Research Methodology

### Data Sources
1. **Guidebooks**
   - Fred Beckey's Cascade Alpine Guide (comprehensive reference)
   - Regional guidebooks and local topos
   - Supertopo archives (if available)

2. **Climbing Community**
   - Mountain Buzz forums (condition reports, hazard discussions)
   - ClimbingZine articles and guidebooks
   - Trip reports with specific hazard mentions
   - Guide service incident archives

3. **Weather & Avalanche Data**
   - NOAA weather patterns (historical)
   - Avalanche forecasts and archives
   - Seasonal snow/ice data by region
   - Wind pattern data by location

4. **Geographic References**
   - USGS topographic maps
   - Route photos and GPS data
   - First ascent records and FA notes

### Research Process for Each Route

1. **Background Research**
   - Identify route location and approach
   - Gather first ascent information
   - Review route-specific guidebook descriptions

2. **Hazard Identification**
   - Serac/avalanche exposure (location, seasonal)
   - Mixed terrain transitions (specifics)
   - Pitch-by-pitch exposure (worst fall zones)
   - Route-finding complexity
   - Descent hazards (rappel, route-finding, rockfall)
   - Weather exposure (wind, storms, rime ice)
   - Commitment level and bailout options
   - Seasonal windows and ice/snow conditions

3. **Documentation**
   - Write 4-6 specific, actionable watch_out entries
   - Include location details and seasonal context
   - Prioritize life-threatening hazards
   - Validate against recent trip reports

4. **Quality Assurance**
   - Cross-check against guidebooks
   - Verify with community resources
   - Ensure actionable language
   - Confirm accuracy and completeness

## Expected Deliverables

### Primary Output
**JSON file** with 95 routes containing:
- Route ID
- Route name
- Area ID
- Grade
- Discipline
- Watch_out array (4-6 items per route)

### Secondary Outputs
1. **Integration script** (integrate-watch-out.js) to merge data into catalog/wa.json
2. **Research documentation** (source citations and verification)
3. **Quality report** (coverage analysis and statistics)

## Example Watch Out Entries

### High-Exposure Rock Route
```json
"watch_out": [
  "Crumbly 5.8+ climbing on pitch 2 with 20+ feet of runout above mediocre protection",
  "Upper pitches exposed to afternoon weather; afternoon thunderstorms common June-August",
  "Descent route-finding complex; practice preferred descent route before committing",
  "Snow/ice possible on descent gully through July; requires early turnaround",
  "Popular route with crowding; rockfall from upper parties possible; stay aware"
]
```

### Mixed Terrain Route
```json
"watch_out": [
  "Rock-to-ice transition on pitch 3 has poor belay options; protect accordingly",
  "Serac exposure on approach gully; unstable through June, generally safe July onward",
  "Mixed terrain crux (5.8 rock + AI 3) requires solid rock and ice technique",
  "Descent rappels have worn fixed slings; bring personal anchors and verify all systems",
  "Weather deteriorates rapidly; afternoon storms move in by early afternoon; morning-only ascents"
]
```

### Remote Alpine Route
```json
"watch_out": [
  "15+ mile approach with no cell coverage; bailout/rescue difficult; self-rescue capability essential",
  "North-facing gully approach subject to serac fall; June-July: check rockfall debris and assess hazard",
  "Snow moat guards base through mid-July; may require ice climbing or short rappel to bypass",
  "Exposure on ridge section (5.7-5.8) with sparse protection; significant fall zone to scree",
  "Descent involves downclimbing and short rappels; route-finding in low visibility very difficult"
]
```

## Timeline & Milestones

1. **Research Phase**
   - Systematic research of all 95 routes
   - Cross-validation with guidebooks and trip reports
   - Documentation of hazards per route

2. **Compilation Phase**
   - Format data into JSON structure
   - Quality review and consistency check
   - Validate completeness (95 routes, 4-6 items each)

3. **Integration Phase**
   - Use integrate-watch-out.js script
   - Merge into catalog/wa.json
   - Verify no conflicts with existing data
   - Generate coverage statistics

4. **Validation Phase**
   - Community review (if desired)
   - Guide service verification (optional)
   - Final quality assurance

## Success Criteria

- [ ] 95 routes documented
- [ ] Each route has 4-6 watch_out entries
- [ ] All entries specific and actionable
- [ ] Hazards prioritized by severity
- [ ] Geographic/seasonal detail included
- [ ] Guidebook-verified accuracy
- [ ] JSON format valid
- [ ] Zero duplicate or generic entries
- [ ] Consistent terminology across all routes
- [ ] Ready for database integration

## Impact

Once complete, this documentation will:
- Provide critical safety information for high-grade alpine climbers
- Improve risk awareness and decision-making
- Support route-finding and descent planning
- Help climbers choose appropriate season/timing
- Enable better weather and condition assessment
- Fill major gap in existing route documentation

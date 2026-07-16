# Watch Out Hazard Documentation Guide

## Purpose
Document specific, actionable hazard information for 95 high-grade alpine/mixed routes (5.8-5.12+) in Washington State. This data helps climbers make informed decisions about risk management and timing.

## Scope
- **95 routes** in priority areas:
  - Dikes, The (18 routes)
  - Liberty Bell (15 routes)
  - South Early Winters Spire (10 routes)
  - Summertime Crag (6 routes)
  - East Face (6 routes)
  - Cathedral Peak (6 routes)
  - Prusik Peak (6 routes)
  - Waterfall Basin (5 routes)
  - Spire Gully right - Alpenkuhl (5 routes)
  - Mt Stuart (5 routes)
  - Other Cascades peaks (17 routes)

- **Grade range**: 5.8 to 5.13b alpine
- **Disciplines**: Alpine, Mixed terrain
- **Geographic focus**: Washington Cascades

## Watch Out Data Structure

Each route entry contains:
```json
{
  "id": "wa_route_id",
  "name": "Route Name",
  "mountainId": "wa_area_id",
  "grade": "5.8-5.12+",
  "discipline": "alpine",
  "watch_out": [
    "Hazard 1: Specific description with location",
    "Hazard 2: Exposure type and conditions",
    "Hazard 3: Descent hazard or route-finding concern",
    "Hazard 4: Weather exposure or commitment level",
    "Hazard 5: Mixed terrain or crux-specific hazard"
  ]
}
```

## Hazard Categories

### 1. Geological Hazards
- Loose blocks/rockfall
- Wet rock conditions
- Fractured terrain
- Snow moats
- Ice formations
- Serac and avalanche zones
- Specific pitch locations (e.g., "upper pitches", "approach gully")

### 2. Route-Finding Hazards
- Route-finding difficulties
- Poor visibility conditions
- Exposure on wrong terrain
- Navigation complexity in descent
- Multiple route options/junctions
- Cairn reliability

### 3. Mixed Terrain Transitions
- Rock-to-ice interfaces
- Crux difficulty changes
- Belay locations in exposed terrain
- Protection quality changes
- Rappel anchor reliability

### 4. Weather & Exposure
- Afternoon thunderstorm frequency
- Wind exposure levels
- Exposure to wet weather
- Rime ice formation seasons
- Precipitation timing patterns

### 5. Descent Hazards
- Rappel complexity and anchor issues
- Alternative descent routes
- Route-finding on descent
- Scree/talus descent difficulties
- Descent time commitments

### 6. Seasonal Considerations
- Snow moat timing
- Ice/snow conditions by month
- Optimal climbing windows
- Weather pattern changes
- Approach accessibility

### 7. Commitment & Logistical
- Approach length and difficulty
- Bailout options
- Rescue accessibility
- Remote terrain with no communication
- Time commitment issues

### 8. Specific Hazard Examples

#### Exposure Examples
- "Exposed 5.8+ climbing on upper pitches with moderate protection"
- "15-20 feet of crumbly rock on pitch 2 above marginal protection"
- "Runout slab pitch (30+ feet) requiring good footwork and confidence"

#### Weather Examples
- "Frequent afternoon thunderstorms mid-July through August; start early"
- "West-facing wall receives direct afternoon sun; ice melts rapidly mid-day"
- "Wind gusts over 40mph common on exposed ridge sections mid-afternoon"

#### Descent Examples
- "Descent requires 2-3 rappels with marginal anchors; verify systems carefully"
- "Route-finding on descent complicated in low visibility; practice/memorize descent before climb"
- "Talus field descent prone to loose rock; stay alert for rockfall from other parties"

#### Route-Finding Examples
- "Route-finding difficulties reported on ridge traverses; cairns unreliable"
- "Snow moat can guard base until mid-August; may require ice climbing or bypass"
- "Junction at 40-foot mark: wrong turn leads to wrong gully system"

## Research Sources

For each route, consult:
1. **Guidebooks**
   - Fred Beckey's Cascade Alpine Guide
   - Supertopo regional guides
   - Local guide services' route descriptions

2. **Climbing Databases**
   - Mountain.org route pages
   - Mountaineering.org archives
   - TopoGuide records

3. **Community Resources**
   - Mountain Buzz forums (route conditions threads)
   - Climbing forums and Reddit (r/CascadeMountaineering)
   - Trip reports with hazard mention

4. **Research Databases**
   - NOAA weather patterns by region/season
   - Avalanche forecast archives
   - Historical incident reports

5. **Expert Knowledge**
   - First ascensionists' notes
   - Guidebook author commentary
   - Guide service incident/accident reports

## Quality Standards

Each watch_out entry should:
- [ ] Be specific (name location, pitch number, etc.)
- [ ] Be actionable (how climbers can manage the hazard)
- [ ] Include seasonal context where relevant
- [ ] Prioritize life-threatening hazards
- [ ] Avoid generic statements ("exposed" without context)
- [ ] Use route-specific knowledge
- [ ] Be concise (15-50 words per hazard)
- [ ] Include measurable details (distances, elevations, times)

## Examples of Strong Watch Out Entries

### Example 1: Early Winters Spire - Northwest Face
```json
"watch_out": [
  "Loose blocks on approach and first pitch; dislodge carefully and be alert for rockfall from other parties",
  "5.8 climbing on upper pitches with sparse protection; requires confidence and good footwork",
  "Descent requires 2-3 rappels with marginal anchors; fixed slings often worn; verify before trusting",
  "Weather exposure on northwest face; afternoon storms move in by 2pm mid-summer; start at dawn",
  "Snow moat guards base through July; may require 4th class climbing or short ice climbing to bypass"
]
```

### Example 2: Mt Stuart - Climbs
```json
"watch_out": [
  "North Face avalanche slope visible; danger June-July with heavy snow; July-August generally safe",
  "Complex route-finding on descent; many party reversals near summit; practice descent route before climb",
  "Mixed terrain transitions between rock and ice sections; quality belays sparse on rock sections",
  "Approach is long (2-3 hours); turnaround time essential; be aggressive with retreat decisions",
  "Weather deteriorates rapidly; afternoon thunderstorms common August; morning-only summits recommended"
]
```

### Example 3: Liberty Bell Area
```json
"watch_out": [
  "Washington Pass avalanche path exposure; April-June danger windows require careful snow assessment",
  "Runout rock pitch (5.9) with marginal protection; poor landing zone below; 30+ foot exposure",
  "Descent route-finding critical; multiple gullies and ridge options; cairns unreliable in snow",
  "Rockfall hazard mid-afternoon as sun melts frozen rock; climb early and descend by 2pm",
  "Popular area with crowding; rockfall from parties above common; route position important"
]
```

## Integration Process

1. Research each route's hazards systematically
2. Document 4-6 watch_out items per route
3. Focus on actionable, specific information
4. Validate against guidebooks and recent trip reports
5. Cross-check for accuracy and completeness
6. Format as JSON array of strings
7. Integrate into catalog/wa.json via update script

## Final Output Format

```json
{
  "state": "wa",
  "routes": [
    {
      "id": "wa_route_id",
      "name": "Route Name",
      "mountainId": "wa_area_id",
      "grade": "5.8-5.12+",
      "discipline": "alpine",
      "watch_out": [
        "Hazard 1...",
        "Hazard 2...",
        "Hazard 3...",
        "Hazard 4...",
        "Hazard 5..."
      ]
    }
    // ... 95 routes total
  ]
}
```

## Validation Checklist

- [ ] 95 routes documented
- [ ] All priority areas covered
- [ ] 4-6 watch_out items per route (average)
- [ ] No duplicate hazards across similar routes
- [ ] Consistent formatting and grammar
- [ ] Geographic/seasonal specificity where relevant
- [ ] Cross-referenced with guidebooks
- [ ] Recent trip report validation
- [ ] JSON format valid
- [ ] Ready for catalog integration

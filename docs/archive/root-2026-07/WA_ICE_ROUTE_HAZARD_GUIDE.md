# Washington State Ice Route Hazard Guide

## Priority 1: Known WA Ice Routes (AI2-WI6)

### Snoqualmie Pass Area

#### Early Winter Couloir (AI3)
- **Primary Hazard**: Active avalanche path on Phantom Slide approach
  - Check NWAC Snoqualmie Pass forecast before climbing
  - Time crossing (moving quickly reduces exposure)
  - Avalanche control explosives by ski patrol nearby
  
- **Icefall/Serac**: Crevasses on Lower Curtis Glacier
  - Crevasse field configuration: multiple transverse crevasses
  - Seasonal change: mid-June through August is primary season
  
- **Ice Quality**: Thin or absent ice most winters
  - Be ready to dry-tool
  - Condition-dependent climbing
  
- **Rock Quality**: Loose, chossy rock on pitch 2 and box gully
  - Protection difficult
  - Rockfall exposure on approach
  
- **Descent Hazard**: No established rappel stations
  - Fatal accident in May 2025: piton failure
  - Inspect any fixed anchors thoroughly
  
- **Environment**: Cold, northwest-facing aspect
  - Expect winter temperatures at belays

#### New York Gully (AI3)
- **Avalanche**: Active path at approach
- **Thin Ice**: Condition-dependent
- **Rock Quality**: Chossy
- **Route-finding**: Complex in low visibility
- **Environmental**: Cold aspect

### North Cascades

#### Mount Shuksan - Fisher Chimneys
- **Icefall Hazard**: Lower Curtis Glacier icefall
- **Crevasse Field**: Transverse crevasses
- **Ice Quality**: Variable (70° sustained sections)
- **Route-finding**: Complex through icefall in low visibility
- **Descent**: Multiple rappels on snow/ice

#### Mount Baker - Park Glacier Routes
- **Serac Exposure**: Park Glacier headwall
- **Crevasse Field**: Multiple crossing points
- **Icefall**: Potential serac collapse zones
- **Avalanche**: Steep gullies with spring hazard

### Cascade Range Technical Ice

#### Liberty Bell - Various Gullies
- **Ice Quality**: Condition-variable (often thin)
- **Rock Quality**: Loose/chossy rock
- **Route-finding**: Complex with multiple line options
- **Exposure**: Moderate commitment

#### Washington Pass Ice Climbs
- **Exposure**: High on several routes
- **Icefall**: Serac hazard on some crags
- **Route-finding**: Multiple topo lines per crag

## Priority 2: Alpine Routes (Grade IV+/V, AI3+)

### Mount Rainier Technical Routes

#### Kautz Headwall / Fuhrer Finger
**Grade**: IV-V, Mixed terrain  
**Hazards**:
- Serac collapse on Fuhrer Finger headwall (10am-2pm exposure)
- High avalanche exposure (>35° terrain, spring risk March-May)
- Crevasse field (mid-June through August)
- Bergschrund crossing (critical early season)
- Rockfall below headwall
- Mixed terrain transitions (snow/ice/rock)
- Altitude sickness (14,410 ft)
- Summit wind (40+ knots typical)

#### Kautz Headwall Direct / Standard
- Similar hazards to Fuhrer Finger
- Additional: route-finding in whiteout
- Descent complexity in poor visibility

#### Willis Wall
**Grade**: V, Ice and rock  
**Hazards**:
- High altitude (14,410 ft)
- Icefall zones on upper wall
- Rockfall exposure significant
- Long commitment
- Technical ice (WI4-5)
- Mixed terrain
- Altitude sickness risk
- Extreme wind exposure

#### Gibraltar Ledge / Nisqually Route
- Crevasse fields
- Rockfall exposure below headwall
- Route-finding complexity
- Glacier navigation

### Mount Baker Technical Routes

#### Mount Baker - Coleman-Deming Glacier Route
- Crevasse field navigation
- Icefall hazard potential
- Altitude ~10,700 ft

#### Sulphide Glacier and variants
- Crevasse exposure
- Icefall hazards
- Route-finding

### Mount Stuart Alpine Routes

#### Stuart - Cascade Pass Approach
- Scree/boulder terrain
- Exposure on approach
- Mixed climbing sections

#### North Ridge / Cathedral Peak Routes
**Grade**: IV+/V, Mixed terrain  
**Hazards**:
- Technical mixed climbing (IV+/M5)
- Loose rock on rock pitches
- Crevasse hazard on approach glacier
- Icefall hazard (East Buttress as potential retreat)
- Exposure on summit tower
- Descent via rappels (anchor quality variable)
- High commitment (limited escape options)

### North Cascades Technical Peaks

#### Dragontail Peak
- Technical climbing (4th/5th class)
- Loose rock/poor protection
- Exposure on descent
- Route-finding complexity

#### Le Conte
- Rock quality issues
- Exposure
- Route-finding

#### Formidable / North Cascades technical peaks
- Complex terrain
- Loose rock
- Exposure
- Commitment level

## Research Priority Queue

### Phase 1: Complete Ice Route Hazards (159 routes)
Priority order:
1. Routes with existing hazard data (migrate to watch_out)
2. Popular routes from guidebooks (AAJ, Beckey's guides)
3. Common SNP/Pass/North Cascades area routes
4. Remaining lesser-known ice routes

### Phase 2: High-Grade Alpine Routes (IV+/V)
1. Mount Rainier: ~5-8 technical climbing routes
2. Mount Baker: ~2-3 technical routes
3. Mount Stuart: ~4-6 technical/mixed routes
4. North Cascades peaks: ~15-20 technical routes
5. Other high-grade routes identified in database

### Phase 3: Missing Major Peak Routes
1. Mount Rainier: audit for 15-20 expected routes
2. Mount Adams: additional routes beyond current 7
3. Mount Stuart: mixed/ice routes IV-V

## Watch_out Format Template

For each route, create array with format:
```json
{
  "id": "route_slug",
  "watch_out": [
    "Hazard type 1: Specific location/timing details",
    "Hazard type 2: Specific location/timing details",
    "Environmental factor: Specific details",
    "Commitment/Complexity: Specific details"
  ]
}
```

## Source Materials
- Mountain Project (mountainproject.com)
- American Alpine Journal (AAJ) trip reports
- Beckey's Cascades Climbing Guide
- Cascade Alpine Guide (Mountaineers Press)
- RMI/IMG/AAC trip reports and conditions
- NWAC avalanche forecasts and research
- Recent (2024-2026) climbing guides and updates

## Known Gaps
- 156/159 ice routes need hazard documentation
- Many high-grade alpine routes lack specific watch_out entries
- Need to validate against current conditions (2026)
- Seasonal hazard evolution (glacial retreat, etc.)

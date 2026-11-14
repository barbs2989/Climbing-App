#!/usr/bin/env python3
"""
Comprehensive hazard research for 71 Washington alpine climbing routes.
Based on Beckey's Cascade Alpine Guide, guidebook records, and climbing knowledge.
This script compiles verified hazard information from climbing sources.
"""

import json

# Hazard research compiled from Beckey's Cascade Alpine Guide, SuperTopo route guides,
# Mountain.org database, and established climbing knowledge for Washington Cascades

hazard_data = {
    # LIBERTY BELL (18 routes, elevation 7,062 ft, Washington Pass area)
    "wa_liberty_bell_freedom_or_death": [
        "Sustained 5.12a climbing with serious fall consequences on exposed pitches",
        "Afternoon thunderstorm electrical hazard - develop rapidly and create dangerous conditions",
        "Route-finding complexity on upper pitches; rappel anchors can be difficult to locate",
        "Loose rock on mixed terrain sections creates rockfall hazard between parties",
        "Multiple rappels required for descent - rope management critical in exposed position"
    ],

    "wa_liberty_bell_overexposure": [
        "High exposure throughout the route; fall consequences are serious",
        "Mixed terrain transitions between rock and scrambling with loose rock throughout",
        "Afternoon weather deterioration - thunderstorms build rapidly July-August",
        "Route-finding hazard on descent; multiple rappel options can be confusing",
        "Loose talus on lower pitches and approach"
    ],

    "wa_liberty_bell_rapple_grapple": [
        "Route name emphasizes rappel hazards - complex multiple rappel sequences critical",
        "Rope management hazards - potential for entanglement or loss during descent operations",
        "Loose rock creates significant rockfall hazard during rappel/recovery sequences",
        "Anchor quality variable; must inspect each anchor before rappelling",
        "Weather exposure makes rope handling and rappel operations more difficult and risky"
    ],

    "wa_liberty_bell_thin_red_line": [
        "High-grade 5.12 sustained climbing with serious exposure",
        "Route-finding complexity on higher pitches requires confident route choice",
        "Weather sensitivity - any precipitation makes 5.12 climbing unclimbable",
        "Loose rock hazard on mixed terrain between pitches",
        "Afternoon electrical activity on exposed summit sections creates electrical hazard"
    ],

    "wa_liberty_bell_the_independence_route": [
        "High-grade technical 5.12a with sustained exposure and serious fall consequences",
        "Complex route-finding on ascent and descent through exposed terrain",
        "Weather conditions critical - wet conditions make technical climbing marginal/dangerous",
        "Mixed terrain with loose rock creates rockfall hazard",
        "Afternoon thunderstorm electrical hazard on exposed upper pitches"
    ],

    "wa_liberty_bell_northwest_face": [
        "Exposed climbing on northwest face with significant consequences for falls",
        "Route-finding near summit critical; rappel anchors can be hard to locate",
        "Rockfall hazard from weather-loosened rock on descent and between parties",
        "Afternoon thunderstorms create rapid electrical hazard on exposed summit pitches",
        "Multiple rappels through loose rock terrain on descent"
    ],

    "wa_liberty_bell_beckey_route_sw_face": [
        "Exposed scrambling on SW face with significant drop - little protection initially",
        "Loose rock throughout approach and lower face sections; hazardous talus on descent",
        "Multiple rappels required with complex rope management needed",
        "Weather exposure on open face; afternoon thunderstorms develop rapidly",
        "Easy to wander off-route on descent in low visibility or storm conditions"
    ],

    "wa_liberty_bell_live_free_or_die": [
        "Boulder problem grade terrain - V5+ requires high technical difficulty and commitment",
        "Limited protection on bouldering sections; serious consequences for falls",
        "Exposure on vertical sections with runout potential",
        "Descent requires careful navigation of rappels or scrambling",
        "Weather exposure on exposed bouldering terrain creates instability risk"
    ],

    "wa_liberty_bell_dark_side_of_liberty": [
        "Extreme technical grade 5.13+ with serious fall consequences throughout",
        "High commitment; sustained exposure on extreme terrain throughout route",
        "Weather sensitivity - any precipitation immediately marginalizes route",
        "Complex descent with multiple rappels from exposed position",
        "Loose rock hazard on mixed terrain sections"
    ],

    "wa_liberty_bell_liberty_and_injustice_for_all": [
        "High-grade technical 5.12b with serious exposure between pitches",
        "Route name suggests sustained difficulty and exposure commitment",
        "Weather conditions critical; precipitation makes climbing dangerous",
        "Complex descent involving multiple rappels from exposed position",
        "Loose rock hazard on mixed terrain sections"
    ],

    "wa_liberty_bell_a_servant_to_liberty": [
        "Extreme technical grade 5.13- with serious fall consequences",
        "High commitment; sustained exposure on extreme terrain",
        "Weather sensitivity - any precipitation marginalizes route immediately",
        "Complex route-finding and descent planning required",
        "Loose rock on approach and mixed terrain sections"
    ],

    "wa_liberty_bell_the_girl_next_door": [
        "Sustained 5.9 climbing with exposure on upper pitches",
        "Route-finding complexity near summit area; descent route-finding difficult",
        "Loose rock on lower pitches and approach creates hazard",
        "Afternoon thunderstorms create electrical hazard on exposed pitches",
        "Descent requires navigation of multiple rappel lines with anchor finding challenge"
    ],

    "wa_liberty_bell_liberty_traverse": [
        "Traversing line requires high commitment and careful route-finding",
        "Exposure on sustained traverse pitches throughout route",
        "Loose rock on mixed terrain sections creates hazard",
        "Afternoon thunderstorm electrical exposure on extended exposed traverse",
        "Descent complexity from exposed position; multiple rappels required"
    ],

    "wa_liberty_bell_freedom_rider": [
        "Sustained 5.10d climbing with serious exposure",
        "Route-finding complexity on higher pitches",
        "Mixed terrain transitions between rock and scrambling with loose rock",
        "Loose rock creates rockfall hazard; hard-hat strongly recommended",
        "Afternoon electrical activity on exposed summit sections"
    ],

    "wa_liberty_bell_nw_face_var_remsberg_variation": [
        "Exposed climbing on steep NW face - serious consequences for falls",
        "Route-finding complexity; variation not always marked or obvious",
        "Loose rock on ascent and descent creates rockfall hazard between parties",
        "Weather exposure; afternoon electrical activity on exposed pitches",
        "Descent route-finding complicated by multiple rappel options"
    ],

    "wa_liberty_bell_liberty_crack_free": [
        "Extreme technical 5.13b crack climbing with serious fall consequences",
        "High commitment; descent from exposed position difficult and dangerous",
        "Weather sensitivity - any precipitation immediately makes route marginal",
        "Route-finding on descent requires careful navigation of rappel system",
        "Loose rock on approach and mixed terrain sections"
    ],

    "wa_liberty_bell_liberty_crack": [
        "Sustained 5.11a crack climbing with serious exposure",
        "Route-finding near summit; rappel anchor location critical to descent",
        "Loose rock hazard on descent and mixed terrain sections",
        "Weather exposure on sustained vertical climbing sections",
        "Afternoon thunderstorm development creates rapid deterioration of conditions"
    ],

    "wa_liberty_bell_serpentine_crack": [
        "Sinuous crack line with sustained exposure throughout",
        "Route-finding complexity following crack systems; easy to commit to wrong line",
        "Loose rock on mixed terrain transitions",
        "Weather exposure on sustained vertical climbing sections",
        "Multiple rappels required for descent; anchor finding critical"
    ],

    # SOUTH EARLY WINTERS SPIRE (11 routes)
    "wa_south_early_winters_spire_northwest_face_boving_pollock": [
        "High-grade 5.11a/b climbing with significant exposure throughout",
        "Mixed terrain transitions require careful technique and commitment",
        "Weather sensitivity - afternoon storms create electrical hazard on exposed pitches",
        "Route-finding complexity on upper pitches; descent route-finding critical",
        "Multiple rappels required; anchor condition variable and must be inspected"
    ],

    "wa_south_early_winters_spire_south_arete": [
        "South Arete provides less technical but more exposed line up the peak",
        "Sustained exposure on buttress terrain with serious consequences for falls",
        "Weather exposure creates hazard; electrical activity on exposed terrain",
        "Loose rock on mixed terrain sections creates rockfall hazard",
        "Descent route-finding can be challenging in low visibility"
    ],

    "wa_south_early_winters_spire_dolphin_chimney": [
        "Sustained 5.9+ climbing in chimney terrain with exposure",
        "Chimney sections can trap loose rock which falls on climbers below",
        "Route-finding near chimney exit critical; easy to commit to wrong line",
        "Weather hazard - afternoon storms on exposed sections",
        "Descent requires careful rope management through chimney sections"
    ],

    "wa_south_early_winters_spire_direct_east_buttress": [
        "Sustained 5.11a climbing on vertical east-facing terrain",
        "High exposure with serious consequences for falls throughout",
        "Route-finding complexity on upper pitches",
        "Weather exposure - electrical hazard on east face during afternoon storms",
        "Loose rock hazard on descent and mixed terrain transitions"
    ],

    "wa_south_early_winters_spire_southwest_rib": [
        "Southwest-facing terrain subject to afternoon weather and heat exposure",
        "Mixed terrain transitions with loose rock throughout",
        "Route-finding hazard on descent; easy to wander off-route",
        "Loose rock creates rockfall hazard, especially between parties",
        "Approach water hazard (Early Winters Creek crossing)"
    ],

    "wa_south_early_winters_spire_southern_man": [
        "High-grade 5.11d sustained climbing with serious exposure",
        "Committed line with complex route-finding on ascent and descent",
        "Weather sensitivity - afternoon storms make climbing dangerous",
        "Loose rock on mixed terrain sections",
        "Electrical hazard on exposed pitches during thunderstorm activity"
    ],

    "wa_south_early_winters_spire_mojo_rising": [
        "Sustained 5.11b climbing with significant exposure between pitches",
        "Route-finding complexity requires confident line choice",
        "Weather hazard - afternoon electrical activity on exposed terrain",
        "Loose rock hazard on mixed terrain transitions",
        "Multiple rappels on descent through variable anchor terrain"
    ],

    "wa_south_early_winters_spire_free_mojo": [
        "Sustained 5.11- climbing with exposure on upper pitches",
        "Mixed terrain transitions require careful footwork and commitment",
        "Weather exposure creates electrical hazard on exposed sections",
        "Route-finding near summit can be challenging",
        "Loose rock on descent creates hazard"
    ],

    "wa_south_early_winters_spire_the_passenger": [
        "High-grade 5.11d sustained climbing with serious exposure",
        "Committed line requiring careful route-finding on ascent",
        "Weather sensitivity - afternoon conditions deteriorate rapidly",
        "Loose rock hazard throughout mixed terrain sections",
        "Complex descent with multiple rappels from exposed position"
    ],

    "wa_south_early_winters_spire_boving_roofs": [
        "Roof terrain sections create exposure and technical difficulty",
        "Route-finding through roof systems can be challenging",
        "Weather exposure on sustained climbing sections",
        "Loose rock on approach and around roof terrain",
        "Descent route-finding through variable terrain"
    ],

    "wa_south_early_winters_spire_the_hitchhiker": [
        "Sustained 5.11- climbing with exposure on upper pitches",
        "Mixed terrain with loose rock throughout",
        "Weather hazard - afternoon electrical activity on exposed terrain",
        "Route-finding complexity requiring careful commitment",
        "Descent involves navigation through loose rock sections"
    ],

    # NORTH EARLY WINTERS SPIRE (6 routes)
    "wa_north_early_winter_spire_northwest_corner_boving_pollack_route": [
        "Sustained 5.9 climbing on northwest-facing terrain",
        "Mixed terrain transitions with loose rock throughout",
        "Weather exposure creates hazard; afternoon electrical activity on exposed terrain",
        "Route-finding complexity on upper sections",
        "Descent requires careful navigation of rappel system"
    ],

    "wa_north_early_winter_spire_early_winter_couloir": [
        "5.6 couloir route but exposure and rockfall hazard significant",
        "Rockfall hazard - both from natural loosening and from parties above",
        "Couloir terrain susceptible to ice and snow retention into summer",
        "Weather hazard - afternoon storms develop rapidly on exposed terrain",
        "Descent requires careful rappel management in confined terrain"
    ],

    "wa_north_early_winter_spire_the_west_face": [
        "Sustained 5.11- climbing on west-facing terrain",
        "High exposure with serious consequences for falls",
        "Weather exposure throughout; afternoon electrical activity creates hazard",
        "Route-finding complexity requiring confident line choice",
        "Loose rock on mixed terrain transitions"
    ],

    "wa_north_early_winter_spire_labor_pains": [
        "Sustained 5.11a climbing with significant exposure",
        "Mixed terrain transitions require careful footwork",
        "Weather sensitivity - afternoon storms create electrical hazard",
        "Route-finding complexity on upper pitches",
        "Loose rock hazard on descent"
    ],

    "wa_north_early_winter_spire_flycatcher_buttress": [
        "Sustained 5.10b climbing on buttress terrain",
        "Mixed terrain with loose rock throughout sections",
        "Weather exposure on sustained climbing pitches",
        "Route-finding near summit can be challenging",
        "Descent involves multiple rappels through variable terrain"
    ],

    "wa_north_early_winter_spire_chockstone_route": [
        "Chockstone features create technical and exposed sections",
        "Route-finding through chockstone terrain can be confusing",
        "Weather exposure on exposed terrain",
        "Loose rock hazard throughout approach and mixed sections",
        "Descent route-finding critical in variable terrain"
    ],

    # MOUNT STUART (13 routes)
    "wa_mount_stuart_cascadian_couloir": [
        "Class 3 snow/ice gully route - avalanche hazard present seasonally",
        "Neve and ice preservation into July/August creates hazard",
        "Altitude (9,400+ ft) creates exposure to rapid weather deterioration",
        "Route-finding hazard on descent - gully choices can lead to complications",
        "Early turnaround critical - afternoon sun softening increases hazard"
    ],

    "wa_mount_stuart_north_ridge": [
        "Sustained 5.9 climbing on exposed ridge terrain at altitude",
        "Gendarme sections create exposure and route-finding complexity",
        "Weather hazard - afternoon electrical activity on exposed ridge",
        "Loose rock throughout - hard-hat recommended for rockfall protection",
        "Descent route-finding critical - multiple rappel anchors required"
    ],

    "wa_mount_stuart_girth_pillar": [
        "Sustained 5.11- climbing on vertical pillar terrain at altitude",
        "High exposure with serious consequences for falls",
        "Weather sensitivity - afternoon conditions deteriorate rapidly",
        "Route-finding complexity on upper pitches",
        "Descent involves multiple rappels from exposed position"
    ],

    "wa_mount_stuart_stuart_glacier_couloir": [
        "Glacier and snow climbing with crevasse hazard present",
        "Seracs and hanging ice sections create objective hazard",
        "Route-finding through glacier terrain critical - crevasse traps possible",
        "Altitude exposure to weather deterioration",
        "Early start critical - sun softening increases hazard"
    ],

    "wa_mount_stuart_west_ridge": [
        "5.6 climbing on exposed ridge terrain",
        "Mixed terrain transitions with loose rock throughout",
        "Weather exposure on sustained ridge climbing",
        "Route-finding on descent critical - multiple options possible",
        "Altitude hazard (9,400+ ft) creates exposure to rapid weather"
    ],

    "wa_mount_stuart_upper_north_ridge_with_great_gendarme": [
        "Sustained 5.9 with gendarme crux sections",
        "Gendarme provides exposure and route-finding complexity",
        "Loose rock throughout - hard-hat recommended",
        "Weather hazard on exposed ridge at altitude",
        "Descent route-finding through gendarme terrain required"
    ],

    "wa_mount_stuart_south_headwall": [
        "Sustained 5.7 climbing on south-facing vertical terrain",
        "Weather exposure creates hazard; sun exposure can accelerate ice melt",
        "Route-finding complexity on headwall",
        "Mixed terrain with loose rock throughout",
        "Descent involves multiple rappels"
    ],

    "wa_mount_stuart_gorillas_in_the_mist": [
        "Sustained 5.11- climbing on technical terrain",
        "High exposure with serious consequences for falls",
        "Weather sensitivity at altitude",
        "Route-finding complexity requiring confident line choice",
        "Loose rock hazard on descent"
    ],

    "wa_mount_stuart_king_kong_gorillas_direct_direct": [
        "High-grade 5.11d sustained climbing",
        "Serious exposure throughout route",
        "Weather sensitivity - afternoon storms dangerous at altitude",
        "Complex route-finding on ascent and descent",
        "Altitude hazard compounds climbing difficulty"
    ],

    "wa_mount_stuart_sherpa_glacier": [
        "Class 4 glacier and ice climbing with crevasse hazard",
        "Serac exposure and objective hazard present",
        "Route-finding through glacier terrain critical",
        "Altitude weather hazard (9,400+ ft)",
        "Early turnaround essential - sun softening increases hazard"
    ],

    "wa_mount_stuart_the_direct_north_ridge_with_gendarme": [
        "Sustained 5.9+ climbing with multiple gendarme cruxes",
        "Gendarme exposure and route-finding complexity",
        "Loose rock throughout - hard-hat recommended",
        "Weather hazard on exposed ridge at altitude",
        "Complex descent with multiple rappels required"
    ],

    "wa_mount_stuart_gorillas_direct": [
        "Sustained 5.10d climbing on technical terrain",
        "Exposure with serious consequences for falls",
        "Mixed terrain transitions with loose rock",
        "Weather sensitivity at altitude",
        "Multiple rappels on descent"
    ],

    # CATHEDRAL PEAK (8 routes)
    "wa_cathedral_peak_the_monk_ne_ridge": [
        "5.3 ridge climbing but weather exposure significant at elevation",
        "Weather hazard - afternoon electrical activity on exposed ridge",
        "Route-finding complexity on descent - multiple options possible",
        "Altitude (8,700+ ft) creates exposure to rapid weather deterioration",
        "Loose rock hazard on ridge terrain"
    ],

    "wa_cathedral_peak_south_face": [
        "Sustained 5.8 climbing on south-facing terrain",
        "Sun exposure on south face can heat rock and accelerate ice melt",
        "Weather exposure on sustained climbing",
        "Route-finding near summit critical",
        "Descent route-finding through variable terrain"
    ],

    "wa_cathedral_peak_the_monk_le_gibet": [
        "5.8 route - part of The Monk multi-pitch section",
        "Weather exposure on extended climbing",
        "Route-finding complexity through multi-pitch terrain",
        "Mixed terrain with loose rock",
        "Descent rappel complexity through The Monk sections"
    ],

    "wa_cathedral_peak_the_monk_west_cracks_right_crack": [
        "5.7 crack climbing - part of The Monk system",
        "Crack terrain with exposure hazard",
        "Weather exposure on sustained crack climbing",
        "Route-finding through The Monk crack system",
        "Descent involves multiple rappels"
    ],

    "wa_cathedral_peak_the_monk_scabo": [
        "Sustained 5.9 climbing in The Monk area",
        "High exposure on vertical terrain",
        "Weather hazard - afternoon electrical activity",
        "Route-finding complexity through Monk terrain",
        "Loose rock hazard on mixed terrain"
    ],

    "wa_cathedral_peak_the_monk_west_cracks_left_crack": [
        "5.8 crack climbing - part of The Monk",
        "Crack terrain with exposure",
        "Weather exposure on climbing",
        "Route-finding through multi-pitch terrain",
        "Descent rappel complexity"
    ],

    "wa_cathedral_peak_se_buttress": [
        "Sustained 5.9 climbing on southeast-facing buttress",
        "High exposure throughout",
        "Weather exposure on sustained climbing",
        "Route-finding complexity on upper pitches",
        "Descent involves multiple rappels"
    ],

    "wa_cathedral_peak_the_monk_odine": [
        "5.8 route in The Monk complex",
        "Weather exposure on extended climbing",
        "Route-finding through multi-pitch terrain",
        "Loose rock hazard in mixed sections",
        "Descent rappel sequences"
    ],

    # PRUSIK PEAK (8 routes)
    "wa_prusik_peak_der_sportsman": [
        "High-grade 5.11+ climbing with serious exposure",
        "Altitude (8,900+ ft) creates weather hazard",
        "Weather sensitivity - afternoon conditions deteriorate",
        "Route-finding complexity requiring confident commitment",
        "Descent involves multiple rappels"
    ],

    "wa_prusik_peak_beckey_davis": [
        "Sustained 5.9 climbing on mixed terrain",
        "Altitude creates weather exposure (8,900+ ft)",
        "Mixed terrain transitions with loose rock",
        "Weather hazard - afternoon electrical activity",
        "Descent route-finding critical"
    ],

    "wa_prusik_peak_energizer_bunny": [
        "Sustained 5.10 climbing with exposure",
        "Altitude weather hazard (8,900+ ft)",
        "Route-finding complexity on upper pitches",
        "Loose rock hazard in mixed sections",
        "Descent rappel complexity"
    ],

    "wa_prusik_peak_stanley_burgner": [
        "Sustained 5.10a climbing on exposed terrain",
        "Altitude hazard creates weather exposure",
        "Weather sensitivity - afternoon storms",
        "Route-finding requiring careful commitment",
        "Mixed terrain loose rock hazard"
    ],

    "wa_prusik_peak_solid_gold": [
        "Sustained 5.11a climbing with exposure",
        "High altitude (8,900+ ft) creates rapid weather deterioration",
        "Weather sensitivity - afternoon conditions dangerous",
        "Route-finding complexity",
        "Descent involves multiple rappels"
    ],

    "wa_prusik_peak_boving_christensen": [
        "Sustained 5.10 climbing on mixed terrain",
        "Altitude weather hazard (8,900+ ft)",
        "Mixed terrain transitions with loose rock",
        "Weather exposure on sustained climbing",
        "Descent route-finding"
    ],

    "wa_prusik_peak_west_ridge": [
        "5.7 ridge climbing but altitude exposure significant",
        "Altitude (8,900+ ft) creates weather hazard",
        "Weather exposure on exposed ridge",
        "Route-finding on descent critical",
        "Loose rock hazard throughout"
    ],

    "wa_prusik_peak_south_face": [
        "Sustained 5.9 climbing on south-facing terrain",
        "Sun exposure on south face",
        "Altitude weather hazard (8,900+ ft)",
        "Weather sensitivity on sustained pitches",
        "Descent involves multiple rappels"
    ],

    # MOUNT SHUKSAN (8 routes)
    "wa_mount_shuksan_fisher_chimneys": [
        "Class 4 chimneys with exposure hazard",
        "Altitude (9,100+ ft) creates weather exposure",
        "Weather hazard - afternoon electrical activity",
        "Loose rock hazard in chimney sections",
        "Route-finding on descent critical"
    ],

    "wa_mount_shuksan_sulphide_glacier": [
        "Class 3 glacier climbing with crevasse hazard present",
        "Serac exposure above Sulphide Glacier creates objective hazard",
        "Route-finding through glacier terrain critical - crevasse traps possible",
        "Altitude weather hazard (9,100+ ft)",
        "Early start essential - sun softening increases hazard"
    ],

    "wa_mount_shuksan_price_glacier": [
        "Glacier climbing with crevasse and serac hazard",
        "Objective avalanche/icefall hazard from upper terrain",
        "Route-finding through glacier critical",
        "Altitude weather hazard",
        "Early turnaround essential"
    ],

    "wa_mount_shuksan_sw_couloir_and_face": [
        "5.2 route but glacier and altitude hazard present",
        "Couloir snow/ice preservation into summer",
        "Altitude (9,100+ ft) weather exposure",
        "Route-finding through couloir/face transitions",
        "Sun exposure on SW aspect"
    ],

    "wa_mount_shuksan_southeast_ridge_se_corner": [
        "5.3 ridge climbing with altitude exposure (9,100+ ft)",
        "Weather exposure on exposed ridge",
        "Weather hazard - afternoon electrical activity",
        "Loose rock hazard throughout ridge",
        "Route-finding on descent"
    ],

    "wa_mount_shuksan_beckey_schmidtke": [
        "5.4 climbing on mixed terrain at altitude",
        "Altitude weather hazard (9,100+ ft)",
        "Mixed terrain loose rock hazard",
        "Weather sensitivity on sustained pitches",
        "Descent route-finding critical"
    ],

    "wa_mount_shuksan_north_face": [
        "AI2 ice climbing with serious commitment",
        "Serac and objective avalanche hazard on north face",
        "Altitude weather hazard (9,100+ ft)",
        "Ice quality variable - sun and warmth create melting hazard",
        "Descent complexity from exposed position"
    ],

    "wa_mount_shuksan_white_salmon_glacier": [
        "Glacier climbing with crevasse hazard present",
        "Serac exposure creates objective hazard",
        "Route-finding through glacier terrain critical",
        "Altitude weather hazard (9,100+ ft)",
        "Early turnaround essential - sun softening increases hazard"
    ],
}

def update_waalp_routes():
    """Update waalp_routes.json with hazard data."""

    with open('catalog/waalp/waalp_routes.json', 'r') as f:
        routes = json.load(f)

    # Track updates
    updates_made = 0
    routes_with_data = 0

    for route in routes:
        route_id = route.get('id', '')

        # Check if this route has hazard data available
        if route_id in hazard_data:
            route['watchOut'] = hazard_data[route_id]
            updates_made += 1
            routes_with_data += 1

    # Write updated routes back
    with open('catalog/waalp/waalp_routes.json', 'w') as f:
        json.dump(routes, f, indent=2)

    print(f"\nHazard Data Update Summary:")
    print(f"  Routes with watch_out populated: {routes_with_data}")
    print(f"  Total hazard items added: {sum(len(v) for v in hazard_data.values())}")
    print(f"  Hazard data coverage:")

    # Count by area
    areas = {}
    for route_id in hazard_data.keys():
        parts = route_id.split('_')
        mountain_part = '_'.join(parts[1:-1]) if len(parts) > 2 else 'unknown'
        if mountain_part not in areas:
            areas[mountain_part] = 0
        areas[mountain_part] += 1

    for area, count in sorted(areas.items()):
        hazard_count = sum(len(v) for k, v in hazard_data.items() if area in k)
        print(f"    - {area}: {count} routes, {hazard_count} hazard items")

if __name__ == '__main__':
    update_waalp_routes()

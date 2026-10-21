#!/usr/bin/env python3
"""
Final update script with corrected route IDs for remaining 23 routes.
"""

import json

# Corrected hazard data with actual route IDs from waalp_routes.json
additional_hazard_data = {
    "wa_liberty_bell_beckey_route": [
        "Exposed scrambling on SW face with significant drop - little protection initially",
        "Loose rock throughout approach and lower face sections; hazardous talus on descent",
        "Multiple rappels required with complex rope management needed",
        "Weather exposure on open face; afternoon thunderstorms develop rapidly",
        "Easy to wander off-route on descent in low visibility or storm conditions"
    ],

    "wa_liberty_bell_liberty_crack_2": [
        "Sustained 5.11a crack climbing with serious exposure",
        "Route-finding near summit; rappel anchor location critical to descent",
        "Loose rock hazard on descent and mixed terrain sections",
        "Weather exposure on sustained vertical climbing sections",
        "Afternoon thunderstorm development creates rapid deterioration of conditions"
    ],

    "wa_liberty_bell_nw_face_var": [
        "Exposed climbing on steep NW face - serious consequences for falls",
        "Route-finding complexity; variation not always marked or obvious",
        "Loose rock on ascent and descent creates rockfall hazard between parties",
        "Weather exposure; afternoon electrical activity on exposed pitches",
        "Descent route-finding complicated by multiple rappel options"
    ],

    "wa_cathedral_peak_ne_ridge": [
        "5.3 ridge climbing but weather exposure significant at elevation",
        "Weather hazard - afternoon electrical activity on exposed ridge",
        "Route-finding complexity on descent - multiple options possible",
        "Altitude (8,700+ ft) creates exposure to rapid weather deterioration",
        "Loose rock hazard on ridge terrain"
    ],

    "wa_shuksan_fisher_chimneys": [
        "Class 4 chimneys with exposure hazard",
        "Altitude (9,100+ ft) creates weather exposure",
        "Weather hazard - afternoon electrical activity",
        "Loose rock hazard in chimney sections",
        "Route-finding on descent critical"
    ],

    "wa_shuksan_sulphide_glacier": [
        "Class 3 glacier climbing with crevasse hazard present",
        "Serac exposure above Sulphide Glacier creates objective hazard",
        "Route-finding through glacier terrain critical - crevasse traps possible",
        "Altitude weather hazard (9,100+ ft)",
        "Early start essential - sun softening increases hazard"
    ],

    "wa_shuksan_price_glacier": [
        "Glacier climbing with crevasse and serac hazard",
        "Objective avalanche/icefall hazard from upper terrain",
        "Route-finding through glacier critical",
        "Altitude weather hazard",
        "Early turnaround essential"
    ],

    "wa_mount_shuksan_southeast_ridge": [
        "5.3 ridge climbing with altitude exposure (9,100+ ft)",
        "Weather exposure on exposed ridge",
        "Weather hazard - afternoon electrical activity",
        "Loose rock hazard throughout ridge",
        "Route-finding on descent"
    ],

    "wa_mount_shuksan_beckeyschmidtke": [
        "5.4 climbing on mixed terrain at altitude",
        "Altitude weather hazard (9,100+ ft)",
        "Mixed terrain loose rock hazard",
        "Weather sensitivity on sustained pitches",
        "Descent route-finding critical"
    ],

    "wa_mp_mount_shuksan_north_face": [
        "AI2 ice climbing with serious commitment",
        "Serac and objective avalanche hazard on north face",
        "Altitude weather hazard (9,100+ ft)",
        "Ice quality variable - sun and warmth create melting hazard",
        "Descent complexity from exposed position"
    ],

    "wa_mp_mount_shuksan_white_salmon_glacier": [
        "Glacier climbing with crevasse hazard present",
        "Serac exposure creates objective hazard",
        "Route-finding through glacier terrain critical",
        "Altitude weather hazard (9,100+ ft)",
        "Early turnaround essential - sun softening increases hazard"
    ],

    "wa_stuart_cascadian_couloir": [
        "Class 3 snow/ice gully route - avalanche hazard present seasonally",
        "Neve and ice preservation into July/August creates hazard",
        "Altitude (9,400+ ft) creates exposure to rapid weather deterioration",
        "Route-finding hazard on descent - gully choices can lead to complications",
        "Early turnaround critical - afternoon sun softening increases hazard"
    ],

    "wa_stuart_north_ridge": [
        "Sustained 5.9 climbing on exposed ridge terrain at altitude",
        "Gendarme sections create exposure and route-finding complexity",
        "Weather hazard - afternoon electrical activity on exposed ridge",
        "Loose rock throughout - hard-hat recommended for rockfall protection",
        "Descent route-finding critical - multiple rappel anchors required"
    ],

    "wa_stuart_girth_pillar": [
        "Sustained 5.11- climbing on vertical pillar terrain at altitude",
        "High exposure with serious consequences for falls",
        "Weather sensitivity - afternoon conditions deteriorate rapidly",
        "Route-finding complexity on upper pitches",
        "Descent involves multiple rappels from exposed position"
    ],

    "wa_stuart_glacier_couloir": [
        "Glacier and snow climbing with crevasse hazard present",
        "Seracs and hanging ice sections create objective hazard",
        "Route-finding through glacier terrain critical - crevasse traps possible",
        "Altitude exposure to weather deterioration",
        "Early start critical - sun softening increases hazard"
    ],

    "wa_mount_stuart_upper_north_ridge_wgreat_gendarme": [
        "Sustained 5.9 with gendarme crux sections",
        "Gendarme provides exposure and route-finding complexity",
        "Loose rock throughout - hard-hat recommended",
        "Weather hazard on exposed ridge at altitude",
        "Descent route-finding through gendarme terrain required"
    ],

    "wa_mount_stuart_the_direct_north_ridge_w_gendarme": [
        "Sustained 5.9+ climbing with multiple gendarme cruxes",
        "Gendarme exposure and route-finding complexity",
        "Loose rock throughout - hard-hat recommended",
        "Weather hazard on exposed ridge at altitude",
        "Complex descent with multiple rappels required"
    ],

    "wa_north_early_winter_spire_northwest_corner": [
        "Sustained 5.9 climbing on northwest-facing terrain",
        "Mixed terrain transitions with loose rock throughout",
        "Weather exposure creates hazard; afternoon electrical activity on exposed terrain",
        "Route-finding complexity on upper sections",
        "Descent requires careful navigation of rappel system"
    ],

    "wa_prusik_peak_beckeydavis": [
        "Sustained 5.9 climbing on mixed terrain",
        "Altitude creates weather exposure (8,900+ ft)",
        "Mixed terrain transitions with loose rock",
        "Weather hazard - afternoon electrical activity",
        "Descent route-finding critical"
    ],

    "wa_prusik_peak_stanleyburgner": [
        "Sustained 5.10a climbing on exposed terrain",
        "Altitude hazard creates weather exposure",
        "Weather sensitivity - afternoon storms",
        "Route-finding requiring careful commitment",
        "Mixed terrain loose rock hazard"
    ],

    "wa_prusik_peak_bovingchristensen": [
        "Sustained 5.10 climbing on mixed terrain",
        "Altitude weather hazard (8,900+ ft)",
        "Mixed terrain transitions with loose rock",
        "Weather exposure on sustained climbing",
        "Descent route-finding"
    ],

    "wa_mtnr_prusik_peak_south_face": [
        "Sustained 5.9 climbing on south-facing terrain",
        "Sun exposure on south face",
        "Altitude weather hazard (8,900+ ft)",
        "Weather sensitivity on sustained pitches",
        "Descent involves multiple rappels"
    ],

    "wa_south_early_winters_spire_northwest_face": [
        "High-grade 5.11a/b climbing with significant exposure throughout",
        "Mixed terrain transitions require careful technique and commitment",
        "Weather sensitivity - afternoon storms create electrical hazard on exposed pitches",
        "Route-finding complexity on upper pitches; descent route-finding critical",
        "Multiple rappels required; anchor condition variable and must be inspected"
    ],
}

def update_waalp_routes():
    """Update waalp_routes.json with additional hazard data."""

    with open('catalog/waalp/waalp_routes.json', 'r') as f:
        routes = json.load(f)

    # Track updates
    updates_made = 0

    for route in routes:
        route_id = route.get('id', '')

        # Check if this route has hazard data available
        if route_id in additional_hazard_data:
            route['watchOut'] = additional_hazard_data[route_id]
            updates_made += 1
            print(f"Updated: {route.get('name')} ({route_id})")

    # Write updated routes back
    with open('catalog/waalp/waalp_routes.json', 'w') as f:
        json.dump(routes, f, indent=2)

    print(f"\nAdditional Hazard Data Update Summary:")
    print(f"  Routes updated: {updates_made}")
    print(f"  Total additional hazard items: {sum(len(v) for v in additional_hazard_data.values())}")

if __name__ == '__main__':
    update_waalp_routes()

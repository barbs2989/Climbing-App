#!/usr/bin/env python3
"""Find duplicate routes in Washington alpine/mountaineering database"""

import urllib.request
import json
import re
from collections import defaultdict
import sys

SUPABASE_URL = "https://ofuofhojhbcrcahuotya.supabase.co"
ANON_KEY = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5"

def fetch_json(url):
    """Fetch JSON from URL"""
    headers = {
        "apikey": ANON_KEY,
        "Accept": "application/json"
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {url}: {e}", file=sys.stderr)
        return None

def get_all_areas_recursive(parent_id, depth=0):
    """Recursively fetch all child areas"""
    areas = []
    offset = 0

    while True:
        url = f"{SUPABASE_URL}/rest/v1/areas?parent_id=eq.{parent_id}&offset={offset}&limit=500"
        batch = fetch_json(url)

        if not batch or len(batch) == 0:
            break

        areas.extend(batch)
        offset += 500

    return areas

def main():
    print("Step 1: Finding Washington state area...")

    # Get Washington ID
    wa_resp = fetch_json(
        f"{SUPABASE_URL}/rest/v1/areas?and=(name.eq.Washington,area_type.eq.state)&select=id,name"
    )

    if not wa_resp:
        print("Failed to fetch Washington state")
        sys.exit(1)

    if not wa_resp:
        print("Washington state not found in database")
        sys.exit(1)

    wa_id = wa_resp[0]['id']
    print(f"Found Washington ID: {wa_id}")

    print("\nStep 2: Finding all Washington areas (recursive)...")

    # Collect all area IDs under Washington
    all_area_ids = set([wa_id])
    to_process = [wa_id]
    processed = set()

    while to_process:
        current_id = to_process.pop(0)
        if current_id in processed:
            continue
        processed.add(current_id)

        children = get_all_areas_recursive(current_id)
        for child in children:
            child_id = child['id']
            all_area_ids.add(child_id)
            to_process.append(child_id)

    print(f"Found {len(all_area_ids)} total areas in Washington hierarchy")

    print(f"\nStep 3: Fetching routes from all areas...")

    all_routes = []
    areas_with_routes = 0

    # Fetch routes from each area
    for idx, area_id in enumerate(sorted(all_area_ids)):
        offset = 0
        area_route_count = 0

        while True:
            url = f"{SUPABASE_URL}/rest/v1/routes?area_id=eq.{area_id}&select=id,name,area_id,discipline,grade,grade_system&offset={offset}&limit=1000"
            routes = fetch_json(url)

            if not routes or len(routes) == 0:
                break

            all_routes.extend(routes)
            area_route_count += len(routes)
            offset += 1000

        if area_route_count > 0:
            areas_with_routes += 1
            if idx % 20 == 0:
                print(f"  Processed {idx+1}/{len(all_area_ids)} areas - {len(all_routes)} total routes")

    print(f"Total routes fetched: {len(all_routes)}")
    print(f"Areas with routes: {areas_with_routes}")

    if len(all_routes) == 0:
        print("No routes found in Washington database")
        sys.exit(0)

    # Filter for alpine and mountaineering routes
    alpine_routes = [r for r in all_routes if r.get('discipline') and
                    any(d in r['discipline'].lower() for d in ['alpine', 'mountaineering', 'scramble', 'class', 'mixed', 'snow'])]

    print(f"Alpine/mountaineering routes: {len(alpine_routes)}")

    # Group by exact name (case-insensitive)
    exact_duplicates = defaultdict(list)
    for route in alpine_routes:
        key = route['name'].lower().strip()
        exact_duplicates[key].append(route)

    # Filter to only those with duplicates
    exact_dups = {k: v for k, v in exact_duplicates.items() if len(v) > 1}

    print(f"\n{'='*70}")
    print(f"EXACT NAME DUPLICATES: {len(exact_dups)} groups")
    print(f"{'='*70}\n")

    if exact_dups:
        dup_count = 0
        for name, routes in sorted(exact_dups.items()):
            dup_count += len(routes) - 1
            print(f'Duplicate: "{name}"')
            print(f"Instances: {len(routes)}")
            for route in sorted(routes, key=lambda x: x['id']):
                print(f"  Route ID: {route['id']}")
                print(f"    Area ID: {route['area_id']}")
                print(f"    Grade: {route.get('grade', 'N/A')} ({route.get('grade_system', 'N/A')})")
                print(f"    Discipline: {route.get('discipline', 'N/A')}")
            print()
        print(f"Total duplicate route instances (minus 1 per group): {dup_count}\n")
    else:
        print("No exact duplicate names found!\n")

    # Look for similar names (normalized)
    print(f"{'='*70}")
    print(f"SIMILAR NAMES (potential duplicates with spelling variations)")
    print(f"{'='*70}\n")

    normalized_groups = defaultdict(list)
    for route in alpine_routes:
        # Normalize: remove directional/positional words and common suffixes
        normalized = route['name'].lower()
        normalized = re.sub(r'\b(north|south|east|west|ne|nw|se|sw|left|right|upper|lower|main|primary|secondary|direct)\b', '', normalized)
        normalized = re.sub(r'\b(route|climb|peak|summit|face|ridge|spur|gully|couloir|crack|wall)\b', '', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()

        if normalized:
            normalized_groups[normalized].append(route)

    # Filter to groups with multiple unique route names (possible duplicates with spelling variations)
    similar_dups = {}
    for normalized, routes in normalized_groups.items():
        unique_names = len(set(r['name'] for r in routes))
        if len(routes) > 1 and unique_names > 1:
            similar_dups[normalized] = routes

    if similar_dups:
        count = 0
        for normalized, routes in sorted(similar_dups.items()):
            names = set(r['name'] for r in routes)
            if len(names) > 1 and count < 30:
                count += 1
                print(f'Base route: "{normalized}"')
                print(f"Name variations: {len(names)}")
                for route in sorted(routes, key=lambda x: x['name']):
                    print(f"  - {route['name']} (ID: {route['id']}, Grade: {route.get('grade', 'N/A')})")
                print()
    else:
        print("No similar name patterns found beyond exact matches")

    # Summary
    print(f"{'='*70}")
    print(f"SUMMARY")
    print(f"{'='*70}")
    print(f"Total routes in Washington: {len(all_routes)}")
    print(f"Alpine/mountaineering routes: {len(alpine_routes)}")
    print(f"Exact name duplicate groups: {len(exact_dups)}")
    print(f"Possible spelling variations: {len(similar_dups)}")

if __name__ == "__main__":
    main()

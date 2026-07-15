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
        print(f"Error fetching {url}: {e}")
        return None

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

    print("\nStep 2: Getting all Washington regional areas...")

    # Get regional areas under Washington
    regions_resp = fetch_json(
        f"{SUPABASE_URL}/rest/v1/areas?parent_id=eq.{wa_id}&select=id,name"
    )

    if not regions_resp:
        print("Failed to fetch regional areas")
        sys.exit(1)

    area_ids = [r['id'] for r in regions_resp]
    print(f"Found {len(area_ids)} regions")

    print(f"\nStep 3: Fetching routes from all regions...")

    all_routes = []

    # Fetch routes from each region
    for idx, area_id in enumerate(area_ids):
        offset = 0
        while True:
            url = f"{SUPABASE_URL}/rest/v1/routes?area_id=eq.{area_id}&select=id,name,area_id,discipline,grade,grade_system&offset={offset}&limit=500"
            routes = fetch_json(url)

            if not routes or len(routes) == 0:
                break

            all_routes.extend(routes)
            offset += 500

        print(f"  Region {idx+1}/{len(area_ids)}: {area_id} - {len(all_routes)} routes so far")

    print(f"\nTotal routes fetched: {len(all_routes)}")

    # Filter for alpine and mountaineering routes
    alpine_routes = [r for r in all_routes if r.get('discipline') and
                    any(d in r['discipline'].lower() for d in ['alpine', 'mountaineering', 'scramble', 'class', 'mixed'])]

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
            print(f'Duplicate Group: "{name}"')
            print(f"Count: {len(routes)} instances")
            for route in sorted(routes, key=lambda x: x['id']):
                print(f"  - ID: {route['id']}")
                print(f"    Area: {route['area_id']}")
                print(f"    Grade: {route.get('grade', 'N/A')} ({route.get('grade_system', 'N/A')})")
                print(f"    Discipline: {route.get('discipline', 'N/A')}")
            print()
        print(f"Total duplicate routes (extras beyond 1st): {dup_count}")
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
        normalized = re.sub(r'\b(north|south|east|west|ne|nw|se|sw|left|right|upper|lower|main)\b', '', normalized)
        normalized = re.sub(r'\b(route|climb|peak|summit|face|ridge|spur|gully|couloir|crack|wall)\b', '', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()

        if normalized:
            normalized_groups[normalized].append(route)

    # Filter to groups with multiple unique route names
    similar_dups = {}
    for normalized, routes in normalized_groups.items():
        unique_names = len(set(r['name'] for r in routes))
        if len(routes) > 1 and unique_names > 1:
            similar_dups[normalized] = routes

    if similar_dups:
        for normalized, routes in sorted(similar_dups.items())[:30]:
            names = set(r['name'] for r in routes)
            if len(names) > 1:
                print(f'Normalized: "{normalized}"')
                print(f"Variations: {len(names)}")
                for route in sorted(routes, key=lambda x: x['name']):
                    print(f"  - {route['name']} (ID: {route['id']}, area: {route['area_id']})")
                print()
    else:
        print("No similar name patterns found beyond exact matches")

    # Summary
    print(f"{'='*70}")
    print(f"SUMMARY")
    print(f"{'='*70}")
    print(f"Total alpine/mountaineering routes: {len(alpine_routes)}")
    print(f"Exact name duplicates (groups): {len(exact_dups)}")
    print(f"Similar name groups: {len([v for v in similar_dups.values()])}")

if __name__ == "__main__":
    main()

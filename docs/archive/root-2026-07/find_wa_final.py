#!/usr/bin/env python3
"""Find duplicate Washington alpine routes - Final approach"""

import urllib.request
import json
import re
from collections import defaultdict

SUPABASE_URL = "https://ofuofhojhbcrcahuotya.supabase.co"
ANON_KEY = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5"

def fetch_json(url):
    """Fetch JSON from URL"""
    headers = {"apikey": ANON_KEY, "Accept": "application/json"}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def get_all_children_recursive(parent_id, depth=0, max_depth=20):
    """Recursively get all child areas"""
    if depth > max_depth:
        return []

    children = []
    offset = 0

    while True:
        url = f"{SUPABASE_URL}/rest/v1/areas?parent_id=eq.{parent_id}&offset={offset}&limit=500&select=id,name"
        batch = fetch_json(url)

        if not batch or len(batch) == 0:
            break

        children.extend(batch)
        offset += 500

    # Recursively get children of each child
    all_areas = [parent_id]
    for child in children:
        all_areas.extend(get_all_children_recursive(child['id'], depth+1, max_depth))

    return all_areas

def main():
    print("Finding Washington duplicate alpine/mountaineering routes\n")

    print("Step 1: Building Washington area tree...")
    all_wa_area_ids = get_all_children_recursive("washington")
    print(f"Found {len(all_wa_area_ids)} total areas in Washington hierarchy\n")

    print("Step 2: Fetching all routes from Washington areas...")

    all_routes = []
    areas_processed = 0

    for idx, area_id in enumerate(all_wa_area_ids):
        offset = 0

        while True:
            url = f"{SUPABASE_URL}/rest/v1/routes?area_id=eq.{area_id}&offset={offset}&limit=1000&select=id,name,area_id,discipline,grade,grade_system"

            routes = fetch_json(url)

            if not routes or len(routes) == 0:
                break

            all_routes.extend(routes)
            offset += 1000

        areas_processed += 1

        if areas_processed % 500 == 0:
            print(f"  Processed {areas_processed} areas, {len(all_routes)} routes so far")

    print(f"Total routes fetched: {len(all_routes)}\n")

    if len(all_routes) == 0:
        print("No routes found!")
        return

    # Filter for alpine/mountaineering
    alpine_routes = [r for r in all_routes if r.get('discipline') and
                    any(d in r['discipline'].lower() for d in
                        ['alpine', 'mountaineering', 'scramble', 'class', 'mixed', 'snow', 'aid', 'glacier'])]

    print(f"Alpine/mountaineering routes: {len(alpine_routes)}\n")

    # Find exact duplicates
    exact_duplicates = defaultdict(list)
    for route in alpine_routes:
        key = route['name'].lower().strip()
        exact_duplicates[key].append(route)

    exact_dups = {k: v for k, v in exact_duplicates.items() if len(v) > 1}

    print("=" * 90)
    print(f"EXACT NAME DUPLICATES: {len(exact_dups)} groups")
    print("=" * 90)

    if exact_dups:
        dup_count = 0
        for name, routes in sorted(exact_dups.items()):
            dup_count += len(routes) - 1
            print(f'\nDuplicate route: "{name}"')
            print(f"Total instances: {len(routes)}")
            for route in sorted(routes, key=lambda x: x.get('id', '')):
                print(f"  Route ID: {route.get('id', 'N/A')}")
                print(f"    Peak/Crag: {route.get('area_id', 'N/A')}")
                print(f"    Grade: {route.get('grade', 'N/A')} ({route.get('grade_system', 'N/A')})")
                print(f"    Discipline: {route.get('discipline', 'N/A')}")

        print(f"\nTotal duplicate instances to remove: {dup_count}")
    else:
        print("No exact duplicate names found!")

    # Look for similar names
    print("\n" + "=" * 90)
    print("SIMILAR NAMES (Potential duplicates with spelling variations)")
    print("=" * 90)

    normalized_groups = defaultdict(list)
    for route in alpine_routes:
        normalized = route['name'].lower()
        # Remove directional/positional modifiers
        normalized = re.sub(r'\b(north|south|east|west|ne|nw|se|sw|left|right|upper|lower|main|primary|secondary|direct|original|variant|alt|alternate|direct)\b', '', normalized)
        # Remove common route/feature descriptors
        normalized = re.sub(r'\b(route|climb|peak|summit|face|ridge|spur|gully|couloir|crack|wall|pitch|buttress|chute|drift|scree|talus|traverse)\b', '', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()

        if normalized:
            normalized_groups[normalized].append(route)

    similar_dups = {}
    for normalized, routes in normalized_groups.items():
        unique_names = len(set(r['name'] for r in routes))
        if len(routes) > 1 and unique_names > 1:
            similar_dups[normalized] = routes

    if similar_dups:
        shown = 0
        for normalized, routes in sorted(similar_dups.items()):
            if shown >= 30:
                print(f"\n... and {len(similar_dups) - shown} more potential duplicates")
                break

            names = set(r['name'] for r in routes)
            if len(names) > 1:
                shown += 1
                print(f'\nBase route: "{normalized}"')
                print(f"Different names found: {len(names)}")
                for route in sorted(routes, key=lambda x: x.get('name', '')):
                    print(f"  - {route.get('name', 'N/A')} (ID: {route.get('id', 'N/A')}, Peak: {route.get('area_id', 'N/A')})")
    else:
        print("No similar name patterns found beyond exact matches.")

    # Summary statistics
    print("\n" + "=" * 90)
    print("SUMMARY STATISTICS")
    print("=" * 90)
    print(f"Total areas in Washington: {len(all_wa_area_ids)}")
    print(f"Total routes in Washington: {len(all_routes)}")
    print(f"Alpine/mountaineering routes: {len(alpine_routes)}")
    print(f"Exact duplicate groups (same name): {len(exact_dups)}")
    if exact_dups:
        dup_count = sum(len(v) - 1 for v in exact_dups.values())
        print(f"Total duplicate route instances to remove: {dup_count}")
    print(f"Similar name groups (possible duplicates): {len(similar_dups)}")

if __name__ == "__main__":
    main()

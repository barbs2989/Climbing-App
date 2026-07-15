#!/usr/bin/env python3
"""Find duplicate routes in Washington"""

import urllib.request
import json
import re
from collections import defaultdict
from urllib.parse import quote

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
        print(f"Error: {e}")
        return None

def main():
    print("Finding Washington duplicate routes...\n")

    # Use the ltree prefix search
    print("Step 1: Querying Washington areas using ltree...")

    all_wa_areas = []
    offset = 0

    while True:
        # Query with ltree path prefix search
        url = (f"{SUPABASE_URL}/rest/v1/areas"
               f"?path=like.usa.washington*&select=id,name,path&offset={offset}&limit=1000")

        areas = fetch_json(url)

        if not areas or len(areas) == 0:
            break

        all_wa_areas.extend(areas)
        offset += 1000

    print(f"Found {len(all_wa_areas)} Washington areas\n")

    if len(all_wa_areas) == 0:
        print("No Washington areas found! Trying different approach...")
        # Try with parent_id chain
        url = f"{SUPABASE_URL}/rest/v1/areas?parent_id=eq.washington&select=id,name"
        children = fetch_json(url)
        if children:
            print(f"Found direct children: {[c['name'] for c in children[:3]]}")

        return

    # Extract area IDs
    wa_area_ids = [a['id'] for a in all_wa_areas]

    print("Step 2: Fetching routes from all Washington areas...")

    all_routes = []
    areas_with_routes = 0

    # Fetch routes by area_id
    for idx, area_id in enumerate(wa_area_ids):
        offset = 0

        while True:
            url = (f"{SUPABASE_URL}/rest/v1/routes"
                   f"?area_id=eq.{area_id}&select=id,name,area_id,discipline,grade,grade_system"
                   f"&offset={offset}&limit=1000")

            routes = fetch_json(url)

            if not routes or len(routes) == 0:
                break

            all_routes.extend(routes)
            offset += 1000

        if len([r for r in all_routes if r['area_id'] == area_id]) > 0:
            areas_with_routes += 1

        if (idx + 1) % 100 == 0:
            print(f"  Processed {idx+1}/{len(wa_area_ids)} areas - {len(all_routes)} routes total")

    print(f"Total routes: {len(all_routes)}")
    print(f"Areas with routes: {areas_with_routes}\n")

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

    print("="*80)
    print(f"EXACT NAME DUPLICATES FOUND: {len(exact_dups)}")
    print("="*80)

    if exact_dups:
        for name, routes in sorted(exact_dups.items()):
            print(f'\nDuplicate: "{name}"')
            print(f"Instances: {len(routes)}")
            for route in sorted(routes, key=lambda x: x.get('id', '')):
                print(f"  Route ID: {route.get('id', 'N/A')}")
                print(f"    Peak/Area: {route.get('area_id', 'N/A')}")
                print(f"    Grade: {route.get('grade', 'N/A')} ({route.get('grade_system', 'N/A')})")
                print(f"    Discipline: {route.get('discipline', 'N/A')}")
    else:
        print("No exact duplicate names found!")

    # Similar names
    print("\n" + "="*80)
    print("POTENTIAL DUPLICATES (Similar names with variations)")
    print("="*80)

    normalized_groups = defaultdict(list)
    for route in alpine_routes:
        normalized = route['name'].lower()
        normalized = re.sub(r'\b(north|south|east|west|ne|nw|se|sw|left|right|upper|lower|main|primary|secondary|direct|original|variant|alt|alternate)\b', '', normalized)
        normalized = re.sub(r'\b(route|climb|peak|summit|face|ridge|spur|gully|couloir|crack|wall|pitch|buttress|chute)\b', '', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()

        if normalized:
            normalized_groups[normalized].append(route)

    similar_dups = {}
    for normalized, routes in normalized_groups.items():
        unique_names = len(set(r['name'] for r in routes))
        if len(routes) > 1 and unique_names > 1:
            similar_dups[normalized] = routes

    if similar_dups:
        count = 0
        for normalized, routes in sorted(similar_dups.items()):
            if count >= 30:
                break
            names = set(r['name'] for r in routes)
            if len(names) > 1:
                count += 1
                print(f'\nBase route: "{normalized}"')
                print(f"Variations: {len(names)}")
                for route in sorted(routes, key=lambda x: x.get('name', '')):
                    print(f"  - {route.get('name', 'N/A')} (ID: {route.get('id', 'N/A')}, Area: {route.get('area_id', 'N/A')})")

    print(f"\n{'='*80}")
    print("SUMMARY")
    print("="*80)
    print(f"Total routes in Washington: {len(all_routes)}")
    print(f"Alpine/mountaineering routes: {len(alpine_routes)}")
    print(f"Exact duplicate name groups: {len(exact_dups)}")
    if exact_dups:
        dup_count = sum(len(v) - 1 for v in exact_dups.values())
        print(f"Total duplicate instances (extras to remove): {dup_count}")

if __name__ == "__main__":
    main()

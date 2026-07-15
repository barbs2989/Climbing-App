#!/usr/bin/env python3
"""Fast duplicate finder using RPC function"""

import urllib.request
import json
import re
from collections import defaultdict
import sys

SUPABASE_URL = "https://ofuofhojhbcrcahuotya.supabase.co"
ANON_KEY = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5"

def fetch_json(url, data=None):
    """Fetch JSON from URL"""
    headers = {
        "apikey": ANON_KEY,
        "Accept": "application/json"
    }
    if data:
        headers["Content-Type"] = "application/json"
        data = json.dumps(data).encode('utf-8')

    req = urllib.request.Request(url, data=data, headers=headers, method='GET' if not data else 'POST')
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            content = response.read().decode('utf-8')
            return json.loads(content)
    except Exception as e:
        print(f"Error fetching {url}: {e}", file=sys.stderr)
        return None

def main():
    print("Using routes_in_subtree RPC to fetch all Washington routes...")

    # Use the RPC function that takes all the right parameters
    # routes_in_subtree(root_id => text, q => text, disc => text, min_grade => numeric, max_grade => numeric, min_stars => numeric, min_pitches => integer, min_length_m => integer, max_length_m => integer, sort_by => text, lim => integer, off => integer)

    all_routes = []
    offset = 0
    batch_size = 500

    while True:
        print(f"Fetching batch at offset {offset}...", file=sys.stderr)

        url = (f"{SUPABASE_URL}/rest/v1/rpc/routes_in_subtree"
               f"?root_id=washington"
               f"&q=null"
               f"&disc=null"
               f"&min_grade=null"
               f"&max_grade=null"
               f"&min_stars=null"
               f"&min_pitches=null"
               f"&min_length_m=null"
               f"&max_length_m=null"
               f"&sort_by=name"
               f"&lim={batch_size}"
               f"&off={offset}")

        routes = fetch_json(url)

        if not routes or len(routes) == 0:
            break

        all_routes.extend(routes)
        offset += batch_size

        print(f"  Got {len(routes)} routes, total: {len(all_routes)}", file=sys.stderr)

    print(f"\nTotal routes in Washington: {len(all_routes)}", file=sys.stderr)

    if len(all_routes) == 0:
        print("No routes found!")
        return

    # Filter for alpine and mountaineering
    alpine_routes = [r for r in all_routes if r.get('discipline') and
                    any(d in r['discipline'].lower() for d in ['alpine', 'mountaineering', 'scramble', 'class', 'mixed', 'snow'])]

    print(f"Alpine/mountaineering routes: {len(alpine_routes)}", file=sys.stderr)

    # Find exact duplicates (case-insensitive)
    exact_duplicates = defaultdict(list)
    for route in alpine_routes:
        key = route['name'].lower().strip()
        exact_duplicates[key].append(route)

    exact_dups = {k: v for k, v in exact_duplicates.items() if len(v) > 1}

    print(f"\n{'='*80}")
    print(f"EXACT NAME DUPLICATES FOUND: {len(exact_dups)}")
    print(f"{'='*80}\n")

    if exact_dups:
        for name, routes in sorted(exact_dups.items()):
            print(f'Duplicate: "{name}"')
            print(f"Instances: {len(routes)}")
            for route in sorted(routes, key=lambda x: x.get('id', '')):
                print(f"  ID: {route.get('id', 'N/A')}")
                print(f"     Area: {route.get('area_id', 'N/A')}")
                print(f"     Grade: {route.get('grade', 'N/A')} ({route.get('grade_system', 'N/A')})")
                print(f"     Discipline: {route.get('discipline', 'N/A')}")
            print()
    else:
        print("No exact duplicate names found!\n")

    # Similar names (potential duplicates with variations)
    print(f"{'='*80}")
    print(f"SIMILAR NAMES (Potential duplicates with spelling variations)")
    print(f"{'='*80}\n")

    normalized_groups = defaultdict(list)
    for route in alpine_routes:
        normalized = route['name'].lower()
        normalized = re.sub(r'\b(north|south|east|west|ne|nw|se|sw|left|right|upper|lower|main|primary|secondary|direct|spur)\b', '', normalized)
        normalized = re.sub(r'\b(route|climb|peak|summit|face|ridge|gully|couloir|crack|wall|peak)\b', '', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()

        if normalized:
            normalized_groups[normalized].append(route)

    similar_dups = {}
    for normalized, routes in normalized_groups.items():
        unique_names = len(set(r['name'] for r in routes))
        if len(routes) > 1 and unique_names > 1:
            similar_dups[normalized] = routes

    if similar_dups:
        for normalized, routes in sorted(similar_dups.items())[:20]:
            names = set(r['name'] for r in routes)
            if len(names) > 1:
                print(f'Base route: "{normalized}"')
                print(f"Variations found: {len(names)}")
                for route in sorted(routes, key=lambda x: x.get('name', '')):
                    print(f"  - {route.get('name', 'N/A')} (ID: {route.get('id', 'N/A')})")
                print()

    # Summary
    print(f"{'='*80}")
    print(f"SUMMARY")
    print(f"{'='*80}")
    print(f"Total routes in Washington: {len(all_routes)}")
    print(f"Alpine/mountaineering routes: {len(alpine_routes)}")
    print(f"Exact duplicate groups: {len(exact_dups)}")
    if exact_dups:
        dup_count = sum(len(v) - 1 for v in exact_dups.values())
        print(f"Total duplicate instances to remove: {dup_count}")

if __name__ == "__main__":
    main()

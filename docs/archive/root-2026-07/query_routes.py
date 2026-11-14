#!/usr/bin/env python3
"""Query all Washington routes directly from the routes table"""

import urllib.request
import json
import re
from collections import defaultdict
import sys
from urllib.parse import quote

SUPABASE_URL = "https://ofuofhojhbcrcahuotya.supabase.co"
ANON_KEY = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5"

def fetch_json(url, method='GET'):
    """Fetch JSON from URL"""
    headers = {
        "apikey": ANON_KEY,
        "Accept": "application/json"
    }

    req = urllib.request.Request(url, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            content = response.read().decode('utf-8')
            if content.strip():
                return json.loads(content)
            return None
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        if e.code == 400:
            body = e.read().decode('utf-8')
            print(f"Body: {body}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Error fetching {url}: {e}", file=sys.stderr)
        return None

def main():
    print("Querying Washington routes...", file=sys.stderr)

    # Query routes in Washington areas directly from the routes table
    # First, let me check what areas exist
    all_routes = []

    # Get Washington area first
    wa_url = f"{SUPABASE_URL}/rest/v1/areas?name=eq.Washington&area_type=eq.state&select=id"
    wa_data = fetch_json(wa_url)

    if not wa_data or len(wa_data) == 0:
        print("Washington area not found", file=sys.stderr)
        return

    wa_id = wa_data[0]['id']
    print(f"Found Washington: {wa_id}", file=sys.stderr)

    # Get all areas under Washington
    print("Getting all areas in Washington hierarchy...", file=sys.stderr)

    # Use a simple query to get all areas, then filter
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/areas?offset={offset}&limit=1000&select=id,parent_id,name,path"
        areas_batch = fetch_json(url)

        if not areas_batch or len(areas_batch) == 0:
            break

        all_routes.extend(areas_batch)
        offset += 1000

    print(f"Got {len(all_routes)} total areas", file=sys.stderr)

    # Filter for Washington areas (those with path starting with washington)
    wa_areas = [a for a in all_routes if a.get('path') and a['path'].startswith('washington')]
    print(f"Found {len(wa_areas)} areas in Washington", file=sys.stderr)

    wa_area_ids = [a['id'] for a in wa_areas]

    # Now get all routes in these areas
    print("Fetching routes from all Washington areas...", file=sys.stderr)

    all_routes = []

    # Fetch routes using OR query for area_id
    # Since area_id needs to be in the list, we'll do batches
    batch_size = 100
    for i in range(0, len(wa_area_ids), batch_size):
        batch_ids = wa_area_ids[i:i+batch_size]

        # Build the OR query
        or_clause = ",".join([f"area_id.eq.{aid}" for aid in batch_ids])

        offset = 0
        while True:
            # Use 'or' operator to query multiple area IDs
            url = f"{SUPABASE_URL}/rest/v1/routes?or=({or_clause})&offset={offset}&limit=500&select=id,name,area_id,discipline,grade,grade_system"

            routes_batch = fetch_json(url)

            if not routes_batch or len(routes_batch) == 0:
                break

            all_routes.extend(routes_batch)
            offset += 500

        print(f"  Batch {i//batch_size + 1}: fetched {len(all_routes)} total routes", file=sys.stderr)

    print(f"\nTotal routes fetched: {len(all_routes)}", file=sys.stderr)

    if len(all_routes) == 0:
        print("No routes found!")
        return

    # Filter for alpine/mountaineering
    alpine_routes = [r for r in all_routes if r.get('discipline') and
                    any(d in r['discipline'].lower() for d in ['alpine', 'mountaineering', 'scramble', 'class', 'mixed', 'snow', 'aid'])]

    print(f"Alpine/mountaineering routes: {len(alpine_routes)}", file=sys.stderr)

    # Find exact duplicates
    exact_duplicates = defaultdict(list)
    for route in alpine_routes:
        key = route['name'].lower().strip()
        exact_duplicates[key].append(route)

    exact_dups = {k: v for k, v in exact_duplicates.items() if len(v) > 1}

    print(f"\n{'='*80}")
    print(f"EXACT NAME DUPLICATES: {len(exact_dups)}")
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

if __name__ == "__main__":
    main()

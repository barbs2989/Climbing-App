#!/bin/bash

# Supabase credentials
SUPABASE_URL="https://ofuofhojhbcrcahuotya.supabase.co"
ANON_KEY="sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5"

echo "Step 1: Finding Washington state area..."

# Get Washington state area ID
WA_RESPONSE=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/areas?and=(name.eq.Washington,area_type.eq.state)&select=id,name" \
  -H "apikey: $ANON_KEY" \
  -H "Accept: application/json")

echo "Response: $WA_RESPONSE"

# Extract ID using grep
WA_ID=$(echo "$WA_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//' | sed 's/"$//')

if [ -z "$WA_ID" ]; then
  echo "Error: Could not find Washington state"
  exit 1
fi

echo "Found Washington ID: $WA_ID"

echo ""
echo "Step 2: Getting all Washington alpine/mountaineering areas..."

# Get all direct children of Washington (the regional areas)
WA_AREAS=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/areas?parent_id=eq.${WA_ID}&select=id,name,area_type" \
  -H "apikey: $ANON_KEY" \
  -H "Accept: application/json")

echo "$WA_AREAS" | head -c 500

# Extract all area IDs
AREA_IDS=$(echo "$WA_AREAS" | grep -o '"id":"[^"]*"' | sed 's/"id":"//' | sed 's/"$//' | tr '\n' ',' | sed 's/,$//')

echo ""
echo "Found regional areas: $AREA_IDS"

echo ""
echo "Step 3: Fetching routes from all Washington areas..."

# Fetch all routes in these areas in manageable batches
TEMP_FILE=$(mktemp)
OFFSET=0
BATCH_SIZE=500

while true; do
  echo "Fetching batch starting at offset $OFFSET..."

  BATCH_DATA=$(curl -s -X GET \
    "${SUPABASE_URL}/rest/v1/routes?area_id=in.(${AREA_IDS})&select=id,name,area_id,discipline,grade,grade_system&offset=${OFFSET}&limit=${BATCH_SIZE}" \
    -H "apikey: $ANON_KEY" \
    -H "Accept: application/json")

  # Check if we got any data
  COUNT=$(echo "$BATCH_DATA" | grep -o '"id":' | wc -l)

  if [ "$COUNT" -eq 0 ]; then
    break
  fi

  echo "$BATCH_DATA" >> "$TEMP_FILE"
  OFFSET=$((OFFSET + BATCH_SIZE))
done

echo ""
echo "Total routes fetched. Processing with Python..."

# Now use Python to analyze duplicates
python3 << 'PYTHON_SCRIPT'
import json
import sys
import re

# Read the JSON from temp file
with open('/tmp.txt', 'w') as f:
    pass

# Parse all JSON files
data = []

# Re-fetch with a simpler Python approach using requests
try:
    import requests

    SUPABASE_URL = "https://ofuofhojhbcrcahuotya.supabase.co"
    ANON_KEY = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5"

    headers = {
        "apikey": ANON_KEY,
        "Accept": "application/json"
    }

    # Get Washington ID
    wa_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/areas?and=(name.eq.Washington,area_type.eq.state)",
        headers=headers
    )

    if not wa_resp.ok:
        print(f"Error: {wa_resp.status_code} - {wa_resp.text}")
        sys.exit(1)

    wa_areas = wa_resp.json()
    if not wa_areas:
        print("Washington state not found")
        sys.exit(1)

    wa_id = wa_areas[0]['id']
    print(f"Found Washington ID: {wa_id}")

    # Get regional areas
    regions_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/areas?parent_id=eq.{wa_id}",
        headers=headers
    )

    regions = regions_resp.json()
    area_ids = [r['id'] for r in regions]
    print(f"Found {len(area_ids)} regions: {area_ids[:3]}...")

    # Fetch all routes
    all_routes = []
    offset = 0
    batch_size = 1000

    print(f"\nFetching routes from {len(area_ids)} regions...")

    for area_id in area_ids:
        offset = 0
        while True:
            query = f'{SUPABASE_URL}/rest/v1/routes?area_id=eq.{area_id}&select=id,name,area_id,discipline,grade,grade_system&offset={offset}&limit={batch_size}'

            resp = requests.get(query, headers=headers)
            if not resp.ok:
                print(f"Error fetching from {area_id}: {resp.status_code}")
                break

            routes = resp.json()
            if not routes:
                break

            all_routes.extend(routes)
            offset += batch_size

    print(f"Total routes fetched: {len(all_routes)}")

    # Filter for alpine/mountaineering
    alpine_routes = [r for r in all_routes if r.get('discipline') and
                    any(d in r['discipline'].lower() for d in ['alpine', 'mountaineering', 'scramble'])]

    print(f"Alpine/mountaineering routes: {len(alpine_routes)}")

    # Find duplicates
    name_groups = {}
    for route in alpine_routes:
        name = route['name'].lower().strip()
        if name not in name_groups:
            name_groups[name] = []
        name_groups[name].append(route)

    # Find exact duplicates
    exact_dups = {name: routes for name, routes in name_groups.items() if len(routes) > 1}

    print(f"\n=== EXACT NAME DUPLICATES: {len(exact_dups)} ===\n")

    if exact_dups:
        for name, routes in sorted(exact_dups.items()):
            print(f'Duplicate: "{name}"')
            for route in sorted(routes, key=lambda x: x['id']):
                print(f"  ID: {route['id']}")
                print(f"  Area: {route['area_id']}")
                print(f"  Grade: {route.get('grade', 'N/A')}")
                print(f"  Discipline: {route.get('discipline', 'N/A')}")
            print()

    # Look for similar names (potential duplicates with different spellings)
    print(f"\n=== FINDING SIMILAR NAMES ===\n")

    # Normalize names by removing common suffixes/prefixes
    normalized_groups = {}
    for route in alpine_routes:
        # Normalize: lowercase, remove extra spaces, common words
        normalized = route['name'].lower()
        normalized = re.sub(r'\b(route|climb|peak|summit|north|south|east|west|face|ridge|spur|gully|couloir)\b', '', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()

        if normalized:  # Only if there's something left
            if normalized not in normalized_groups:
                normalized_groups[normalized] = []
            normalized_groups[normalized].append(route)

    similar_dups = {norm: routes for norm, routes in normalized_groups.items() if len(routes) > 1}

    if similar_dups:
        for normalized, routes in sorted(similar_dups.items())[:20]:
            if len(routes) > 1:
                print(f'Normalized: "{normalized}"')
                for route in sorted(routes, key=lambda x: x['id']):
                    print(f"  Full name: {route['name']} (ID: {route['id']})")
                print()
    else:
        print("No similar names found beyond exact matches")

except ImportError:
    print("requests library not available, trying alternative approach...")
    sys.exit(1)

PYTHON_SCRIPT

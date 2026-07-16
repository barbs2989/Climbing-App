#!/bin/bash

# Supabase credentials
SUPABASE_URL="https://ofuofhojhbcrcahuotya.supabase.co"
ANON_KEY="sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5"

# Get Washington state area ID
echo "Fetching Washington state area..."
WA_RESPONSE=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/areas?name=eq.Washington&area_type=eq.state&select=id,name,area_type,parent_id" \
  -H "apikey: $ANON_KEY" \
  -H "Accept: application/json")

WA_ID=$(echo "$WA_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$WA_ID" ]; then
  echo "Error: Could not find Washington state area"
  echo "Response: $WA_RESPONSE"
  exit 1
fi

echo "Found Washington area ID: $WA_ID"

# Fetch all routes in Washington (this will use a more direct query)
echo "Fetching all routes in Washington..."

# First get all areas under Washington
curl -s -X GET \
  "$SUPABASE_URL/rest/v1/areas?parent_id=eq.$WA_ID&select=id,name" \
  -H "apikey: $ANON_KEY" \
  -H "Accept: application/json" > /tmp/wa_areas.json

AREA_IDS=$(cat /tmp/wa_areas.json | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | tr '\n' ',' | sed 's/,$//')

if [ -z "$AREA_IDS" ]; then
  echo "Error: Could not find any areas under Washington"
  cat /tmp/wa_areas.json
  exit 1
fi

echo "Found areas: $AREA_IDS"

# Fetch routes from all areas
curl -s -X GET \
  "$SUPABASE_URL/rest/v1/routes?area_id=in.($AREA_IDS)&select=id,name,area_id,grade_system,activity,discipline" \
  -H "apikey: $ANON_KEY" \
  -H "Accept: application/json" > /tmp/routes.json

# Process with jq if available
if command -v jq &> /dev/null; then
  echo "Processing routes..."

  # Filter for alpine and mountaineering
  jq '.[] | select(.activity | contains("alpine") or contains("mountaineering"))' /tmp/routes.json > /tmp/alpine_routes.json

  # Count
  COUNT=$(jq -s 'length' /tmp/alpine_routes.json)
  echo "Found $COUNT alpine/mountaineering routes"

  # Look for duplicates
  jq -s 'group_by(.name) | map(select(length > 1))' /tmp/alpine_routes.json > /tmp/duplicates.json

  DUP_COUNT=$(jq -s 'length' /tmp/duplicates.json)
  echo ""
  echo "=== DUPLICATE ROUTES FOUND: $DUP_COUNT ==="
  echo ""
  jq '.[] | .[] | "\(.name) (ID: \(.id))"' /tmp/duplicates.json
else
  echo "jq not available, showing raw JSON results..."
  cat /tmp/routes.json
fi

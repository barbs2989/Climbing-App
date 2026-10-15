#!/usr/bin/env python3
"""
Apply enhanced approach descriptions + approach_logistics to Supabase.
Reads workflow results JSON and PATCHes to live database.
Requires SUPABASE_SERVICE_ROLE_KEY in environment (or .env.local).
"""
import json
import os
import sys
import time
import requests
from pathlib import Path

# Try to load from .env.local first
env_file = Path('/Users/nathanbarber/dev/Climbing-App/.env.local')
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, val = line.strip().split('=', 1)
                if key not in os.environ:
                    os.environ[key] = val.strip('\'"')

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
ANON_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

if not SERVICE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY not found")
    print("Add it to .env.local or set as environment variable")
    sys.exit(1)

BASE_URL = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def apply_enrichment(json_file):
    """Read enriched data and PATCH to Supabase."""

    with open(json_file, 'r') as f:
        data = json.load(f)

    routes = data.get('routes', data) if isinstance(data, dict) else data
    if not isinstance(routes, list):
        print(f"ERROR: Expected list of routes, got {type(routes)}")
        sys.exit(1)

    print(f"Applying {len(routes)} enriched routes to Supabase...")
    print()

    success = 0
    errors = 0
    skipped = 0

    for i, route in enumerate(routes, 1):
        route_id = route.get('id')
        enhanced_approach = route.get('enhancedApproach')
        approach_logistics = route.get('approach_logistics')

        if not route_id:
            print(f"[{i:4d}] SKIP: missing route ID")
            skipped += 1
            continue

        if not enhanced_approach and not approach_logistics:
            print(f"[{i:4d}] SKIP {route_id}: no data to apply")
            skipped += 1
            continue

        # Build payload with both fields
        payload = {}
        if enhanced_approach:
            payload['approach'] = enhanced_approach
        if approach_logistics:
            payload['approach_logistics'] = approach_logistics

        try:
            url = f"{BASE_URL}/routes?id=eq.{route_id}"
            response = requests.patch(url, json=payload, headers=HEADERS, timeout=10)

            if response.status_code in [200, 204]:
                status_str = "✓"
                print(f"[{i:4d}] {status_str} {route.get('name', route_id)[:50]}")
                success += 1
            else:
                status_str = "✗"
                print(f"[{i:4d}] {status_str} {route_id}: HTTP {response.status_code}")
                errors += 1

            # Rate limiting
            if i % 20 == 0:
                time.sleep(0.5)

        except Exception as e:
            print(f"[{i:4d}] ✗ {route_id}: {str(e)[:80]}")
            errors += 1

    print()
    print(f"Results: {success} applied, {errors} errors, {skipped} skipped")
    print(f"Success rate: {success}/{len(routes)} ({100*success/len(routes):.1f}%)")

    return success, errors, skipped

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <json_file>")
        print(f"Example: {sys.argv[0]} /tmp/enrichment_results.json")
        sys.exit(1)

    json_file = sys.argv[1]
    if not os.path.exists(json_file):
        print(f"ERROR: File not found: {json_file}")
        sys.exit(1)

    apply_enrichment(json_file)

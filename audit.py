#!/usr/bin/env python3

import json
import sys
import urllib.request
import urllib.error

URL = "https://ofuofhojhbcrcahuotya.supabase.co"
ANON_KEY = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5"

def query(table, params=""):
    url = f"{URL}/rest/v1/{table}?{params}"
    headers = {
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {ANON_KEY}",
    }

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode()}", file=sys.stderr)
        return []

def main():
    print("=" * 80)
    print("WASHINGTON ALPINE/MOUNTAINEERING DATABASE AUDIT")
    print("=" * 80)
    print()

    # Step 1: Fetch all areas
    print("Step 1: Fetching all areas...")
    areas = query("areas", "select=*&order=name")
    print(f"  Total areas in database: {len(areas)}")
    print()

    # Step 2: Find Washington areas
    print("Step 2: Finding Washington state and peaks...")
    wa = next((a for a in areas if a["name"] == "Washington"), None)
    if not wa:
        print("ERROR: Washington state not found!")
        return

    print(f"  Found Washington (id: {wa['id']})")

    # Find all areas with "wa" in path (descendants of Washington)
    wa_areas = [a for a in areas if a.get("path", "").startswith("wa")]
    wa_peaks = [a for a in wa_areas if a.get("route_count", 0) > 0 and a.get("area_type") != "state"]

    print(f"  Found {len(wa_peaks)} peaks with routes in Washington")
    print()

    # Step 3: Fetch all routes
    print("Step 3: Fetching all routes...")
    routes = query("routes", "select=*")
    print(f"  Total routes in database: {len(routes)}")

    # Filter routes by WA peaks
    wa_peak_ids = {p["id"] for p in wa_peaks}
    wa_routes = [r for r in routes if r.get("area_id") in wa_peak_ids]
    print(f"  Routes in WA alpine/mountaineering peaks: {len(wa_routes)}")
    print()

    # Step 4: Route counts by peak
    print("Step 4: ROUTE COUNTS BY PEAK (Top 30)")
    print("-" * 80)

    routes_by_peak = {}
    for route in wa_routes:
        area_id = route.get("area_id")
        if area_id not in routes_by_peak:
            peak = next((p for p in wa_peaks if p["id"] == area_id), None)
            routes_by_peak[area_id] = {
                "name": peak["name"] if peak else "UNKNOWN",
                "routes": []
            }
        routes_by_peak[area_id]["routes"].append(route)

    sorted_peaks = sorted(
        [(id, data) for id, data in routes_by_peak.items()],
        key=lambda x: len(x[1]["routes"]),
        reverse=True
    )

    print(f"{'Peak Name':<40} {'Routes':<10} Area ID")
    print("-" * 80)
    for i, (peak_id, data) in enumerate(sorted_peaks[:30]):
        print(f"{data['name'][:39]:<40} {len(data['routes']):<10} {peak_id}")
    print()

    # Step 5: Check specific peaks
    print("Step 5: SPECIFIC PEAK VERIFICATION")
    print("-" * 80)

    adams_peak = next((p for p in wa_peaks if "Mount Adams" in p.get("name", "")), None)
    shuksan_peak = next((p for p in wa_peaks if "Mount Shuksan" in p.get("name", "")), None)

    if adams_peak:
        adams_routes = [r for r in wa_routes if r.get("area_id") == adams_peak["id"]]
        status = "OK" if len(adams_routes) == 7 else "MISMATCH"
        print(f"Mount Adams: {len(adams_routes)} routes (expected 7) [{status}]")
        for r in adams_routes:
            print(f"  - {r.get('name')} ({r.get('grade', 'NO GRADE')}) [{r.get('discipline')}]")
    else:
        print("Mount Adams: NOT FOUND")
    print()

    if shuksan_peak:
        shuksan_routes = [r for r in wa_routes if r.get("area_id") == shuksan_peak["id"]]
        status = "OK" if len(shuksan_routes) == 10 else "MISMATCH"
        print(f"Mount Shuksan: {len(shuksan_routes)} routes (expected 10) [{status}]")
        for r in shuksan_routes:
            print(f"  - {r.get('name')} ({r.get('grade', 'NO GRADE')}) [{r.get('discipline')}]")
    else:
        print("Mount Shuksan: NOT FOUND")
    print()

    # Step 6: Data quality check
    print("Step 6: DATA COMPLETENESS CHECK")
    print("-" * 80)

    VALID_DISCIPLINES = {"alpine", "mountaineering", "rock", "ice", "mixed", "bouldering"}

    missing_name = [r for r in wa_routes if not r.get("name") or not r["name"].strip()]
    missing_grade = [r for r in wa_routes if not r.get("grade") or not r["grade"].strip()]
    missing_discipline = [r for r in wa_routes if not r.get("discipline")]
    missing_area_id = [r for r in wa_routes if not r.get("area_id")]
    invalid_discipline = [r for r in wa_routes if r.get("discipline") and r["discipline"].lower() not in VALID_DISCIPLINES]

    # Check for duplicates
    duplicates = {}
    for r in wa_routes:
        key = (r.get("area_id"), r.get("name"))
        if key in duplicates:
            duplicates[key].append(r)
        else:
            duplicates[key] = [r]
    dup_list = [v for v in duplicates.values() if len(v) > 1]

    print(f"Total routes checked: {len(wa_routes)}")
    print(f"Routes missing name: {len(missing_name)}")
    print(f"Routes missing grade: {len(missing_grade)}")
    print(f"Routes missing discipline: {len(missing_discipline)}")
    print(f"Routes missing area_id: {len(missing_area_id)}")
    print(f"Routes with invalid discipline: {len(invalid_discipline)}")
    print(f"Duplicate route names: {len(dup_list)}")
    print()

    # Report issues
    if dup_list:
        print("*** DUPLICATE ROUTES FOUND ***")
        for dup_routes in dup_list:
            names = [r.get("name") for r in dup_routes]
            area_id = dup_routes[0].get("area_id")
            ids = [r.get("id") for r in dup_routes]
            print(f"  - '{names[0]}' in area {area_id} (IDs: {', '.join(ids)})")
        print()

    if missing_grade:
        print("*** ROUTES MISSING GRADE ***")
        for r in missing_grade[:5]:
            print(f"  - '{r.get('name')}' (area: {r.get('area_id')})")
        if len(missing_grade) > 5:
            print(f"  ... and {len(missing_grade) - 5} more")
        print()

    if missing_discipline:
        print("*** ROUTES MISSING DISCIPLINE ***")
        for r in missing_discipline[:5]:
            print(f"  - '{r.get('name')}' (area: {r.get('area_id')})")
        if len(missing_discipline) > 5:
            print(f"  ... and {len(missing_discipline) - 5} more")
        print()

    if invalid_discipline:
        print("*** ROUTES WITH INVALID DISCIPLINE ***")
        for r in invalid_discipline[:10]:
            print(f"  - '{r.get('name')}': discipline='{r.get('discipline')}' (area: {r.get('area_id')})")
        if len(invalid_discipline) > 10:
            print(f"  ... and {len(invalid_discipline) - 10} more")
        print()

    # Step 7: Discipline breakdown
    print("Step 7: DISCIPLINE BREAKDOWN")
    print("-" * 80)

    disciplines = {}
    for r in wa_routes:
        d = r.get("discipline") or "NONE"
        disciplines[d] = disciplines.get(d, 0) + 1

    for d, count in sorted(disciplines.items(), key=lambda x: -x[1]):
        print(f"{d:<20}: {count}")
    print()

    # Step 8: Grade distribution
    print("Step 8: GRADE DISTRIBUTION (Top 20)")
    print("-" * 80)

    grades = {}
    for r in wa_routes:
        g = r.get("grade") or "NONE"
        grades[g] = grades.get(g, 0) + 1

    top_grades = sorted(grades.items(), key=lambda x: -x[1])[:20]
    for g, count in top_grades:
        print(f"{g:<20}: {count}")
    print()

    # Step 9: Overall health assessment
    print("Step 9: OVERALL HEALTH ASSESSMENT")
    print("-" * 80)

    total_issues = len(missing_name) + len(missing_grade) + len(missing_discipline) + len(dup_list) + len(invalid_discipline)
    issue_percent = (total_issues / len(wa_routes) * 100) if wa_routes else 0

    if issue_percent <= 2:
        health_status = "EXCELLENT"
    elif issue_percent <= 5:
        health_status = "GOOD"
    elif issue_percent <= 10:
        health_status = "FAIR"
    else:
        health_status = "POOR"

    print(f"Total routes: {len(wa_routes)}")
    print(f"Total peaks: {len(sorted_peaks)}")
    print(f"Issues found: {total_issues} ({issue_percent:.2f}%)")
    print(f"Health Status: {health_status}")
    print()

    # Step 10: Recommendations
    if total_issues > 0:
        print("RECOMMENDED FIXES:")
        print("-" * 80)
        if missing_grade:
            print(f"1. Add missing grades to {len(missing_grade)} routes")
        if missing_discipline:
            print(f"2. Add missing disciplines to {len(missing_discipline)} routes")
        if invalid_discipline:
            print(f"3. Fix invalid disciplines in {len(invalid_discipline)} routes")
        if dup_list:
            print(f"4. Remove {len(dup_list)} duplicate route(s)")
    else:
        print("NO ISSUES FOUND - Database is in excellent condition!")

    print()
    print("=" * 80)
    print("AUDIT COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    main()

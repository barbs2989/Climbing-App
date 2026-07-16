#!/usr/bin/env python3
"""
Aggregate and compile WA ice climbing route hazard research from multiple sources.
Merges agent findings, deduplicates, validates against schema, and generates database-import JSON.
"""

import json
import os
from pathlib import Path
from collections import defaultdict
from datetime import datetime

class IceRoutesCompiler:
    def __init__(self):
        self.routes = []
        self.areas = defaultdict(int)
        self.duplicates = []
        self.validation_issues = []

    def load_existing_data(self):
        """Load all existing hazard documentation files."""
        basedir = Path("/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints")
        files_to_load = [
            "wa-ice-alpine-hazards.json",
            "icicle_creek_ice_routes_hazards.json",
            "ice_route_watch_out_examples.json",
        ]

        for filename in files_to_load:
            filepath = basedir / filename
            if filepath.exists():
                try:
                    with open(filepath) as f:
                        data = json.load(f)

                    if isinstance(data, dict) and 'routes' in data:
                        routes = data['routes']
                    elif isinstance(data, list):
                        routes = data
                    else:
                        print(f"  Skipping {filename}: unexpected structure")
                        continue

                    for route in routes:
                        self._normalize_route(route, f"source:{filename}")

                    print(f"  Loaded {filename}: {len(routes)} routes")
                except Exception as e:
                    print(f"  ERROR loading {filename}: {e}")

    def _normalize_route(self, route, source):
        """Normalize route data to consistent schema."""
        # Extract name
        name = route.get('name') or route.get('route_name') or route.get('Route')
        if not name:
            self.validation_issues.append(f"Missing route name in source")
            return False

        # Check for duplicates
        existing = next((r for r in self.routes if r.get('name') == name), None)
        if existing:
            self.duplicates.append({
                'name': name,
                'existing_sources': existing.get('sources', []),
                'new_source': source
            })
            return False

        # Normalize structure
        normalized = {
            'name': name,
            'area': route.get('area') or route.get('Area') or 'Unknown',
            'grade': route.get('grade') or route.get('Grade') or '',
            'height': route.get('height') or route.get('Height') or '',
            'watch_out': route.get('watch_out') or route.get('Watch Out') or route.get('watch_outs') or [],
            'sources': [source] if source else [],
            'confidence': self._calculate_confidence(route),
            'date_researched': route.get('date_researched', datetime.now().isoformat())
        }

        # Add optional fields if present
        for key in ['aspect', 'slope_angle', 'elevation_range', 'seasonal_best', 'seasonal_window']:
            if key in route:
                normalized[key] = route[key]

        self.routes.append(normalized)
        self.areas[normalized['area']] += 1
        return True

    def _calculate_confidence(self, route):
        """Estimate confidence based on available data."""
        sources_count = len(route.get('sources', []))
        watch_out_count = len(route.get('watch_out', []))
        has_elevation = 'elevation_range' in route or 'aspect' in route

        if sources_count >= 3 and watch_out_count >= 5:
            return 'high'
        elif sources_count >= 2 or watch_out_count >= 4:
            return 'medium'
        else:
            return 'low'

    def merge_agent_results(self, agent_json_data):
        """Merge results from research agents."""
        if isinstance(agent_json_data, dict) and 'routes' in agent_json_data:
            routes = agent_json_data['routes']
        elif isinstance(agent_json_data, list):
            routes = agent_json_data
        else:
            raise ValueError("Unexpected agent result format")

        merged_count = 0
        for route in routes:
            if self._normalize_route(route, "agent_research"):
                merged_count += 1

        return merged_count

    def generate_database_import(self):
        """Generate final JSON ready for database import."""
        output = {
            "metadata": {
                "generated": datetime.now().isoformat(),
                "total_routes": len(self.routes),
                "unique_areas": len(self.areas),
                "duplicates_found": len(self.duplicates),
                "validation_issues": len(self.validation_issues),
                "documentation_goal": 155,
                "documented_so_far": len(self.routes),
                "gap_remaining": max(0, 155 - len(self.routes))
            },
            "area_coverage": dict(sorted(self.areas.items(), key=lambda x: -x[1])),
            "routes": self.routes,
            "summary": {
                "high_confidence": len([r for r in self.routes if r.get('confidence') == 'high']),
                "medium_confidence": len([r for r in self.routes if r.get('confidence') == 'medium']),
                "low_confidence": len([r for r in self.routes if r.get('confidence') == 'low']),
                "gaps_by_area": self._get_gaps()
            }
        }
        return output

    def _get_gaps(self):
        """Identify remaining gaps by area."""
        target_coverage = {
            "Banks Lake": 25,
            "Snoqualmie Pass": 22,
            "Icicle Creek": 12,
            "North Cascades": 20,
            "Tumwater Canyon": 10,
            "Other WA areas": 20
        }

        gaps = {}
        for area, target in target_coverage.items():
            current = self.areas.get(area, 0)
            gaps[area] = max(0, target - current)

        return gaps

    def generate_qa_report(self):
        """Generate QA report with issues and statistics."""
        report = {
            "timestamp": datetime.now().isoformat(),
            "total_routes": len(self.routes),
            "duplicates_found": len(self.duplicates),
            "validation_issues": len(self.validation_issues),
            "area_distribution": dict(sorted(self.areas.items(), key=lambda x: -x[1])),
            "confidence_distribution": {
                "high": len([r for r in self.routes if r.get('confidence') == 'high']),
                "medium": len([r for r in self.routes if r.get('confidence') == 'medium']),
                "low": len([r for r in self.routes if r.get('confidence') == 'low']),
            },
            "sample_issues": self.validation_issues[:10],
            "sample_duplicates": self.duplicates[:5]
        }
        return report

    def compile(self):
        """Run full compilation workflow."""
        print("\n=== WA Ice Routes Research Compilation ===\n")

        print("1. Loading existing documentation...")
        self.load_existing_data()

        print(f"\n2. Summary after existing data:")
        print(f"   Total routes: {len(self.routes)}")
        print(f"   Unique areas: {len(self.areas)}")
        print(f"   Duplicates detected: {len(self.duplicates)}")
        print(f"   Validation issues: {len(self.validation_issues)}")

        print(f"\n3. Area coverage:")
        for area, count in sorted(self.areas.items(), key=lambda x: -x[1]):
            print(f"   {area}: {count} routes")

        return self.routes, self.areas


def main():
    compiler = IceRoutesCompiler()
    routes, areas = compiler.compile()

    # Generate outputs
    db_import = compiler.generate_database_import()
    qa_report = compiler.generate_qa_report()

    # Save outputs
    basedir = Path("/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints")

    # Database import JSON
    with open(basedir / "wa_ice_routes_master.json", "w") as f:
        json.dump(db_import, f, indent=2)
    print(f"\n4. Generated: wa_ice_routes_master.json ({len(routes)} routes)")

    # QA Report
    with open(basedir / "wa_ice_routes_qa_report.json", "w") as f:
        json.dump(qa_report, f, indent=2)
    print(f"   Generated: wa_ice_routes_qa_report.json")

    # Gaps report
    gaps = compiler._get_gaps()
    print(f"\n5. Remaining gaps by area:")
    for area, gap in sorted(gaps.items(), key=lambda x: -x[1]):
        if gap > 0:
            print(f"   {area}: {gap} routes remaining")

    print(f"\n6. Overall progress:")
    total_gap = sum(gaps.values())
    print(f"   Documented: {len(routes)} / 155 target")
    print(f"   Remaining: {total_gap}")
    print(f"   Progress: {len(routes) / 155 * 100:.1f}%")


if __name__ == "__main__":
    main()

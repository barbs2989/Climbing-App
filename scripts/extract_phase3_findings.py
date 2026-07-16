#!/usr/bin/env python3
"""
Extract findings from Phase 3 workflow output and prepare for Supabase apply.
Usage: python3 scripts/extract_phase3_findings.py {TASK_ID}
Example: python3 scripts/extract_phase3_findings.py wf_abc123def456
"""
import json
import sys
import os
from pathlib import Path

def extract_findings(task_id):
    """Extract peak findings from a workflow output file by task ID."""
    # Paths where Claude jobs store output
    possible_paths = [
        f"/private/tmp/claude-501/-Users-nathanbarber-dev-Climbing-App/7787eb44-23e6-4b2e-ae3a-ed8613abd900/tasks/{task_id}.output",
        f"/private/tmp/claude-{os.getuid()}/{task_id}.output",
        f"/Users/nathanbarber/.claude/jobs/7787eb44/tmp/{task_id}.output",
    ]

    output_file = None
    for path in possible_paths:
        if os.path.exists(path):
            output_file = path
            break

    if not output_file:
        print(f"Error: Could not find output file for task {task_id}", file=sys.stderr)
        print(f"Searched paths:", file=sys.stderr)
        for p in possible_paths:
            print(f"  - {p}", file=sys.stderr)
        sys.exit(1)

    try:
        with open(output_file) as f:
            data = json.load(f)

        # Output format has result array with peaks
        if isinstance(data, dict) and 'result' in data:
            findings = data['result']
        elif isinstance(data, list):
            findings = data
        else:
            print(f"Warning: Unexpected format in {output_file}", file=sys.stderr)
            return []

        return findings
    except Exception as e:
        print(f"Error reading {output_file}: {e}", file=sys.stderr)
        return []

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/extract_phase3_findings.py {TASK_ID}", file=sys.stderr)
        print("Example: python3 scripts/extract_phase3_findings.py wf_abc123def456", file=sys.stderr)
        sys.exit(1)

    task_id = sys.argv[1]
    print(f"Extracting findings from task {task_id}...", file=sys.stderr)

    findings = extract_findings(task_id)

    if not findings:
        print("Error: No findings extracted", file=sys.stderr)
        sys.exit(1)

    # Count peaks and routes
    num_peaks = len(findings)
    num_routes = sum(len(p.get('routes', [])) for p in findings)

    # Write consolidated findings
    out_file = 'enrichment-wip/findings_phase3_final.json'
    with open(out_file, 'w') as f:
        json.dump(findings, f, indent=2)

    print(f"\n✅ Extracted {num_peaks} peaks, {num_routes} routes", file=sys.stderr)
    print(f"   Saved to: {out_file}", file=sys.stderr)
    print(f"\nNext step:", file=sys.stderr)
    print(f"   SUPABASE_SERVICE_KEY=\"sb_secret_...\" node enrichment-wip/apply_enrich_thin.mjs {out_file}", file=sys.stderr)

    # Return stats as JSON for scripting
    stats = {
        "task_id": task_id,
        "peaks": num_peaks,
        "routes": num_routes,
        "output_file": out_file
    }
    print(json.dumps(stats))

if __name__ == '__main__':
    main()

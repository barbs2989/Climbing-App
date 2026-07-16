#!/usr/bin/env python3
"""
Consolidate findings from all 4 phase 2 batch workflow outputs.
Outputs: enrichment-wip/findings_phase2_consolidated.json
"""
import json
import sys
import os
from pathlib import Path

def extract_findings_from_output(output_file):
    """Extract peak findings from a workflow output file."""
    try:
        with open(output_file) as f:
            data = json.load(f)

        # Output format has result array with peaks
        if isinstance(data, dict) and 'result' in data:
            return data['result']
        elif isinstance(data, list):
            return data
        else:
            print(f"Warning: Unexpected format in {output_file}", file=sys.stderr)
            return []
    except Exception as e:
        print(f"Error reading {output_file}: {e}", file=sys.stderr)
        return []

def main():
    # Paths to batch output files
    batch_files = {
        1: '/private/tmp/claude-501/-Users-nathanbarber-dev-Climbing-App/7787eb44-23e6-4b2e-ae3a-ed8613abd900/tasks/w99gxlcf6.output',
        2: '/private/tmp/claude-501/-Users-nathanbarber-dev-Climbing-App/7787eb44-23e6-4b2e-ae3a-ed8613abd900/tasks/wvdhd6pv0.output',
        3: '/private/tmp/claude-501/-Users-nathanbarber-dev-Climbing-App/7787eb44-23e6-4b2e-ae3a-ed8613abd900/tasks/w53b1ihkj.output',
        4: '/private/tmp/claude-501/-Users-nathanbarber-dev-Climbing-App/7787eb44-23e6-4b2e-ae3a-ed8613abd900/tasks/w2wxev8nv.output',
    }

    all_findings = []
    stats = {
        'total_peaks': 0,
        'total_routes': 0,
        'batches_success': 0,
        'batches_skipped': 0,
        'per_batch': {}
    }

    for batch_num in [1, 2, 3, 4]:
        output_file = batch_files.get(batch_num)

        if not output_file or not os.path.exists(output_file):
            print(f"Batch {batch_num}: Not found ({output_file})")
            stats['batches_skipped'] += 1
            continue

        print(f"Processing batch {batch_num}...", file=sys.stderr)
        findings = extract_findings_from_output(output_file)

        if findings:
            # Count peaks and routes
            num_peaks = len(findings)
            num_routes = sum(len(p.get('routes', [])) for p in findings)

            all_findings.extend(findings)
            stats['total_peaks'] += num_peaks
            stats['total_routes'] += num_routes
            stats['batches_success'] += 1
            stats['per_batch'][f'batch_{batch_num}'] = {
                'peaks': num_peaks,
                'routes': num_routes
            }

            print(f"  ✓ {num_peaks} peaks, {num_routes} routes", file=sys.stderr)
        else:
            print(f"  ⚠ No findings extracted", file=sys.stderr)
            stats['batches_skipped'] += 1

    # Write consolidated findings
    out_file = 'enrichment-wip/findings_phase2_consolidated.json'
    with open(out_file, 'w') as f:
        json.dump(all_findings, f, indent=2)

    print(f"\n✅ Consolidated findings written to {out_file}", file=sys.stderr)
    print(f"   Total: {stats['total_peaks']} peaks, {stats['total_routes']} routes", file=sys.stderr)
    print(f"   Successful batches: {stats['batches_success']}/4", file=sys.stderr)
    print(f"\nPer-batch breakdown:", file=sys.stderr)
    for batch, counts in stats['per_batch'].items():
        print(f"  {batch}: {counts['peaks']} peaks, {counts['routes']} routes", file=sys.stderr)

    # Return stats
    print(json.dumps(stats))

if __name__ == '__main__':
    main()

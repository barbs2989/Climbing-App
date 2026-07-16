#!/usr/bin/env python3
"""
Generate ready-to-run wa-enrich-batch workflow scripts for phase 2 (158 remaining peaks).
Usage: python3 scripts/generate_phase2_workflows.py
Output: enrichment-wip/wf_run_phase2_batch{1,2,3,4}.js
"""
import json
import sys

def main():
    try:
        template = open('.claude/workflows/wa-enrich-batch.js').read()
    except FileNotFoundError:
        print("Error: .claude/workflows/wa-enrich-batch.js not found", file=sys.stderr)
        sys.exit(1)

    generated = 0
    for batch_num in range(1, 5):
        try:
            batch_file = f'enrichment-wip/phase2_batch_{batch_num}.json'
            peaks = json.load(open(batch_file))
        except FileNotFoundError:
            print(f"Warning: {batch_file} not found, skipping batch {batch_num}", file=sys.stderr)
            continue

        peaks_json = json.dumps(peaks)
        lines = template.split('\n')

        # Find and replace PEAKS line
        idx = None
        for i, line in enumerate(lines):
            if line.startswith('const PEAKS = '):
                idx = i
                break

        if idx is None:
            print(f"Error: Could not find PEAKS definition in template", file=sys.stderr)
            sys.exit(1)

        lines[idx] = f"const PEAKS = {peaks_json};"
        out = '\n'.join(lines)

        out_file = f'enrichment-wip/wf_run_phase2_batch{batch_num}.js'
        with open(out_file, 'w') as f:
            f.write(out)

        route_count = sum(len(p.get('routes', [])) for p in peaks)
        print(f"✓ Batch {batch_num}: {len(peaks)} peaks, {route_count} routes → {out_file}")
        generated += 1

    if generated == 4:
        print(f"\n✅ All 4 workflow scripts generated. Ready to launch:")
        print("   Workflow({scriptPath: 'enrichment-wip/wf_run_phase2_batch1.js'})")
        print("   Workflow({scriptPath: 'enrichment-wip/wf_run_phase2_batch2.js'})")
        print("   Workflow({scriptPath: 'enrichment-wip/wf_run_phase2_batch3.js'})")
        print("   Workflow({scriptPath: 'enrichment-wip/wf_run_phase2_batch4.js'})")
    else:
        print(f"\n⚠️  Only {generated}/4 batches generated", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

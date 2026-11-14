# Phase 3 Runbook: Final 19-Peak Enrichment

> **⚠️ STALE — DO NOT RUN AS-IS (2026-07-16).** This plan's 19 target peak IDs no
> longer match the live DB: 6 were merged/renamed during a later hierarchy-dedup
> pass, and the other 13 were already enriched by unrelated later work. The
> elevation/approach gap this runbook was meant to close has since been
> completed against a freshly re-audited target list — see PR #243 and the
> `wa-elevation-approach-audit-complete-2026-07-16` memory. The companion
> findings file has been renamed to
> `enrichment-wip/STALE_DO_NOT_APPLY_findings_phase3_final.json` to prevent
> accidental application. If picking this up again, re-verify the target
> peak/route IDs against the live catalog first — don't trust this file.

**Target Date:** ~2026-08-15 (when monthly API budget resets)  
**Peaks:** 19 remaining WA alpine/scramble/mountaineering  
**Routes:** ~64 routes  
**Estimated Runtime:** ~60–90 min wall-clock  
**Expected Output:** ~1,000–1,500 additional DB fields

## Overview

Phase 3 completes the WA alpine catalog enrichment, bringing coverage from 91.8% (Phase 1+2: 214 peaks) to **100% (233 peaks)**. The remaining 19 peaks include high-priority targets (Mt. Goode — original user complaint, Mt. Shuksan, Mt. Hinman, Mt. Jefferson) plus secondary/scattered peaks.

All batch files and workflow script are **pre-generated and ready to launch**.

## Pre-Launch Checklist

- [ ] Verify API monthly budget has reset (check Claude dashboard at claude.ai/settings/usage)
- [ ] Confirm Supabase service key still valid (get a fresh one from the Supabase dashboard — do not paste keys into this file; the previous key here was leaked and rotated)
- [ ] Verify files exist:
  - [ ] `enrichment-wip/phase3_batch_final.json` (19 peaks)
  - [ ] `enrichment-wip/wf_run_phase3_final.js` (generated workflow)
  - [ ] `enrichment-wip/apply_enrich_thin.mjs` (apply script)

## Phase 3 Peak Breakdown

### Critical Priority (1 peak, 5 routes)

**Mount Goode (9,200 ft)**
- Original user complaint: elevation gain underreported
- Routes: Gunsight Pass, North Ridge, Southeast Ridge, Direct North Face, West Face
- Status: High-traffic alpine peak, needs comprehensive enrichment

### High Priority (6 peaks, 26 routes)

- **Mount Shuksan (9,131 ft)** — Popular alpine route (5 routes)
- **Mount Hinman (8,494 ft)** — Central Cascades classic (4 routes)
- **Mount Jefferson (10,495 ft)** — South Cascades volcano (6 routes)
- **Bonanza Peak (9,511 ft)** — Central Cascades (4 routes)
- **Mount Terror (8,601 ft)** — North Cascades (4 routes)
- **Nooksack Tower (9,050 ft)** — Pickets area (3 routes)

### Medium Priority (7 peaks, 24 routes)

- Mount Challenger (8 peaks × 5 routes)
- Mount Fury (4 routes)
- Dome Peak (4 routes)
- Colonial Peak (3 routes)
- Ingalls Peak (3 routes)
- Three Fingered Jack (3 routes)
- Mount Washington (2 routes)

### Low Priority (5 peaks, 9 routes)

- Crooked Thumb Peak (2 routes)
- North Twin Sister (2 routes)
- South Twin Sister (2 routes)
- Mount Brunswick (2 routes)
- Cabin Creek Peak (1 route)

## Execution Steps

### Step 1: Launch Workflow (~90 min)

```bash
# In Claude Code, when budget has reset:
Workflow({scriptPath: 'enrichment-wip/wf_run_phase3_final.js'})
```

The workflow will:
- Run 19 parallel agents (1 per peak)
- Research each peak comprehensively
- Validate output against schema
- Return structured findings

**Expected time:** ~90 min wall-clock (19 peaks × avg 5 min per peak, with parallelization)

### Step 2: Extract Findings

Once workflow completes, extract peak findings:

```bash
python3 << 'PYTHON_EOF'
import json

# Read workflow output from task notification
with open('/private/tmp/claude-501/.../tasks/{TASK_ID}.output') as f:
    data = json.load(f)
    findings = data.get('result', data if isinstance(data, list) else [])

# Save to file
with open('enrichment-wip/findings_phase3_final.json', 'w') as f:
    json.dump(findings, f, indent=2)

print(f"Extracted: {len(findings)} peaks")
PYTHON_EOF
```

### Step 3: Apply to Supabase

```bash
SUPABASE_SERVICE_KEY="<paste your current service key here — never commit it>" \
node enrichment-wip/apply_enrich_thin.mjs enrichment-wip/findings_phase3_final.json
```

**Expected output:**
- ~19 peaks researched
- ~64 routes touched
- ~1,200–1,500 fields written
- 0 database errors (100% success)

### Step 4: Spot-Check (30 min)

Sample 3–5 high-priority peaks:

**Mount Goode (original complaint):**
- Check: gain_ft populated for all 5 routes
- Check: approach text detailed (Gunsight Pass approach, N Ridge variations)
- Check: hazards documented (ice conditions, rockfall, exposure)
- Check: seasonal windows accurate

**Mount Shuksan:**
- Check: elevation verified (9,131 ft)
- Check: Continental Divide & Nisqually Glacier routes documented
- Check: glacier hazards detailed (crevasse fields, bergschrund)
- Check: timing breakdowns realistic (6–8+ hr days)

**Mount Jefferson:**
- Check: elevation verified (10,495 ft)
- Check: all 6 routes documented
- Check: descent methods detailed (complicated on volcano)

### Step 5: Final Report & Commit

```bash
git add enrichment-wip/findings_phase3_final.json PHASE_3_COMPLETION_REPORT.md
git commit -m "Phase 3 complete: 19 remaining WA peaks researched (100% catalog coverage)"

gh pr create --draft --base main --title "Phase 3: Final 19 WA peaks (100% coverage)" \
  --body "Completion of WA alpine enrichment audit. All 233 peaks now have verified elevation gain, approach text, hazards, and first ascent data."
```

## Expected Results

### Database State After Phase 3

| Metric | Phase 1 | Phase 2 | Phase 3 | **Total** |
|--------|---------|---------|---------|----------|
| Peaks researched | 67 | 147 | 19 | **233** |
| Routes updated | 170 | 246 | 64 | **480+** |
| Fields written | 2,281 | 3,221 | ~1,400 | **~6,900** |
| Coverage % | 28.8% | 63.1% | 8.2% | **100%** |
| DB errors | 0 | 0 | 0 | **0** |

### Coverage Metrics

```
Phase 1 + Phase 2 + Phase 3 = 100% Catalog Coverage
┌─────────────────────────────────────────────────────┐
│ 233 WA Alpine/Scramble/Mountaineering Peaks         │
│ ✓ Elevation gain: verified, multi-source            │
│ ✓ Approach text: comprehensive (trailhead to climb) │
│ ✓ Descent methods: documented with anchors/rappels  │
│ ✓ Hazards: objective + regional + route-specific    │
│ ✓ Seasonal guidance: optimal windows + climate      │
│ ✓ First ascents: researched + documented            │
│ ✓ Emergency contacts: county sheriff + ranger info  │
└─────────────────────────────────────────────────────┘
```

### Impact on App

- **Technical Stats "Gain" tile:** 100% accurate for all WA alpine peaks
- **Route detail pages:** Comprehensive approach/descent/hazard info for 480+ routes
- **Trip planning:** Users can access detailed seasonal windows + emergency info for every route
- **Partner matching:** Elevation data drives accurate fitness assessment across catalog

## Files & Artifacts

| File | Status | Purpose |
|------|--------|---------|
| `enrichment-wip/phase3_batch_final.json` | ✓ Ready | 19 peaks, 64 routes |
| `enrichment-wip/wf_run_phase3_final.js` | ✓ Ready | Workflow script (pre-generated) |
| `enrichment-wip/apply_enrich_thin.mjs` | ✓ Ready | Apply script (unchanged from phase 1-2) |
| `PHASE_3_RUNBOOK.md` | ✓ Ready | This file (execution guide) |
| `enrichment-wip/findings_phase3_final.json` | 🔜 Generated | Research output (post-workflow) |
| `PHASE_3_COMPLETION_REPORT.md` | 🔜 Generated | Final results report (post-apply) |

## Key Contacts & Resources

**API/Budget:**
- Claude Dashboard: claude.ai/settings/usage (check remaining budget balance)

**Supabase Service Key:**
- Valid until: ~2026-10-15 (rotate if older than 3 months)
- Dashboard: https://app.supabase.com/project/[project-id]/settings/api

**Workflow Monitoring:**
- Claude Code: `/workflows` command to watch progress

## Timeline

| Date | Milestone | Duration | Status |
|------|-----------|----------|--------|
| 2026-07-15 | Phase 1 complete | ~6 hrs | ✅ Merged |
| 2026-07-15 | Phase 2 complete | ~6 hrs | ✅ PR #232 ready |
| ~2026-08-15 | API budget reset | — | 🔜 Expected |
| 2026-08-15+ | Phase 3 workflow launch | ~90 min | 🔜 Ready |
| 2026-08-15 + 2 hrs | Supabase apply + spot-check | ~1 hr | 🔜 Expected |
| 2026-08-15 + 3 hrs | Final PR & merge | ~30 min | 🔜 Target |

**Total Elapsed:** ~3 hours hands-on + ~90 min auto-workflows = **~2 hours user effort**

## Troubleshooting

### "Spend limit" error during workflow
- Expected if budget runs out mid-batch
- Partial results will be available (check task output)
- Remaining peaks can be re-run in subsequent batch

### Database apply fails with "Invalid API key"
- Verify service key is still valid in Supabase > Project Settings > API
- If >3 months old, request new service_role key

### Workflow agents timeout
- Very rare (network hiccup only)
- Re-run the entire batch (not individual agents)

## Quick Start (When Budget Resets)

```bash
# 1. Launch workflow
Workflow({scriptPath: 'enrichment-wip/wf_run_phase3_final.js'})

# 2. Wait ~90 min

# 3. Extract findings (substitute {TASK_ID} from notification)
python3 scripts/extract_phase3_findings.py {TASK_ID}

# 4. Apply to DB
SUPABASE_SERVICE_KEY="..." node enrichment-wip/apply_enrich_thin.mjs enrichment-wip/findings_phase3_final.json

# 5. Spot-check 3-5 peaks

# 6. Commit
git add enrichment-wip/findings_phase3_final.json
git commit -m "Phase 3: 19 remaining peaks researched (100% coverage)"

# 7. Create PR
gh pr create --draft --base main --title "Phase 3: 100% WA catalog coverage"
```

**Estimated hands-on time:** 30 min  
**Automated time:** ~90 min  
**Total wall-clock:** ~2 hours

---

**Session:** elevation-approach-audit worktree  
**Branch:** worktree-elevation-approach-audit  
**Status:** Phase 3 **READY TO LAUNCH**

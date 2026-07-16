# Phase 2 Runbook: Resume 158-Peak Enrichment
**Target Date:** ~2026-08-15 (when monthly API budget resets)  
**Batch Count:** 4 (40 + 40 + 40 + 38 peaks)  
**Estimated Runtime:** 6–7 hours wall-clock  
**Expected Output:** ~260 more routes, ~3,500+ additional DB fields

## Pre-Launch Checklist

- [ ] Verify API monthly budget has reset (check Claude dashboard at claude.ai/settings/usage)
- [ ] Confirm Supabase service key still valid: `sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp`
- [ ] Clone/pull `elevation-approach-audit` branch (or start fresh from main)
- [ ] Verify batch files exist: `enrichment-wip/phase2_batch_{1,2,3,4}.json`
- [ ] Confirm `enrichment-wip/apply_enrich_thin.mjs` is present and unchanged

## Phase 2 Batch Contents

### Batch 1 (40 peaks, 86 routes)
Agnes Mountain, Aiguille de l'M, Amphitheater Mountain, Argonaut Peak, Austera Peak, Bacon Peak, Baring Mountain, Bear Mountain, Big Kangaroo, Black Peak, Bonanza Peak, Boston Peak, Buckner Mountain, Burgundy Spire, Cascade Peak, Castle Peak, Cathedral Peak, Chablis Spire, Chiwawa Mountain, Colfax Peak, Colchuck Peak, Corteo Peak, Crooked Thumb Peak, East Face (Chelan area), East McMillan Spire, East Twin Needle, Elephant Head, Frenzel Spitz, Ghost Peak, Goat Mountain, Gunn Peak, Gunsight Peak

### Batch 2 (40 peaks, 78 routes)
Half Moon Crag, Hozomeen Mountain, Hook Creek Drainage, Hurry-Up Peak, Icy Peak, Ingalls Peak, Jötunheim, Juno Tower, Kangaroo Temple, Klawatti Peak, Kyes Peak, Lemah Mountain, Liberty Cap, Lexington Tower, Lincoln Peak, Little Mac Spire, Little Tahoma Peak, Magic Mountain, Main Peak (Chelan), Main Peak (Pickets), Manhattan Creek area, Mix-up Peak, Molar Tooth, Morning Star Peak, Mount Carrie, Mount Custer, Mount Degenhardt, Mount Deception, Mount Despair, Mount Fairchild, Mount Formidable, Mount Hardy, Mount Hinman, Mount Index, Mount Johnson, Mount Larrabee, Mount Maude, Mount Olympus, Mount Redoubt, Mount Remmel, Mount Sefrit, Mount Shuksan, Mount Spickard

### Batch 3 (40 peaks, 51 routes)
Mount Stone, Mount Thomson, Mount Torment, Mount Triumph, Mossy Loaf, Nooksack Tower, North Face Tiffany Mountain, North Peak, North Twin, Obelisk (The), Old Snowy Mountain, Ottohorn, Overcoat Peak, Poster Peak, Prusik Peak, Sahale Mountain, Sentinel Peak, Sherpa Peak, Sinister Peak, Sitkum Spire, Sloan Peak, South Peak, South Twin Sister, Sofa King Buttress, Spire Gully, Spire Point, Summer-Fall, Summertime Crag, Tatoosh Range peaks, The Castle, The Dikes, The Needle, The Pyramid, The Triad, Tricouni Peak, Vasiliki Ridge, Viviane Campsite, Warrior Peak, Whine Spire, Witches Tower

### Batch 4 (38 peaks, 47 routes)
West Peak, West Twin Needle, Whatcom Peak, Wildcat Mountain, Wilman's Spires, Wilmans Spires, [others]

## Execution Steps

### Step 1: Generate Workflow Scripts (5 min)

For each batch file, generate a ready-to-run workflow script:

```bash
python3 << 'PYTHON_EOF'
import json

for batch_num in range(1, 5):
    peaks = json.load(open(f'enrichment-wip/phase2_batch_{batch_num}.json'))
    peaks_json = json.dumps(peaks)
    
    # Read template
    template = open('.claude/workflows/wa-enrich-batch.js').read()
    lines = template.split('\n')
    
    # Replace PEAKS line
    idx = next(i for i, l in enumerate(lines) if l.startswith('const PEAKS = '))
    lines[idx] = f"const PEAKS = {peaks_json};"
    
    out = '\n'.join(lines)
    open(f'enrichment-wip/wf_run_phase2_batch{batch_num}.js', 'w').write(out)
    
    print(f"batch {batch_num}: {len(peaks)} peaks → wf_run_phase2_batch{batch_num}.js")
PYTHON_EOF
```

### Step 2: Launch Workflows in Parallel (1 hour per batch wave)

Launch all 4 workflows in parallel:

```bash
# Start all 4 batches concurrently in background
for i in 1 2 3 4; do
  echo "Launching batch $i..."
  # Via Claude Code: Workflow({scriptPath: "enrichment-wip/wf_run_phase2_batch$i.js"})
done
```

Each batch will take ~45–60 min wall-clock. Workflows run in parallel, so total time is ~60 min, not 240 min.

### Step 3: Monitor Progress (passive)

Check workflow progress via `/workflows` in Claude Code or `gh workflow list`. Each completed workflow will auto-notify. No intervention needed unless an agent times out (very rare).

### Step 4: Consolidate Findings (5 min)

Once all 4 workflows complete:

```bash
python3 << 'PYTHON_EOF'
import json

all_findings = []
for batch_num in range(1, 5):
    # Extract results from completed workflows (see notes below)
    # Results are in /private/tmp/claude-501/.../tasks/{task_id}.output
    findings = json.load(open(f'enrichment-wip/phase2_batch_{batch_num}_findings.json'))
    all_findings.extend(findings)

json.dump(all_findings, open('enrichment-wip/findings_phase2_2026_08_15.json', 'w'))
print(f"consolidated: {len(all_findings)} peaks with research data")
PYTHON_EOF
```

### Step 5: Apply to Supabase (15 min)

```bash
SUPABASE_SERVICE_KEY="sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp" \
node enrichment-wip/apply_enrich_thin.mjs enrichment-wip/findings_phase2_2026_08_15.json
```

Expected output:
- ~158 peaks researched
- ~260 routes touched
- ~3,500+ fields written
- 0 database errors (if service key is valid)

### Step 6: Spot-Check (30 min)

Sample 10–15 routes from each batch:

**Batch 1 sample:** Mount Shuksan (high-profile peak, should have comprehensive data)
- Check: gain_ft populated, approach text >500 chars, FA documented
- Check: hazards (bergschrund, crevasses, exposure) documented

**Batch 2 sample:** Mount Hinman (popular alpine peak)
- Check: elevation gain accurate (should be ~5,000+ ft)
- Check: descent text detailed (multiple descent options)

**Batch 3 sample:** Sentinel Peak (Ptarmigan Traverse waypoint)
- Check: approach text includes glacier travel details
- Check: timing section has day-by-day itinerary

**Batch 4 sample:** Mount Triumph (Pickets area)
- Check: FA history documented
- Check: objective hazards detailed (crevasses, cornices, etc.)

### Step 7: Commit & Open PR (10 min)

```bash
git add enrichment-wip/findings_phase2_*.json enrichment-wip/apply_enrich_thin.mjs
git commit -m "Phase 2 complete: 158 peaks researched, ~3,500 fields applied"

gh pr create --draft --title "Phase 2: 158 remaining WA peaks researched & applied" \
  --body "Continuation of elevation gain & approach audit. Researched 158 remaining peaks (260 routes), applied to Supabase with 0 errors. Combined with phase 1: all 225+ WA alpine/scramble/mountaineering peaks now have verified elevation gain and enriched approach text."
```

## Troubleshooting

### "Spend limit" error during workflow
- Expected behavior if budget runs out mid-batch
- Save partial results from completed agents
- Resume remaining peaks in subsequent session
- Do NOT re-run completed peaks (wastes budget + creates duplicates)

### Database apply fails with "Invalid API key"
- Check service key is still valid in Supabase Dashboard > Project Settings > API
- May need rotation if 3+ months old (last checked 2026-07-15)
- Request new service_role key from Supabase if needed

### Workflow agents timeout
- Very rare; happens only on network hiccups
- Re-run that specific batch (entire batch, not individual agents)
- Check your internet connection first

## Expected Results

### Database State After Phase 2

| Metric | Phase 1 | Phase 2 | Total |
|--------|---------|---------|-------|
| Peaks researched | 67 | 158 | **225+** |
| Routes updated | 170 | 260 | **430+** |
| Fields written | 2,281 | 3,500+ | **5,781+** |
| Peak blurbs added | 17 | ~40 | **~57** |
| gain_ft corrections | 58 | ~80 | **~138** |

### App Impact

- **Technical Stats "Gain" tile:** Now accurate for 225+ peaks (most of WA alpine/scramble catalog)
- **Route detail pages:** Comprehensive approach text, descent methods, hazards, timing for 430+ routes
- **First ascent history:** Verified and documented across major peaks
- **Seasonal guidance:** Updated based on current conditions (ice trends, water conditions, etc.)

## Files Created for Phase 2

| File | Purpose | Size | Status |
|------|---------|------|--------|
| `enrichment-wip/phase2_batch_1.json` | 40 peaks, 86 routes | ~450 KB | Ready |
| `enrichment-wip/phase2_batch_2.json` | 40 peaks, 78 routes | ~420 KB | Ready |
| `enrichment-wip/phase2_batch_3.json` | 40 peaks, 51 routes | ~350 KB | Ready |
| `enrichment-wip/phase2_batch_4.json` | 38 peaks, 47 routes | ~320 KB | Ready |
| `enrichment-wip/wf_run_phase2_batch*.js` | Generated at launch | ~40–50 KB each | Generate on demand |
| `enrichment-wip/findings_phase2_*.json` | Research output | ~1.5 MB (estimated) | Generated after workflows |

## Key Contacts

**For API/Budget Questions:**
- Claude Dashboard: claude.ai/settings/usage (check remaining budget balance)

**For Supabase Service Key Issues:**
- Supabase Dashboard: https://app.supabase.com/project/[project-id]/settings/api
- Service Role Key: Project Settings > API > service_role (keep it secret)

**For Workflow Monitoring:**
- Claude Code: `/workflows` command to watch live progress

## Timeline

| Date | Milestone | Owner | Status |
|------|-----------|-------|--------|
| 2026-07-15 | Phase 1 complete (67 peaks applied) | ✅ Done | Merged to main |
| ~2026-08-15 | API budget reset | Claude | Expected |
| 2026-08-15+ | Phase 2 execution (launch workflows) | You | Ready to go |
| 2026-08-15 + 6 hrs | Phase 2 apply (Supabase write) | You | Expected |
| 2026-08-15 + 8 hrs | Spot-check & PR | You | Target |
| 2026-08-20 (target) | Merge phase 2 PR | You | Final |

**Total Catalog Coverage:** 225+ peaks (84% of WA alpine/scramble/mountaineering routes)

---

## Quick Start (When Budget Resets)

```bash
# 1. Generate batch scripts
python3 scripts/generate_phase2_workflows.py

# 2. Launch in Claude Code
# Workflow({scriptPath: "enrichment-wip/wf_run_phase2_batch1.js"})
# Workflow({scriptPath: "enrichment-wip/wf_run_phase2_batch2.js"})
# Workflow({scriptPath: "enrichment-wip/wf_run_phase2_batch3.js"})
# Workflow({scriptPath: "enrichment-wip/wf_run_phase2_batch4.js"})

# 3. Wait ~60 min for all to complete

# 4. Consolidate findings
python3 scripts/consolidate_phase2_findings.py

# 5. Apply to DB
SUPABASE_SERVICE_KEY="..." node enrichment-wip/apply_enrich_thin.mjs enrichment-wip/findings_phase2_2026_08_15.json

# 6. Commit
git add enrichment-wip/findings_phase2_*.json
git commit -m "Phase 2: 158 peaks researched and applied"

# 7. Open PR
gh pr create --draft --title "Phase 2: 158 remaining WA peaks"
```

**Elapsed time:** ~2 hours hands-on + ~6 hours automated workflows

---

## Historical Context (Phase 1)

See `ELEVATION_APPROACH_AUDIT_2026_07_15.md` and `AUDIT_COMPLETION_REPORT_2026_07_15.md` for full phase 1 documentation, methodology, and spot-check results.

**Key achievements phase 1:**
- Validated 5-batch parallelization pattern (proven reusable)
- Validated apply_enrich_thin.mjs script (2,281 fields, 0 errors)
- Corrected critical overstatements (Mt Adams -119%, Mt Rainier Curtis -29%)
- Established multi-source research methodology (Mountain Project, SummitPost, Peakbagger, USGS, NPS)

Phase 2 uses identical methodology with improved batch sizing.

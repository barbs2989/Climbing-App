#!/bin/bash
set -e
cd "$(dirname "$0")/.."
SUPABASE_SERVICE_KEY="$(grep '^SUPABASE_SERVICE_KEY=' .env | cut -d= -f2-)" \
  node enrichment-wip/apply_enrich.mjs /Users/nathanbarber/.claude/jobs/92760633/tmp/consolidated_findings.json

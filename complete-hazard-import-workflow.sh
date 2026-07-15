#!/bin/bash

# Complete workflow for hazard documentation research and import

set -e

echo "============================================"
echo "HAZARD DOCUMENTATION IMPORT WORKFLOW"
echo "============================================"
echo ""

WORK_DIR="/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints"
RESEARCH_DIR="$WORK_DIR/research-data"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check research data
echo -e "${YELLOW}[1/6] Checking research data...${NC}"
if [ ! -d "$RESEARCH_DIR" ]; then
  echo -e "${RED}✗ Research directory not found${NC}"
  echo "Creating: $RESEARCH_DIR"
  mkdir -p "$RESEARCH_DIR"
  echo -e "${YELLOW}⚠ Please place research JSON files in: $RESEARCH_DIR${NC}"
  echo "Expected format: research-data/*.json"
  exit 1
fi

RESEARCH_FILES=$(find "$RESEARCH_DIR" -name "*.json" 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Found $RESEARCH_FILES research files${NC}"

if [ $RESEARCH_FILES -eq 0 ]; then
  echo -e "${RED}✗ No research data files found${NC}"
  echo "Waiting for research agents to complete..."
  echo "Place JSON files in: $RESEARCH_DIR"
  exit 1
fi

# Step 2: Consolidate research
echo ""
echo -e "${YELLOW}[2/6] Consolidating research data...${NC}"
cd "$WORK_DIR"
node consolidate-hazard-research.mjs

# Step 3: Check import file exists
echo ""
echo -e "${YELLOW}[3/6] Verifying import file...${NC}"
if [ -f "$WORK_DIR/wa-ice-alpine-import.json" ]; then
  ROUTE_COUNT=$(jq length "$WORK_DIR/wa-ice-alpine-import.json")
  echo -e "${GREEN}✓ Import file ready: $ROUTE_COUNT routes${NC}"
else
  echo -e "${RED}✗ Import file not found${NC}"
  exit 1
fi

# Step 4: Import to database
echo ""
echo -e "${YELLOW}[4/6] Importing to database...${NC}"
node import-watch-out.mjs

# Step 5: Verify coverage
echo ""
echo -e "${YELLOW}[5/6] Verifying coverage...${NC}"
node verify-hazard-import.mjs

# Step 6: Generate final report
echo ""
echo -e "${YELLOW}[6/6] Generating final report...${NC}"
node query_watch_out_comprehensive.mjs | head -100

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}WORKFLOW COMPLETE${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review detailed report: wa-ice-alpine-import-report.txt"
echo "2. Check unmatched routes: unmatched-routes.json"
echo "3. For remaining work, run: node research-missing-peaks.mjs"
echo ""

# Testing & Verification Checklist

**Session**: Climbing Research Deployment + Permit Data Import  
**Date**: 2026-07-16  
**Scope**: Browser testing with real data, performance audit, mobile responsiveness

---

## PHASE 1: CLIMBING RESEARCH DATA VERIFICATION

### Route Detail Page (Safety Tab)
- [ ] Open a climbing route (e.g., Mount Rainier, Index Town Wall)
- [ ] Verify hazard/watch_out array displays in Safety section
- [ ] Confirm hazards are readable and properly formatted
- [ ] Check that multiple hazards show as list items
- [ ] Verify no console errors on load

### Sample Routes to Test
1. **Alpine Route**: Mount Rainier (Camp Muir)
   - Expected: Altitude, crevasse, weather hazards
   - Should display in Safety tab

2. **Sport Climbing**: Index Town Walls
   - Expected: Loose rock, water seepage, freeze-thaw hazards
   - Should display with severity indicators

3. **Trad Rock**: Leavenworth/Little Si
   - Expected: Protection quality, anchor reliability hazards
   - Should show route-specific warnings

### Navigation Testing
- [ ] Climbs tab loads correctly
- [ ] Route search finds new climbing research routes
- [ ] Filters work (discipline, grade, region)
- [ ] Route detail page renders all sections

---

## PHASE 2: PERMIT/ACCESS DATA VERIFICATION

### ACCESS & REGULATIONS Panel
- [ ] Panel displays for routes with access data
- [ ] Permit field shows permit requirements
- [ ] Fees field shows cost information
- [ ] Seasonal closures display (if applicable)
- [ ] Land manager information appears
- [ ] Links to permit websites work

### Sample Routes to Test Permits
1. **Mount Rainier**
   - Expected: NPS permit required, $30 entry fee
   - Should show seasonal windows

2. **Mount Baker**
   - Expected: Forest Pass required
   - Should show permit link

3. **Glacier Peak**
   - Expected: Wilderness permit + closure info (Suiattle washout)
   - Should display active closure warning

---

## PHASE 3: PERFORMANCE TESTING

### Load Time
- [ ] Initial page load < 3 seconds
- [ ] Route detail page loads < 2 seconds
- [ ] Search/filter response < 1 second
- [ ] No long loading spinners

### Bundle Size
- [ ] Main bundle: 1.6MB (uncompressed)
- [ ] Gzipped: 420KB
- [ ] No unnecessary large files

### Mobile Responsiveness
- [ ] App works on 390px width (iPhone SE)
- [ ] Hazard list displays properly on mobile
- [ ] Permit panel readable on small screens
- [ ] Touch targets are adequate (44px+)

---

## PHASE 4: DATA CONSISTENCY CHECKS

### Database Consistency
- [ ] Route count matches (8,172+)
- [ ] Hazard count matches expected
- [ ] No orphaned routes (all have valid area_id)
- [ ] Permit data matches routes (no mismatches)

### UI Consistency
- [ ] Colors/styling consistent across pages
- [ ] No broken icons or images
- [ ] Text is properly formatted (no HTML escaping issues)
- [ ] Spacing/alignment correct

---

## PHASE 5: BROWSER COMPATIBILITY

### Desktop
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)

### Mobile
- [ ] iOS Safari
- [ ] Chrome Mobile
- [ ] Firefox Mobile

---

## PHASE 6: FUNCTIONALITY EDGE CASES

### Empty/Missing Data
- [ ] Routes without hazards display correctly
- [ ] Routes without permit info don't error
- [ ] Null/undefined values handled gracefully

### Large Data
- [ ] Routes with 10+ hazards display correctly
- [ ] Long permit text wraps properly
- [ ] No truncation of important info

### Special Characters
- [ ] French accents (Chamonix, Écrins)
- [ ] Degree symbols in aspect/grade
- [ ] Special characters in hazard descriptions

---

## TEST RESULTS

### Summary
- **Date Tested**: _________
- **Tester**: _________
- **Status**: ⬜ Not Started | 🟡 In Progress | 🟢 Complete

### Issues Found
1. Issue: _________
   - Severity: High/Medium/Low
   - Fix: _________

2. Issue: _________
   - Severity: High/Medium/Low
   - Fix: _________

### Sign-Off
- [ ] All critical issues resolved
- [ ] Performance acceptable
- [ ] Mobile responsive
- [ ] Ready for production

---

**Next Phase**: Deploy to GitHub Pages

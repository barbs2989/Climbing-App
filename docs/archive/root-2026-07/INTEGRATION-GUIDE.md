# ClimbMatch.jsx: Feedback Loop Persistence Integration

**Scope**: Wire database persistence (crews, logs, vouches, trust) into the existing React component  
**Status**: Phase 1 plan  
**Timeline**: 4-5 hours implementation  

---

## Phase 1: Crew Persistence (1.5 hours)

### Step 1a: Load crews from Supabase on app start
- Change: Inside `App()`, at mount (via `useEffect`):
  - Use `useUserCrews(session?.user?.id)` to fetch active crews
  - Use `useUserArchivedCrews(session?.user?.id)` to fetch past crews
  - On load, set `myCrew` state from DB instead of seed data
  - Remove or deprecate `DEMO_FILLERS` gate for crews

### Step 1b: Sync crew changes to DB
- When crew status changes (forming → ready → completed):
  - Call `updateCrew(crewId, { status: "ready", ... })`
  - Handle optimistic updates (update local state first, DB second)
  - Add error toast if sync fails

- When crew archived (manual dismiss or 3-day auto-timeout):
  - Call `archiveCrew(crewId)`
  - Move from `myCrew` to `pastCrews` array

### Step 1c: Create new crew
- In crew-creation flow (button → form → submit):
  - Call `createCrew(userId, routeId, memberArray)`
  - Update local state with returned crew object
  - Show success toast

### Files to modify
- `ClimbMatch.jsx`: Lines 2208+ (App component)
  - Add `useUserCrews()` + `useUserArchivedCrews()` hooks
  - Add `useEffect` to sync state from DB
  - Modify crew creation/update/archive handlers to call DB mutations

---

## Phase 2: Log Persistence (1.5 hours)

### Step 2a: Load logs from Supabase on app start
- Inside `App()`:
  - Use `useUserLogs(session?.user?.id)` to fetch user's climb logs
  - On load, populate from DB instead of seed `LOGS` array
  - Migrate `myLogs` state to use DB data

### Step 2b: Sync log creation/updates
- When user creates a log (LogAscent form submit):
  - Call `createClimbLog(userId, routeId, logData)`
  - Include: discipline, date_climbed, stars, cond_tags, partners, crew_id, etc.
  - Handle discipline-specific fields (alpine/ice vs. sport/trad)

- When user edits a log:
  - Call `updateClimbLog(logId, updatedFields)`
  - Sync to DB, show error if fails

- When user deletes a log:
  - Call `deleteClimbLog(logId)`

### Step 2c: Trip reports for consensus
- Modify `buildConsensus()` to optionally fetch trip reports from DB:
  - Call `useRouteTripReports(routeId)` 
  - Weight reports by `compute_trust_score(user_id)` (live, not static)
  - Combine with seed data reports (fall back if DB unavailable)

### Files to modify
- `ClimbMatch.jsx`: LogAscent form
  - Modify on-submit to call `createClimbLog()` instead of local state update
  - Pass crew_id when logging from crew card
  - Auto-fill partners from crew roster

- `ClimbMatch.jsx`: buildConsensus() function (~L344)
  - Query trip reports from DB
  - Use live `compute_trust_score()` instead of static `trustScore`

---

## Phase 3: Trust Scoring (1 hour)

### Step 3a: Compute trust scores from DB
- Replace static `trustScore` seed values with live computation:
  - Call `getTrustScore(userId)` when rendering FullProfile or elsewhere
  - Cache result in local state (recompute only on change)
  - Show trust breakdown: verification (5 pts) + tenure (20 pts) + vouches (20 pts) + logs (15 pts) + reports (14 pts) + catches (10 pts) = max 99

### Step 3b: Add vouch management
- In FullProfile / Partner cards:
  - Show "Vouch for this climber" button
  - On click: `giveVouch(meId, climberId, reason)`
  - On vouch given: increment trust score, show confirmation
  - Show existing vouches from friends

### Step 3c: Belay catch tracking
- In LogAscent or post-climb flow:
  - Optional "Belayed by" field
  - Optional "Caught a fall" checkbox
  - On submit: call `logBelajCatch(belayer_id, climber_id, date, description)`
  - This increments trust score (+2 per catch)

### Files to modify
- `ClimbMatch.jsx`: FullProfile component (~L1189)
  - Show live trust score from `getTrustScore()`
  - Add "Vouch" button
  - Display vouch count and breakdown

- `ClimbMatch.jsx`: LogAscent form
  - Add optional "Belayed by" partner dropdown
  - Add "Caught fall" checkbox
  - On submit, call `logBelajCatch()` after `createClimbLog()`

---

## Phase 4: Account Linking (1 hour)

### Step 4a: Add account linking UI
- In Settings/Profile tab, new section "Linked Accounts":
  - Show current account (primary/secondary)
  - If primary: "Link secondary account" button → opens modal
  - Modal: email/password login form to link second account
  - On submit: `linkSecondaryAccount(primaryId, secondaryId)`
  - Then: `confirmAccountLink()` to merge data

- If secondary:
  - Show "Primary account: [name]"
  - "Unlink from primary" button → call `revokeAccountLink()`

### Step 4b: Support simultaneous login (Phase 4)
- Track two active auth sessions:
  - Primary: Supabase auth session (current)
  - Secondary: Stored in localStorage via `storeLinkedSession()`
- Switch between accounts via dropdown in header
- Show both accounts' crews/logs aggregated or separately (TBD)

### Files to modify
- `ClimbMatch.jsx`: Profile tab, Settings section
  - Add "Linked Accounts" UI
  - Call `linkSecondaryAccount()` / `confirmAccountLink()`

---

## Phase 5: Testing & Validation (1 hour)

### Browser testing
- [ ] Create crew → saved to DB → refresh page → crew still there
- [ ] Edit crew (add dates, confirm ready) → updates in DB → appears on route page
- [ ] Archive crew → moved to "Past Crews" → still queryable in DB
- [ ] Create log → DB persists → visible in logbook
- [ ] Edit log → updates reflected immediately
- [ ] Trust score increases as user logs climbs, gets vouches, logs belay catches
- [ ] Link secondary account → data merged correctly
- [ ] Switch between accounts → see separate data or unified view

### Performance targets
- [ ] Crew load: < 1 sec (useUserCrews query)
- [ ] Log creation: < 500ms (createClimbLog + optimistic update)
- [ ] Trust score fetch: < 200ms (getTrustScore cached)
- [ ] No N+1 queries (batch fetch all linked profiles at once)

### Edge cases
- [ ] User has no crews yet → show empty state
- [ ] Offline mode → queue mutations locally, sync when online (future)
- [ ] Crew member leaves mid-planning → handle gracefully
- [ ] Two crews on same route → different data (not merged)

---

## Success Criteria

✅ Crews persist across page refreshes  
✅ Logs persist in logbook  
✅ Trust scores update live  
✅ Account linking works (Phase 3) with data merge  
✅ No console errors during normal workflows  
✅ Offline fallback: seed data still works if DB unavailable  
✅ Performance: all queries < 1 sec  
✅ Mobile responsive  

---

## Implementation Notes

**Backward compatibility**: Keep seed data (`ROUTES`, `MOUNTAINS`, `CLIMBERS`, `LOGS`, `CREWS`) as fallback if DB unavailable. Don't delete — just deprioritize.

**Optimistic updates**: For fast UX, update local state immediately on user action, then sync to DB. If DB fails, roll back and show error toast.

**RLS policies**: All queries use authenticated user context (auth.uid()). Make sure Supabase auth is set up correctly before testing.

**Real-time sync**: (Future) Use Supabase realtime subscriptions (`.on()`) to auto-update if other users change shared data (e.g., crew members editing dates concurrently).

---

## Files & Lines to Watch

- `ClimbMatch.jsx:2208+` — App component, mount hook
- `ClimbMatch.jsx:344` — buildConsensus function
- `ClimbMatch.jsx:1189` — FullProfile component
- `ClimbMatch.jsx:1500+` — LogAscent form (search for "LogAscent" function)
- `ClimbMatch.jsx:1600+` — Crew card components

---

**Next**: Begin Phase 1 integration (crew persistence).

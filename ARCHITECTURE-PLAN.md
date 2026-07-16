# Architecture Work: Auth & Feedback Loop

**Scope**: Complete multi-account auth unification and persistent feedback loop  
**Estimated**: 8-12 hours  
**Status**: Planning phase  

## PHASE 1: Auth Phases 3-4 (Multi-Account Unification)

### Current State (from memory)
- Phase 1-2: ✅ Done (profiles, real login)
- Phase 3-4: ⏳ Pending (two-account unification)

### Work Required

**Phase 3: Secondary Account Linking**
- [ ] Create account linking UI (Settings tab)
- [ ] Implement Supabase function for account merge
- [ ] Link secondary profiles to primary account
- [ ] Test account unification flow
- [ ] Handle permissions/roles merge

**Phase 4: Full Two-Login Support**
- [ ] Support simultaneous login to two accounts
- [ ] Crew/group membership consolidation
- [ ] Cross-account activity aggregation
- [ ] Statistics/leaderboards across accounts
- [ ] Test multi-account workflows

### Key Files to Modify
- `lib/auth.js` - Session management
- `lib/AuthModal.jsx` - Auth UI
- `ClimbMatch.jsx` - Account state management
- `.../migrations/0035_account_linking.sql` - Database schema

---

## PHASE 2: Feedback Loop Persistence (Crews/Logs to DB)

### Current State
- ✅ UI redesigned (Phase B)
- ⏳ Still session-only (data lost on refresh)
- Need: Supabase wiring

### Work Required

**Crews Persistence**
- [ ] Save crews table to Supabase on creation/update
- [ ] Load crews from DB on app start
- [ ] Real-time sync for crew changes
- [ ] Delete crews from DB

**Logs/Activity Persistence**
- [ ] Save climb logs to Supabase
- [ ] Link logs to routes and crews
- [ ] Trip report storage
- [ ] Photo attachment handling

**Trust/Vouches Persistence**
- [ ] Save vouches to Supabase
- [ ] Update trust scores in real-time
- [ ] Belay catch ledger storage
- [ ] Historical verification records

### Key Files to Modify
- `lib/db.js` - Database queries
- `ClimbMatch.jsx` - State hooks
- `.../migrations/0036_crews_persistence.sql`
- `.../migrations/0037_logs_persistence.sql`

---

## PHASE 3: Testing & Verification

### Test Cases
- [ ] Create account, link secondary, verify merge
- [ ] Login to primary and secondary, cross-account data visible
- [ ] Create crew, refresh page, crew still exists
- [ ] Add log, submit photos, verify in DB
- [ ] Grant vouch, refresh, vouch persists
- [ ] Multi-account leaderboards correct

### Performance Targets
- Account link: < 2 seconds
- Crew load: < 1 second
- Log submission: < 500ms

---

## Implementation Priority

1. **Auth linking** (Days 1-2) - 4-5 hours
2. **Crews persistence** (Days 2-3) - 3-4 hours  
3. **Logs persistence** (Days 3-4) - 2-3 hours
4. **Testing** (Day 4) - 1-2 hours

**Total**: 10-14 hours

---

## Dependencies

- Supabase auth policies set up
- Database migrations written
- No external service changes required

---

## Success Criteria

✅ Can create/link multiple accounts  
✅ Can login to both accounts simultaneously  
✅ Crews persist across sessions  
✅ Climb logs stored in Supabase  
✅ Vouches and trust scores persist  
✅ All data synced in real-time  
✅ Mobile responsive  
✅ No performance regression

# ClimbMatch.jsx: Crew Persistence Migration Script

**Status**: Mapped, ready for implementation  
**Confidence**: High (Explore agent provided exact line numbers + code snippets)

---

## Part 1: State Initialization (Line 3438)

### Before
```javascript
[crews,setCrews]=useState([{id:"crew_seed_tingey",routeId:"lcc_hellgate_tingey",...},...])
```

### After
```javascript
// Load crews from DB (or seed data if DB unavailable)
const session = useSession();
const { active: dbCrews, archived: dbArchivedCrews, loading: crewsLoading } = usePersistentCrews(session?.user?.id);
const [crews, setCrews] = useState([]); // Now populated by useEffect below

// Fallback to seed data during loading or if DB unavailable
useEffect(() => {
  if (crewsLoading) return; // Still loading from DB
  if (dbCrews.length > 0) {
    // Use DB crews (converted to local format)
    setCrews(dbCrews.map(dbCrewToLocal));
  } else if (!supabase) {
    // Fallback to seed data if DB unavailable
    setCrews([{id:"crew_seed_tingey",routeId:"lcc_hellgate_tingey",...}]);
  }
}, [dbCrews, crewsLoading]);
```

### Import at top of file
```javascript
import { usePersistentCrews, persistCreateCrew, persistUpdateCrew, persistArchiveCrew, dbCrewToLocal, isCrewReady } from "./lib/feedbackLoop";
import { useSession } from "./lib/auth";
```

---

## Part 2: Computed State (Line 3470)

### Before
```javascript
const activeCrews=crews.filter(c=>!isArchivedCrew(c,logs));
const pastCrews=crews.filter(c=>isArchivedCrew(c,logs));
```

### After
```javascript
// Combine DB and local crews for filtering
const allCrews = [...crews, ...dbArchivedCrews.map(dbCrewToLocal)];
const activeCrews = allCrews.filter(c => !isArchivedCrew(c, logs));
const pastCrews = allCrews.filter(c => isArchivedCrew(c, logs));
```

---

## Part 3: Crew Creation (Line 3459)

### Before
```javascript
const formCrew=(routeId,partners,meta)=>{
  const cid="crew_"+routeId+"_"+Date.now();
  setCrews(p=>[...p,{
    id:cid,
    routeId,
    members:partners.map(c=>({climberId:c.id,status:"invited",...})),
    ...
  }]);
  setOpenCrewId(cid);
  setCrewView("crews");
  setTab("crew");
};
```

### After
```javascript
const formCrew = async (routeId, partners, meta) => {
  // Create optimistically in local state
  const cid = "crew_" + routeId + "_" + Date.now();
  const newCrew = {
    id: cid,
    routeId,
    members: partners.map(c => ({climberId: c.id, status: "invited", ...})),
    ...meta,
  };
  setCrews(p => [...p, newCrew]);
  
  // Sync to DB in background
  if (session?.user?.id) {
    const result = await persistCreateCrew(session.user.id, routeId, newCrew.members);
    if (!result.success) {
      showToast("Failed to save crew: " + result.error);
      // Remove optimistic update
      setCrews(p => p.filter(c => c.id !== cid));
    } else {
      // Update local state with DB-generated ID
      setCrews(p => p.map(c => c.id === cid ? { ...result.crew, ...dbCrewToLocal(result.crew) } : c));
      cid = result.crew.id;
    }
  }
  
  setOpenCrewId(cid);
  setCrewView("crews");
  setTab("crew");
};
```

---

## Part 4: Crew Updates (Lines 3461-3462)

### Pattern for all crew mutations
Each function that modifies crew state (acceptCrewInvite, meAgreeDates, updateCrew, etc.) needs this pattern:

**Before (example: meAgreeDates)**
```javascript
const meAgreeDates=(cid,day)=>{
  setCrews(cs=>cs.map(c=>{
    if(c.id!==cid)return c;
    const da=Object.assign({},c.dayAcks||{});
    const a=da[day]||[];
    da[day]=a.includes(0)?a.filter(x=>x!==0):[...a,0];
    return {...c,dayAcks:da};
  }));
};
```

**After (sync pattern)**
```javascript
const meAgreeDates = async (cid, day) => {
  // Optimistic update
  const oldCrews = crews;
  setCrews(cs => cs.map(c => {
    if(c.id !== cid) return c;
    const da = Object.assign({}, c.dayAcks || {});
    const a = da[day] || [];
    da[day] = a.includes(0) ? a.filter(x => x !== 0) : [...a, 0];
    return {...c, dayAcks: da};
  }));
  
  // Sync to DB
  const crew = crews.find(c => c.id === cid);
  if (crew && session?.user?.id) {
    const result = await persistUpdateCrew(cid, {
      dayAcks: crew.dayAcks,
      updated_at: new Date().toISOString()
    });
    if (!result.success) {
      showToast("Failed to update crew: " + result.error);
      setCrews(oldCrews); // Rollback
    }
  }
};
```

**Apply this pattern to:**
- `acceptCrewInvite()` (line 3461)
- `meAgreeDates()` (line 3462)
- `acceptJoin()` (line 3463)
- `updateCrew()` (line 3481)
- Any other crew modification function

---

## Part 5: Crew Archival (Line 3471)

### Before
```javascript
const dismissCrew=cid=>{
  setCrews(p=>p.map(cr=>cr.id===cid?{...cr,dismissed:true}:cr));
  showToast("Crew moved to Past Crews");
};
```

### After
```javascript
const dismissCrew = async (cid) => {
  // Optimistic
  setCrews(p => p.map(cr => cr.id === cid ? {...cr, dismissed: true} : cr));
  
  // Sync to DB
  if (session?.user?.id) {
    const result = await persistArchiveCrew(cid);
    if (!result.success) {
      showToast("Failed to archive crew: " + result.error);
      setCrews(p => p.map(cr => cr.id === cid ? {...cr, dismissed: false} : cr));
    }
  }
  
  showToast("Crew moved to Past Crews");
};
```

---

## Part 6: Logs Persistence Integration

### Load logs from DB (similar to crews)
```javascript
// At state initialization (line 3438)
const { logs: dbLogs, loading: logsLoading } = usePersistentLogs(session?.user?.id);
const [logs, setLogs] = useState([]); // Previously populated from seed LOGS

useEffect(() => {
  if (logsLoading) return;
  if (dbLogs.length > 0) {
    setLogs(dbLogs.map(dbLogToLocal));
  } else if (!supabase) {
    setLogs([...LOGS]); // Fallback seed data
  }
}, [dbLogs, logsLoading]);
```

### LogAscent form submission
Find where LogAscent saves logs (line ~2100 in form):

```javascript
// Old: setLogs(p => [...p, newLog])
// New: await persistCreateLog(session.user.id, routeId, logData)
const result = await persistCreateLog(session.user.id, routeId, {
  discipline: selectedDiscipline,
  date_climbed: dateClimbed,
  stars: starsRating,
  cond_tags: conditionTags,
  notes: logNotes,
  partners: selectedPartners,
  crew_id: crewIdContext || null,
  // ... other fields
});

if (result.success) {
  setLogs(p => [...p, dbLogToLocal(result.log)]);
  showToast("Log saved!");
} else {
  showToast("Failed to save log: " + result.error);
}
```

---

## Part 7: Trust Score Integration

### Replace static vScore with live computation
Find `vScore()` function (~line 335):

```javascript
// Old:
function vScore(c) {
  if (!c) return 50;
  var tf = trustFactors(c);
  var sum = 0, max = 0;
  tf.forEach(function(f) { sum += f.pts; max += f.max; });
  return max ? Math.min(99, Math.round(sum / max * 99)) : 0;
}

// New: Use live DB computation
async function vScore(c) {
  if (!c || !c.id) return 50;
  const score = await fetchTrustScore(c.id);
  if (score !== null) return score;
  // Fallback to static calculation if DB unavailable
  var tf = trustFactors(c);
  var sum = 0, max = 0;
  tf.forEach(function(f) { sum += f.pts; max += f.max; });
  return max ? Math.min(99, Math.round(sum / max * 99)) : 0;
}
```

Or cache scores in component state to avoid async issues:

```javascript
const [trustScores, setTrustScores] = useState({});

useEffect(() => {
  // Fetch trust scores for all climbers visible on screen
  if (!session?.user?.id) return;
  
  const climbersToFetch = visibleClimbers.filter(c => !trustScores[c.id]);
  Promise.all(climbersToFetch.map(c => fetchTrustScore(c.id)))
    .then(scores => {
      const newScores = {};
      climbersToFetch.forEach((c, i) => {
        newScores[c.id] = scores[i];
      });
      setTrustScores(p => ({...p, ...newScores}));
    });
}, [visibleClimbers]);

function vScore(c) {
  if (!c) return 50;
  return trustScores[c.id] ?? 50; // Use cached score or fallback
}
```

---

## Implementation Roadmap

1. **Step 1**: Add imports and feedbackLoop module (10 min)
2. **Step 2**: Modify state initialization for crews + logs (15 min)
3. **Step 3**: Wrap formCrew with DB sync (10 min)
4. **Step 4**: Wrap crew update functions with DB sync (20 min)
5. **Step 5**: Wire LogAscent submission to createClimbLog (15 min)
6. **Step 6**: Cache trust scores for performance (15 min)
7. **Step 7**: Test in browser (30 min)

**Total**: ~2 hours

---

## Testing Checklist

- [ ] Create crew → appears in DB → survives page refresh
- [ ] Update crew dates → synced to DB → visible in crew card
- [ ] Archive crew → removed from active, added to past crews
- [ ] Create log → appears in logbook → accessible in trip reports
- [ ] Trust score displays for climbers
- [ ] Offline fallback: seed data shows if DB unavailable
- [ ] No console errors
- [ ] Performance: crew operations < 500ms

---

## Risk Mitigation

**Rollback Strategy**: Each DB call is wrapped in try/catch. If DB write fails:
1. Show error toast
2. Revert optimistic update
3. Log error to console
4. Seed data continues to work

**Performance**: Cache trust scores instead of computing live to avoid N+1 queries.

**Compatibility**: Seed data remains as fallback if DB unavailable, ensuring app still works offline.

---

## Success Criteria

✅ All crew mutations sync to DB  
✅ Logs persist across sessions  
✅ Trust scores computed live  
✅ No console errors  
✅ Performance acceptable  
✅ Rollback works on DB failures  

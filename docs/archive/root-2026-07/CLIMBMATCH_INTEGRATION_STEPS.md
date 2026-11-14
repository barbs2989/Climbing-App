# ClimbMatch.jsx Integration Guide — GPS Submission Feature

This document outlines the exact changes needed to integrate the crowdsource GPS feature into ClimbMatch.jsx.

**Target Lines:** (approximate, file is minified)
- Import section: Top of file (~line 1)
- State declarations in App(): ~line 2210 in useState section
- Modal render: ~line 2250-2280 (after other modals)
- Overview tab content: ~line 2290-2310 (after "Save to offline" button)

---

## Change 1: Import the New Components

**Location:** Top of file, after existing imports

**Add:**
```jsx
import GpsSubmissionModal from './lib/GpsSubmissionModal'
```

Should appear alongside other lib imports like `DbGuideApply`, `AuthModal`, etc.

---

## Change 2: Add State for GPS Modal

**Location:** In `App()` function, with other `useState` declarations (around line 2210)

**Add these two lines:**
```jsx
const [showGpsModal, setShowGpsModal] = useState(false)
```

**Context:** This state tracks whether the GPS submission modal is visible. Add it with other modal state declarations like `[shareOpen, setShareOpen]`, `[fixOpen, setFixOpen]`, etc.

---

## Change 3: Add Modal Render Portal

**Location:** In the JSX return tree, after all other modals (around line 2250-2280)

**Add:**
```jsx
{showGpsModal && selRoute && createPortal(
  <GpsSubmissionModal
    routeId={selRoute.id}
    routeName={selRoute.name}
    onClose={() => setShowGpsModal(false)}
    onSuccess={(result) => {
      // TODO: Show toast notification
      // toast.success('GPS track submitted! Under review (24-48 hours)')
      setShowGpsModal(false)
    }}
  />,
  document.body
)}
```

**Context:** Place after the `shareOpen` modal and before the route detail JSX. Use `createPortal` like other modals for z-index layering.

---

## Change 4: Add GPS Banner to Overview Tab

**Location:** In the overview tab render (around line 2290), after the "Save to offline" button

**Add this block:**
```jsx
{/* GPS Submission Banner */}
{selRoute && (!selRoute.gpx || !Array.isArray(selRoute.gpx) || selRoute.gpx.length < 3) && (
  <div style={{
    width: '100%',
    padding: '12px 14px',
    marginBottom: '12px',
    background: C.amberBg,
    border: '1px solid ' + C.amber,
    borderRadius: '11px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px'
  }}>
    <div>
      <div style={{fontSize: 13.5, fontWeight: 700, color: C.amber, marginBottom: '2px'}}>
        📍 Help improve this route
      </div>
      <div style={{fontSize: 12, color: C.text70}}>
        GPS data incomplete. Have a GPX track?
      </div>
    </div>
    <button
      onClick={() => setShowGpsModal(true)}
      style={{
        flexShrink: 0,
        padding: '8px 14px',
        borderRadius: '9px',
        border: 'none',
        background: C.amber,
        color: '#1a1200',
        fontSize: '13px',
        fontWeight: '700',
        cursor: 'pointer'
      }}
    >
      Submit Track
    </button>
  </div>
)}
```

**Context:** Insert after the "Save to offline" button and before the gap-fill warning section. The banner checks if `gpx` is missing or has fewer than 3 points.

---

## Step-by-Step Integration Instructions

### For Manual Integration (if not using a patch):

1. **Open ClimbMatch.jsx** in an editor
2. **Find the import section** at the top (look for `import DbAreaBrowser` or `import AuthModal`)
3. **Add:** `import GpsSubmissionModal from './lib/GpsSubmissionModal'`
4. **Find the App function** and locate the useState section (look for `const [tab, setTab]`)
5. **Add after other useState declarations:**
   ```jsx
   const [showGpsModal, setShowGpsModal] = useState(false)
   ```
6. **Find the modal portal section** (search for `{shareOpen?createPortal` or similar)
7. **Add the GPS modal portal** after existing modals but before the route detail content
8. **Find where "Save to offline" button renders** in the overview tab (around line 2300)
9. **Add the GPS banner** immediately after the "Save to offline" button
10. **Test:** 
    - Open a route with missing GPS (or `gpx.length < 3`)
    - Banner should appear
    - Click "Submit Track" → modal opens
    - Try pasting GPS coordinates
    - Validation and quality score should update

---

## Visual Layout

```
┌─────────────────────────────────┐
│  Route: Mount Terror            │
├─────────────────────────────────┤
│  [Save route to objectives]     │
│  [Log ascent?]                  │
│  [Save to offline]              │
│                                 │
│  ┌──────────────────────────────│  ← GPS BANNER (NEW)
│  │ 📍 Help improve this route   │
│  │ GPS data incomplete...       │
│  │        [Submit Track]        │
│  └──────────────────────────────│
│                                 │
│  ⚠️ This route's info has gaps  │
│  [Help fill in the gaps]        │
│                                 │
│  CONDITIONS WINDOW              │
│  Jun–Sep optimal                │
│                                 │
│  6 ascents logged · ...         │
└─────────────────────────────────┘
```

---

## Testing Checklist

After integration, verify:

- [ ] Banner appears on routes with missing GPS (`gpx === null` or `gpx.length < 3`)
- [ ] Banner does NOT appear on routes with sufficient GPS data
- [ ] Click "Submit Track" → modal opens
- [ ] Modal closes when user clicks Cancel or outside modal
- [ ] Paste text input works (try both GPX XML and coordinate list)
- [ ] File upload works (drag .gpx file or click)
- [ ] Quality score updates as coordinates are pasted
- [ ] Validation issues display when GPS data is incomplete
- [ ] Form validation requires date + confirmations before submit
- [ ] Success modal shows after successful submission
- [ ] Modal closes on success

---

## Files Modified

- **ClimbMatch.jsx** — Add imports, state, modal portal, banner

---

## Files Created (already done)

- **lib/gpxParser.js** — GPS parsing & validation utilities
- **lib/GpsSubmissionModal.jsx** — React component for submission UI

---

## Backend Integration (Phase C)

After frontend is working, next phase will:
1. Create Supabase edge function for validation
2. Wire modal to POST endpoint
3. Set up email notifications
4. Create admin approval flow

For now, modal logs submission to console and shows success state.

---

## Troubleshooting

**Modal won't open:**
- Check that `setShowGpsModal` is called in button onClick
- Verify modal is in a createPortal() wrapper
- Check browser console for errors

**Banner not showing:**
- Verify condition: `!selRoute.gpx || selRoute.gpx.length < 3`
- Check that route actually has no GPS (open DevTools → Network, query route data)
- Make sure condition is in the overview tab section

**Styling issues:**
- Use existing `C.` color palette (defined at top of ClimbMatch.jsx)
- Follow padding/margin pattern from surrounding buttons
- Test on mobile (390px viewport width)

---

## Next Steps After Frontend Complete

1. Create Supabase `gps_submissions` table (user runs SQL)
2. Deploy Supabase edge function `validate-gps` (Claude deploys)
3. Wire modal to call validation endpoint
4. Set up email handler for notifications
5. Test with real GPS data from Garmin/Strava
6. Launch: announce on WTA forums + climbing communities

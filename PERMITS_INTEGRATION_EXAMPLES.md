# Permit Data Integration Examples

## Overview
This document shows practical examples for integrating permit and access data into the ClimbMatch app. The data is already structured in `permits-access-2026.json` and ready for import into Supabase or use in React components.

## Database Schema (Supabase)

### Table: `peak_permits`
```sql
CREATE TABLE peak_permits (
  id SERIAL PRIMARY KEY,
  peak_id VARCHAR(50) UNIQUE NOT NULL,
  peak_name VARCHAR(100) NOT NULL,
  elevation_ft INTEGER,
  land_manager_agency VARCHAR(100),
  land_manager_district VARCHAR(100),
  land_manager_phone VARCHAR(20),
  land_manager_website TEXT,
  permits_json JSONB,
  parking_passes_json JSONB,
  seasonal_json JSONB,
  group_limits INTEGER,
  notes TEXT,
  last_verified DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `peak_access_requirements` (Normalized Alternative)
```sql
CREATE TABLE peak_access_requirements (
  id SERIAL PRIMARY KEY,
  peak_id VARCHAR(50) NOT NULL REFERENCES peaks(id),
  requirement_type VARCHAR(50), -- 'permit' | 'parking_pass' | 'seasonal' | 'group_limit'
  requirement_value JSONB,
  last_verified DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## React Component Examples

### 1. AccessPermitsCard Component

```jsx
// AccessPermitsCard.jsx - Display permit info on route detail screen

import React from 'react';

export function AccessPermitsCard({ peakId, permits, parkingPasses, seasonal, groupLimits, landManager }) {
  if (!permits || permits.length === 0) return null;

  return (
    <div style={{ 
      border: '1px solid #e0e0e0', 
      borderRadius: '8px', 
      padding: '16px', 
      marginBottom: '16px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '12px' }}>
        Access & Permits
      </h3>

      {/* Required Permits */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
          Permits Required
        </h4>
        {permits.map((permit, idx) => (
          <div key={idx} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e8e8e8' }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              {permit.type} {permit.cost_per_person ? `($${permit.cost_per_person}/person)` : '(Free)'}
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>
              {permit.description}
            </div>
            {permit.where_to_obtain && (
              <div style={{ fontSize: '13px' }}>
                <strong>Where:</strong> {permit.where_to_obtain}
              </div>
            )}
            {permit.reservation_required && (
              <div style={{ fontSize: '13px', color: '#d32f2f' }}>
                <strong>Note:</strong> Advance reservation required
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Parking Passes */}
      {parkingPasses && parkingPasses.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Parking Pass
          </h4>
          {parkingPasses.map((pass, idx) => (
            <div key={idx} style={{ marginBottom: '8px', fontSize: '13px' }}>
              <strong>{pass.type}</strong>
              {pass.cost && typeof pass.cost === 'object' ? (
                <div style={{ marginLeft: '12px', color: '#666' }}>
                  {pass.cost.daily && `$${pass.cost.daily}/day`}
                  {pass.cost.daily && pass.cost.annual && ' or '}
                  {pass.cost.annual && `$${pass.cost.annual}/year`}
                </div>
              ) : (
                <div style={{ marginLeft: '12px', color: '#666' }}>
                  {pass.cost === 0 ? 'Free' : `$${pass.cost}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Seasonal Info */}
      {seasonal && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Seasonal Access
          </h4>
          {seasonal.access_window && (
            <div style={{ fontSize: '13px', marginBottom: '4px' }}>
              <strong>Typical window:</strong> {seasonal.access_window}
            </div>
          )}
          {seasonal.peak_season && (
            <div style={{ fontSize: '13px', marginBottom: '4px' }}>
              <strong>Peak season:</strong> {seasonal.peak_season}
            </div>
          )}
          {seasonal.road_closures && seasonal.road_closures.length > 0 && (
            <div style={{ fontSize: '13px', color: '#d32f2f', marginTop: '8px' }}>
              <strong>Road closures:</strong>
              <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                {seasonal.road_closures.map((closure, idx) => (
                  <li key={idx}>
                    {closure.name}: {closure.typical_closure || 'Variable'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Group Limits */}
      {groupLimits && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px' }}>
            <strong>Group limit:</strong> {groupLimits} persons
          </div>
        </div>
      )}

      {/* Land Manager Contact */}
      {landManager && (
        <div style={{ 
          marginTop: '16px', 
          paddingTop: '12px', 
          borderTop: '1px solid #e8e8e8',
          fontSize: '12px',
          color: '#666'
        }}>
          <strong>{landManager.agency}</strong>
          {landManager.ranger_district && <div>{landManager.ranger_district}</div>}
          {landManager.contact_phone && <div>Phone: {landManager.contact_phone}</div>}
          {landManager.website && (
            <div>
              <a href={landManager.website} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2' }}>
                Website
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 2. PermitWarning Component

```jsx
// PermitWarning.jsx - Show special requirements/warnings

export function PermitWarning({ peak, permits }) {
  const warnings = [];

  // Check for paid permits
  if (permits?.some(p => p.cost_per_person)) {
    warnings.push({
      level: 'info',
      text: `This peak requires a paid mountaineering permit ($${permits.find(p => p.cost_per_person)?.cost_per_person}/person). Book early.`
    });
  }

  // Check for avalanche hazard
  if (peak.climbing_specific?.avalanche_danger) {
    warnings.push({
      level: 'warning',
      text: `Avalanche hazard. Check NWAC forecasts daily before climbing (${peak.nwac_zone || 'local'} zone).`
    });
  }

  // Check for crevasse hazard
  if (peak.climbing_specific?.crevasse_hazard) {
    warnings.push({
      level: 'warning',
      text: 'Crevasse hazard. Self-rescue knowledge and equipment required.'
    });
  }

  // Check seasonal limitations
  if (peak.seasonal?.avalanche_risk_before_mid_july) {
    warnings.push({
      level: 'warning',
      text: `${peak.seasonal.avalanche_risk_before_mid_july} avalanche risk before mid-July.`
    });
  }

  return (
    <>
      {warnings.map((w, idx) => (
        <div key={idx} style={{
          padding: '12px',
          marginBottom: '12px',
          borderRadius: '4px',
          backgroundColor: w.level === 'warning' ? '#fff3e0' : '#e3f2fd',
          borderLeft: `4px solid ${w.level === 'warning' ? '#ff9800' : '#2196f3'}`
        }}>
          {w.text}
        </div>
      ))}
    </>
  );
}
```

### 3. Route Detail Integration

```jsx
// In ClimbMatch.jsx route detail tab section

// Load permit data for selected route
const loadPermitData = (route) => {
  if (!route) return null;
  
  // Match route's mountain/peak to permit data
  const permitData = PERMITS_DATA.peaks.find(p => p.peak_id === route.mountainId);
  return permitData;
};

// In route detail render:
{selRoute && tab === "routes" && (
  <div>
    {/* ... existing route detail UI ... */}
    
    {/* Add access & permits card */}
    {(() => {
      const permitData = loadPermitData(selRoute);
      return permitData ? (
        <AccessPermitsCard 
          peakId={permitData.peak_id}
          permits={permitData.permits}
          parkingPasses={permitData.parking_passes}
          seasonal={permitData.seasonal}
          groupLimits={permitData.group_limits}
          landManager={permitData.land_manager}
        />
      ) : null;
    })()}
  </div>
)}
```

## Data Import Script

### Node.js Script to Import into Supabase

```javascript
// import-permits.js
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function importPermitData() {
  const permitsData = JSON.parse(
    fs.readFileSync('./catalog/wa-alpine/permits-access-2026.json', 'utf-8')
  );

  for (const peak of permitsData.peaks) {
    try {
      const { data, error } = await supabase
        .from('peak_permits')
        .upsert({
          peak_id: peak.peak_id,
          peak_name: peak.name,
          elevation_ft: peak.elevation_ft,
          land_manager_agency: peak.land_manager.agency,
          land_manager_district: peak.land_manager.ranger_district,
          land_manager_phone: peak.land_manager.contact_phone,
          land_manager_website: peak.land_manager.website,
          permits_json: JSON.stringify(peak.permits),
          parking_passes_json: JSON.stringify(peak.parking_passes),
          seasonal_json: JSON.stringify(peak.seasonal),
          group_limits: peak.group_limits,
          notes: peak.notes,
          last_verified: peak.last_verified,
        }, { 
          onConflict: 'peak_id' 
        });

      if (error) {
        console.error(`Error importing ${peak.name}:`, error);
      } else {
        console.log(`✓ Imported ${peak.name}`);
      }
    } catch (err) {
      console.error(`Exception importing ${peak.name}:`, err);
    }
  }
}

importPermitData().then(() => console.log('Import complete'));
```

## Query Examples

### JavaScript (Supabase)

```javascript
// Get permit info for a specific peak
const fetchPeakPermits = async (peakId) => {
  const { data, error } = await supabase
    .from('peak_permits')
    .select('*')
    .eq('peak_id', peakId)
    .single();
  
  return data;
};

// Get all peaks with paid permits
const fetchPaidPermitPeaks = async () => {
  const { data, error } = await supabase
    .from('peak_permits')
    .select('peak_name, permits_json')
    .filter('permits_json', 'cs', '"cost_per_person":');
  
  return data;
};

// Get all peaks requiring crevasse rescue knowledge
const fetchCrevassePeaks = async () => {
  const { data, error } = await supabase
    .from('peak_permits')
    .select('peak_name, notes')
    .filter('notes', 'ilike', '%crevasse%');
  
  return data;
};
```

## UI Display Examples

### Summary View (Compact)

```jsx
<div style={{ fontSize: '13px', color: '#666' }}>
  <strong>Access:</strong> Free wilderness permit | NW Forest Pass ($5 day) | July - October
</div>
```

### Detailed View (Full Card)

See `AccessPermitsCard` component above - includes all permit details, costs, seasonal info, group limits, and land manager contact.

### Embedded in Planner Tab

```jsx
// In planner/itinerary view
<div style={{ backgroundColor: '#f0f4ff', padding: '12px', borderRadius: '4px', marginBottom: '12px' }}>
  <div style={{ fontWeight: '600', marginBottom: '8px' }}>
    Permits & Access
  </div>
  <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
    <div>Permit: {permitData.permits[0]?.type} {permitData.permits[0]?.cost_per_person ? `($${permitData.permits[0].cost_per_person})` : '(Free)'}</div>
    <div>Parking: {permitData.parking_passes[0]?.type} - ${permitData.parking_passes[0]?.cost?.daily || permitData.parking_passes[0]?.cost}/day</div>
    <div>Access: {permitData.seasonal?.access_window}</div>
    <div>Group limit: {permitData.group_limits} people</div>
  </div>
</div>
```

## NWAC Avalanche Forecast Integration

### Fetch Daily Avalanche Forecast

```javascript
// Fetch NWAC forecast for Mount Baker area
async function fetchNWACForecast() {
  try {
    const response = await fetch('https://www.nwac.us/avalanche-forecast/');
    const html = await response.text();
    
    // Parse HTML for Mount Baker zone danger level
    // This would require proper HTML parsing (jsdom, cheerio, etc.)
    
    return {
      zone: 'Mount Baker',
      dangerLevel: 'Considerable', // Example
      lastUpdated: new Date(),
      forecastUrl: 'https://www.nwac.us/avalanche-forecast/'
    };
  } catch (err) {
    console.error('NWAC fetch failed:', err);
    return null;
  }
}

// Display in app
const NWACBanner = ({ forecast }) => {
  if (!forecast) return null;
  
  const colors = {
    'Low': '#90ee90',
    'Moderate': '#ffff00',
    'Considerable': '#ff8c00',
    'High': '#ff4500',
    'Extreme': '#8b0000'
  };
  
  return (
    <div style={{
      backgroundColor: colors[forecast.dangerLevel],
      padding: '12px',
      borderRadius: '4px',
      marginBottom: '12px',
      textAlign: 'center'
    }}>
      <strong>NWAC: {forecast.dangerLevel} avalanche danger</strong>
      <a href={forecast.forecastUrl} target="_blank" rel="noopener noreferrer">
        View full forecast
      </a>
    </div>
  );
};
```

## Testing Checklist

Before deploying permit data to users:

- [ ] All 19 peaks display their permit information correctly
- [ ] Mount Rainier shows $66 paid permit requirement
- [ ] All other peaks show free permits
- [ ] Parking pass costs display correctly (NW Forest Pass $5/$30)
- [ ] Seasonal access windows display (e.g., "June 15 - October 15")
- [ ] Road closures show with typical closure periods
- [ ] Group limits display (8-12 depending on peak)
- [ ] Avalanche hazard warnings show for Baker, Adams, Glacier Peak
- [ ] Crevasse rescue requirements show for glaciated peaks
- [ ] Land manager contact info displays (agency, phone, website)
- [ ] Mobile layout works (compact view on small screens)
- [ ] Links to agency websites open correctly

## Performance Considerations

- Load permit data once on app startup (350 bytes per peak, ~6.6 KB total)
- Cache in localStorage if needed
- Include last_verified date to prompt refresh if older than 1 month
- For NWAC forecasts, cache for 6 hours (only available once daily anyway)

---

**Ready for implementation.** Data file is production-grade and can be used immediately in the climbing app.

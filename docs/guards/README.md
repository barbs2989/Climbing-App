# Guard notes

The per-guard design notes: why each `check:` / `audit:` script exists, what it structurally
cannot see, the measured non-findings not to re-derive, and the traps met while building it. They
are deliberately NOT loaded into every session — `CLAUDE.md` keeps only the one-line command index,
grouped under the same headings as the files below.

**Before changing, removing, or reasoning about a guard — or before building a new one — read its
entry.** The fastest route is `grep -rn "check:NAME" docs/guards/`; the table below says which file
each command belongs to. **New entries go in the matching file here**, and a new command goes under
the matching heading in `CLAUDE.md`'s index (`check:guard-wiring` fails if a guard on disk is
missing from it). A genuinely new area gets its own file, a heading in the index, and a row below.

`check:doc-paths` and section 5 of `check:guard-wiring` read every file here, discovered through
`scripts/lib/doc-files.mjs` rather than listed.

| File | Covers |
|---|---|
| [infrastructure.md](infrastructure.md) | How the guard chain runs and what every guard must establish before it believes itself: build-chain cost and concurrency, CI cancellation, deploy drift, render settling, source coverage, the DB preflight, the quiet-box gate, and checking `main` itself. |
| [static-code.md](static-code.md) | Build-chain guards that read source with Babel or a directory walk: bindings, hooks, props, duplicate attributes, screen lists, NUL bytes, script roots, doc paths, injection anchors, clickables, fixed panels, overlay widths, icons, toasts. |
| [browser-walks.md](browser-walks.md) | Guards that drive the real app in Chrome: the screen walks (ui, zero, signed-in), the two-account guards, overlay discovery and scrolling, accessibility names and selected state, overflow, anniversary. |
| [outage-and-read-failures.md](outage-and-read-failures.md) | A failed read must never read as an empty account: `check:outage`, the outage-copy guards, `check:read-failures`, outage flag reach, overlay absence, and the reads that gate a write. |
| [honesty-claims.md](honesty-claims.md) | Guards that hold copy to what the app can actually do: legal surfaces, the profile and résumé, offline promises, preview-only controls, the match %, the trust score and its factors, rendered sources. |
| [settings-and-persistence.md](settings-and-persistence.md) | A control that claims to remember something must store it: float plans and planner forms, profile drafts, visibility and notification switches, counts against their lists, onboarding, photo removal. |
| [units-and-formatting.md](units-and-formatting.md) | `check:units`, and the neighbouring display-format defects: dates against the climber's preference, machine tokens on screen, singular/plural stat chips. |
| [seed-and-identity.md](seed-and-identity.md) | Seed history must never be attributed to a real account, and seed-only surfaces must be declared: seed-history, crew-member-readers, real-profile-rows, dead-flag-gates, sample-content-removable, seed-only-surfaces, DEMO_FILLERS. |
| [social-and-crews.md](social-and-crews.md) | Crews, groups, connections and presence: who is on a crew, how a climber is named, mutual friends, notifications that navigate, meetups, viewer counts, partner filters. |
| [route-page.md](route-page.md) | Rendering of a route's own page: bare routes, enriched columns reaching a screen, token-shaped boxes, provenance, the summit briefing, route breakdown, trailhead directions, the access checked date, wildfire, gear. |
| [camping.md](camping.md) | `check:camping` and the two camp audits: where CAMPING & BIVY renders, the merged stores, camp elevations and whether a camp fits its route. |
| [planner-and-rappels.md](planner-and-rappels.md) | Numbers a party plans a day around: return legs, gain floors, impossible legs, the pitch discount, logged times, the gain audits, rope-length and rappel-count checks. |
| [waypoints-and-tracks.md](waypoints-and-tracks.md) | Pins and lines: placement, dedupe, styles, track caveats and GPX files, and the waypoint audits (synthetic pins, cross-route pins, pin elevations, summit splits, order, on-track, map pins, coordinate origin). |
| [roads-and-access.md](roads-and-access.md) | Trailhead agreement, road status across a cluster, road coverage, misfiled access prose, expiring closures, and the trailhead repairs. |
| [route-prose.md](route-prose.md) | What enrichment wrote and where it landed: approach scope, the climbing_route sweep, terrain suppression, hazard redundancy, pipeline voice and citations, area parents, aspect vs name, contaminated rows. |
| [contributions-and-logbook.md](contributions-and-logbook.md) | The contribute form and the climb log: fields that apply, consensus clustering, corrections out-voting enrichment, climb_logs hydration, tick lists and suggestions. |
| [grades.md](grades.md) | One grade parser, one displayed grade, and whether the stored grade_num still agrees. |
| [database-and-history.md](database-and-history.md) | Guards over the schema, RLS, stored functions and history: rls, migration claims, approve_new_route, function and column drift, route counts, silent reverts. |

## Which file documents which command

A name in **bold** has its own top-level entry in that file; the rest are discussed there in
passing or not yet written up.

- **[Guard infrastructure](infrastructure.md)** — **`check:drift`**, **`check:ci-cancel`**, `check:quiet-box-wiring`, `check:guard-wiring`, `check:action-versions`
- **[Static code guards](static-code.md)** — **`check:refs`**, `check:jsx-comments`, **`check:no-nul`**, **`check:script-roots`**, **`check:dup-attrs`**, **`check:bottom-panels`**, **`check:hooks`**, **`check:dead-props`**, **`check:boot`**, **`check:screen-lists`**, **`check:icons`**, **`check:toast-reachable`**, **`check:clickable`**, `check:overlays`, **`check:overlay-width-cap`**, `check:disc-labels`, `check:a11y-names`, `check:flex-scroll`, `check:dialog-dismiss`, **`check:doc-paths`**, **`check:injection-anchors`**, `check:zindex`
- **[Browser walks](browser-walks.md)** — **`check:ui`**, **`check:overlay-discovery`**, **`check:zero`**, **`check:signed-in`**, **`check:message-delivery`**, **`check:block-guarantees`**, **`check:new-climber-journey`**, **`check:overlay-scroll`**, **`check:a11y-badges`**, **`check:selected-state`**, **`check:control-names`**, **`check:overflow`**, **`check:anniversary`**
- **[Outages and failed reads](outage-and-read-failures.md)** — `check:verification-fallback`, **`check:profile-edit-gate`**, **`check:outage-copy`**, **`check:topo-outage-copy`**, `check:outage-landmark`, **`check:overlay-absence`**, **`check:outage`**, `check:read-failures`, **`check:outage-flag-reach`**
- **[Honesty of what the screen claims](honesty-claims.md)** — **`check:trust-breakdown`**, **`check:untracked-factors`**, `check:no-sources`, **`check:preview-claims`**, **`check:policy-claims`**, **`check:offline-claims`**, **`check:match-percent`**, **`check:profile-claims`**, `check:claims`, `check:writes`
- **[Settings, forms and persistence](settings-and-persistence.md)** — **`check:photo-removal`**, **`check:onboarding-reach`**, **`check:profile-draft-persists`**, **`check:visibility-switches`**, **`check:notification-switches`**, **`check:count-matches-its-list`**, **`check:float-plan-persistence`**
- **[Units and formatting](units-and-formatting.md)** — **`check:units`**
- **[Seed data and identity](seed-and-identity.md)** — **`check:seed-history`**, **`check:dead-flag-gates`**, **`check:sample-content-removable`**, **`check:seed-only-surfaces`**, **`check:crew-member-readers`**, **`check:real-profile-rows`**
- **[Social, crews and groups](social-and-crews.md)** — **`check:mutual-friends`**, `check:crew`
- **[The route page](route-page.md)** — **`check:bare`**, **`check:provenance`**, **`check:access-checked-line`**, **`check:trailhead-directions`**, `check:area-name-embed`, **`check:crew-gear`**, `check:area-surfaces`, `check:photo-contract`, **`check:fire`**, **`check:field-renders`**, **`check:summit-briefing`**, **`check:token-boxes`**, **`check:pitch-split`**
- **[Camping and bivy](camping.md)** — **`check:camping`**, **`audit:camp-elevations`**, **`audit:camp-route-fit`**
- **[Planner estimates, gain and rappels](planner-and-rappels.md)** — **`check:logged-times`**, **`check:pitch-discount`**, **`check:rappel-single-rope`**, **`check:gain-floor-stated`**, **`check:impossible-leg`**, **`check:return-leg`**, **`audit:gain`**, **`check:rappel-lengths`**, **`audit:rappel-claims`**, `audit:rappels`
- **[Waypoints and tracks](waypoints-and-tracks.md)** — **`check:wp-styles`**, **`check:waypoint-placement`**, **`check:waypoint-dedupe`**, **`check:track-caveat`**, **`check:gpx-caveats`**, `check:waypoint-caveat`, **`audit:coord-origin`**, **`audit:waypoints`**, **`audit:waypoint-order`**, `audit:waypoint-track`, **`audit:map-pins`**, `audit:waypoint-distances`, `audit:summit-pins`, `audit:peak-coords`, **`audit:summit-splits`**, **`audit:pin-elev-vs-own-prose`**, `audit:waypoint-elevations`, `audit:ground-index`, `audit:waypoint-geometry`, `audit:stranded-track-vertices`, **`audit:cross-route-pins`**, `audit:travel-bearings`, **`audit:synthetic-waypoints`**
- **[Roads, trailheads and access](roads-and-access.md)** — **`audit:access-prose`**, **`audit:road-coverage`**, **`audit:trailhead-agreement`**, **`audit:expiring-closures`**, **`audit:trailhead-road`**
- **[Route prose and catalog structure](route-prose.md)** — **`audit:area-parents`**, `audit:note-voice`, **`audit:prose-citations`**, **`audit:misplaced-prose`**, **`audit:approach-scope`**, **`audit:aspect-name`**, `enrich:next-batch`, `check:enrichment-traceable`, **`audit:terrain`**, **`audit:hazard-redundancy`**, `enrich:apply`
- **[Contributions and the logbook](contributions-and-logbook.md)** — **`check:contrib-fields`**, `check:contrib-summary`, **`check:correction-readers`**, **`check:suggestion-discs`**, **`check:log`**, `check:challenge-rows`, `check:route-tags`, `check:contrib-shapes`, **`check:consensus-clustering`**, `check:add-route-fields`, `audit:fifty-classics`, `audit:list-coverage`
- **[Grades](grades.md)** — **`check:grade-parser`**, **`audit:grade-num-drift`**
- **[Database, migrations and git history](database-and-history.md)** — **`check:approve-route-columns`**, **`check:counts`**, **`check:function-columns`**, **`check:function-drift`**, **`check:column-drift`**, **`check:migration-claims`**, `check:sql`, `check:merge-survival`, **`audit:silent-reverts`**, `check:schema`, `check:migrations`, **`check:rls`**

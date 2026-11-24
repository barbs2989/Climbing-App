# Six doubtful route identities (2026-11-24)

Raised by the climb-time research (out-3/out-4): six routes whose name, length or existence could not be matched to any source. Rows as stored: `six-rows.json`. A fact counts only if a page stating it was opened; snippet-only leads are marked.

| Route | Verdict | Action |
|---|---|---|
| `wa_lane_peak_r3` Lover's Lane (couloir), AI1, 305 m | REAL — already named Lover's Lane; 1000 ft matches 305 m. Only the id is odd (ids are never renamed). | none |
| `wa_mount_johnson_southwest_route` Southwest Route, Class 3, 3 m | Peak correct (Olympics, The Needles, 7,680 ft; Wikipedia: easiest route "a steep and exposed class 4 scramble"). No page names a Southwest Route. Row has no prose. | length 3 m -> null (`identity-six.sql`). Existence / Class 3 = owner call |
| `wa_thunder_mountain_north_face` North Face, 5.0, 183 m, FA 1972 | LEAD: SummitPost snippet (page 403) — Garrett & Nelson, July 6 1972, "about 600 feet of 5th-class", citing Beckey. Matches stored 183 m + FA year. 5.0 unsourced beyond "5th-class". | none |
| `wa_three_queens_west_peak` West Ridge - West Face, 5.7, 183 m | Peak real (West Peak 6,400 ft, Wikipedia). No source for the route, 5.7, or 183 m; row's own beta says "no roped pitches" against grade 5.7. 183 m = the ~600 ft from Spectacle Point camp (5,800 ft) to the summit. | length -> null. Grade = owner call |
| `wa_spectre_peak_haunted_wall` Haunted Wall, 5.9+, 640 m | NOT FOUND, likely invented: no source names a Haunted Wall route or feature; AAJ 2006 Pickets traverse and AAJ 2022 Phantom W Ridge mention neither. Sibling "Spirited Away" S ridge is supported (cascadeclimbers titles: FA 2022 5.8 2000 ft; 2025 IV 5.9 ~2000 ft 10 pitches). | owner call: delete or hide |
| `wa_big_four_mountain_tower_route` Tower Route, 5.7, 1219 m | Name REAL: sverdina.com/big_four1.asp "The NE Ridge contains a hard rock route called the Tower Route." Same page: north face "is 4,000 ft high" = 1219 m, so the length is the face height. Grade/FA unsourced. | length -> null. Sibling Spindrift Couloir carries the same 1219 m (not in scope) |

Blocked: SummitPost, cascadeclimbers, listsofjohn, peakbagger search (403); web.archive.org not fetchable, so Beckey/Wood guide text was not read.

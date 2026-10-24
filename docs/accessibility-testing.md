# Accessibility testing — the manual pass

`npm run check:axe` and the static a11y guards catch roughly a third of real barriers: what a page
*is*. They cannot tell you what it is like to *use* with a screen reader — whether focus lands
somewhere sensible, whether a change is announced, whether a task can actually be finished. This
is the pass that answers that, and the log at the bottom is the record of having done it.

Why the log matters beyond quality: in an accessibility complaint, a dated record of testing with
real assistive technology, and of fixing what it found, is the strongest evidence of good faith a
small app can have. An undated claim of "we test" is worth nothing. Keep it honest — a failed task
written down and fixed is better evidence than a column of passes.

Run it before each store release, after any change to sign-up, the nav, or a flow below, and at
least once a quarter.

## Set-up

- **iPhone — VoiceOver.** Settings → Accessibility → VoiceOver. Add it to the Accessibility
  Shortcut (triple-click the side button) so it can be toggled. Swipe right/left moves between
  items, double-tap activates, two-finger swipe up reads from the top, the rotor (two-finger twist)
  switches to Headings — use it to check every screen has one heading at the top.
- **Android — TalkBack.** Settings → Accessibility → TalkBack. Same gestures; the reading-controls
  menu replaces the rotor.
- **Desktop keyboard only.** Unplug or ignore the mouse. Tab / Shift-Tab, Enter, Space, Escape,
  arrow keys. Every control must be reachable and show a visible focus ring.
- **Zoom.** Browser zoom to 200%, and iOS Settings → Display & Brightness → Text Size at the
  largest setting. Nothing may be cut off or overlap.

Test the live site (https://barbs2989.github.io/Climbing-App/) signed out first, then signed in.

## The tasks

For each: can it be finished with the screen reader alone, without sighted help? Note anything
announced wrongly, anything unreachable, and anywhere focus jumps somewhere unexpected.

1. **Reach the Accessibility statement while signed out** (sign-in screen → "Accessibility — report
   a problem") and **send a report as a guest**. The email field is required; the "Sent" message is
   announced.
2. **Create an account** — every field is announced with its label, an error is announced when it
   appears, and the Terms checkbox says whether it is checked.
3. **Sign in, open the Menu, open Settings, change a privacy switch** — the switch announces its
   name and whether it is on.
4. **Find a climb**: Climbs tab → a state → an area → a route. The route name is announced as the
   page heading.
5. **Route page sub-tabs**: move through Overview, Plan, Conditions, Reports, Safety, Partners,
   Photos. The selected tab is announced as selected.
6. **Open a photo** on a route and close it again with the screen reader (and with Escape on a
   keyboard). Focus returns to where it was.
7. **Draw a topo line from the keyboard** (desktop): Draw on a route photo, Tab to the photo, arrow
   keys move the cross, Enter places points, `[`/`]` select a point, Delete removes it. Each key is
   announced in the line under the photo.
8. **Find a partner** (Partners tab) and **send a message**. The new message is announced or
   reachable without hunting.
9. **Log a climb** from the Logbook, including the date and grade fields.
10. **Join or open a crew**, read its chat, and see whether its status ("Ready") is announced.
11. **Notifications**: open the bell, accept or decline a friend request.
12. **Delete-account flow** (Settings → Your data) up to the confirmation — do not confirm.

## Log

One row per pass. Date, who, device + assistive technology + OS version, tasks run, what failed,
and the PR that fixed it (or "open").

| Date | Tester | Device / AT | Tasks | Failures found | Fixed in |
|---|---|---|---|---|---|
| 2026-10-23 | Claude (scripted) | Chrome 150 headless, **keyboard only — NOT a screen reader**; 390px and 1280px | 1 (keyboard reaches the statement from sign-in, guest email field shown), 3 (Menu: Enter opens, Escape closes, focus returns), the route sub-tabs, plus a Tab walk of sign-in, the statement, Home, Climbs, Partners, Crews, Logbook, Ranks, Profile, route Safety and desktop Home: 469 focus stops checked for a name, a visible focus ring and being on screen and uncovered | None. (The route sub-tabs are buttons with `aria-current`, not `role="tab"`; that is announced as "current" and is acceptable.) | — |
| | | | | | |

The scripted row covers the keyboard half of tasks 1, 3 and 5 only. Tasks 2 and 4–12 still need a person
with VoiceOver and TalkBack, and only that pass can say what a screen reader actually announces.

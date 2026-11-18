# Network retry, pass 4 (2026-11-18)

Result: 0 of 8 sites reachable (need 4). No research done; out/q*.json untouched.

| Site | curl status |
|---|---|
| https://www.wta.org/ | 000 (no connection) |
| https://en.wikipedia.org/wiki/Mount_Stuart | 000 |
| https://www.climber.org/ | 000 |
| nominatim.openstreetmap.org search | 000 |
| apps.fs.usda.gov arcx EDW | 000 |
| https://www.14ers.com/ | 000 |
| https://www.summitpost.org/ | 000 |
| https://www.peakbagger.com/ | 000 |
| WebFetch Wikipedia Mount_Stuart | getaddrinfo ENOTFOUND: host outside the session's allowed network domains |

Fix: allow these hosts in the environment's network settings (or use an environment with unrestricted/full network), then re-run.

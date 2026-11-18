# Network retry, pass 4 (2026-11-18)

Research NOT run: fewer than four of the test sites answered 200. The proxy refuses the CONNECT tunnel (403) and the WebFetch tool reports the hosts as outside the session's allowed network domains.

| Site | Result |
|---|---|
| https://www.wta.org/ | 000 (CONNECT 403) |
| https://en.wikipedia.org/wiki/Mount_Stuart | 000 |
| https://www.climber.org/ | 000 |
| https://nominatim.openstreetmap.org/search?q=Stuart+Lake+Trailhead&format=jsonv2 | 000 |
| https://apps.fs.usda.gov/arcx/rest/services/EDW?f=json | 000 |
| https://www.14ers.com/ | 000 |
| https://www.summitpost.org/ | 000 |
| https://www.peakbagger.com/ | 000 |
| WebFetch en.wikipedia.org/wiki/Mount_Stuart | ENOTFOUND (host not in the environment's allowed domains) |

Fix: allow these hosts in the environment's network settings (or use unrestricted access), then re-run. out/q01..q25.json are untouched.

# Network retry, pass 4 (retested 2026-11-18, second environment)

Research NOT run: 0 of 8 test sites answered 200 (threshold 4). The proxy refuses the CONNECT tunnel (403) and the WebFetch tool reports the hosts as outside the session's allowed network domains. The same result as the earlier retest.

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

Fix: allow these hosts in the environment's network settings (or use unrestricted access), then re-fire. out/q01..q25.json are untouched.

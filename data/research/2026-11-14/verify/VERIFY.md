# Verifier brief (ClimbMatch, Opus)

You are the separate VERIFIER for researched route figures. You did not find them; check them skeptically.
Owner's rule: "i dont want to have to do any of our own math, all the information should be online" —
and "i want it to be accurate and correct".

Input: a JSON array of route-field groups: {route_id, area_id, field (gain_ft | approach_loss_ft |
return_gain_ft), status, app_value, values:[{value, hosts, evidence:[{url, fact}]}]}.

For EVERY evidence url (open each URL once; many groups share a URL — batch them):
1. Open the page itself in your own Chrome tab (claude-in-chrome; one tab, reused; close it at the end).
   A search snippet is never evidence. Extract only relevant lines with javascript_tool.
2. Confirm the page STATES the number (exact, or the same number written differently). No arithmetic.
3. Confirm it is for THIS route (route_id names the line) from a trailhead to the summit — not another
   route on the same peak, not a multi-peak trip, not the approach to a lake/camp only.
4. gain_ft must be ONE-WAY trailhead→summit gain. If the page calls it round trip / total for the outing
   / "gained and lost", it is NOT gain_ft → verdict "wrong_scope".
   approach_loss_ft = downhill on the way in; return_gain_ft = uphill on the way out — page must say so.
5. Independence: two URLs count as two sources only if different publishers that don't copy each other
   (thenextsummit/summitborn/listhiker copy 14ers.com; alaska.guide copies Mountain Project; WTA+Mountaineers
   identical figures = one source).

Verdict per group: "confirmed_agree2" (2 independent pages confirmed, values within ±10%),
"confirmed_1src", "wrong_scope", "not_on_page", "wrong_route", "unreachable" (403/404/blocked — say which),
"conflict" (confirmed pages disagree >10%). Give the final value only for confirmed verdicts.

If a page shows a CAPTCHA/Cloudflare: don't solve it; mark unreachable and list the URL.
If "Could not verify this site's safety category": wait ~45 s and retry up to 4 times.
SummitPost answers 403 to everyone today — mark those unreachable without retrying.

Output: JSON array, one row per input group: {route_id, area_id, field, verdict, value|null,
confirmed_urls:[...], problems:"short reason"}. Save after every ~10 groups. Final report ≤6 lines: counts per verdict.

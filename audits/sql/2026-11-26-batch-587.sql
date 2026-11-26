-- WA alpine audit, batch 587 (pass 9)

-- wa_kololo_peaks_standard (Standard Route, Kololo Peaks): loss_ft (9500) contradicted the route's
-- own gain_ft (6150) and its own descent_text, which states the descent reverses the ascent line
-- back to the same trailhead with no technical descent ("rappels: None typically needed") -- a true
-- out-and-back on one line cannot lose more than it gains. mountaineers.org's own route page for
-- this exact line (North Fork Sauk -> White Chuck Glacier -> Kololo) independently states "6,150
-- feet of gain," confirming 6150 as the sourced figure and that loss_ft, not gain_ft, was wrong.
UPDATE routes SET loss_ft = 6150
WHERE id = 'wa_kololo_peaks_standard' AND gain_ft = 6150 AND loss_ft = 9500;

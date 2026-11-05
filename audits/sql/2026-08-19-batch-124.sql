-- wa_dragontail_peak_backbone_ridge: descent_text still cited a specific rappel-station
-- coordinate ("a documented rappel station near 47.479°N, 120.832°W") that the row's own
-- rappel_count_note says was already assessed as unverifiable ("coincides suspiciously
-- closely with the peak's own summit coordinates rather than a real documented station
-- fix, so it has been removed as unsupported") and that rappel_detail also states is "not
-- independently documented in any source found." The removal was never applied to
-- descent_text, leaving the row contradicting its own correction note. Reconciled
-- descent_text to match rappel_count_note/rappel_detail.
UPDATE routes
SET descent_text = 'Most parties descend the east ledges and sandy summit gully toward Aasgard Pass and down to Colchuck Lake. When the upper descent gully is icy (common late season), rappel instead — two rappels on a 70m rope (60m works) using rock anchors to avoid the ice slope. Exact rappel-station coordinates are not independently documented in any source found, so treat any anchors encountered as unconfirmed until inspected on site. Watch for loose rock and verify anchor integrity on any rappel here.'
WHERE id = 'wa_dragontail_peak_backbone_ridge';

/* `descentText` is the CONTRIBUTE-FORM key for this section — it is in SS and the DESCENT
   pencil opens it — while `descent` is the enrichment column. Picking the longer of the two
   let the enrichment out-vote an agreed correction whenever the correction was SHORTER, which
   is exactly what a useful one often is: "South gully is closed by rockfall — walk off east"
   replacing three paragraphs of stale prose. Same rule as _rapEdited below, and the same
   failure #787 found for rappels: a reader must not overrule what climbers agreed. Length is
   only a tie-breaker for two ENRICHED strings; once a field is in `_contribFields` the
   climbers' text wins outright. */
export function _descEdited(r){return !!(r&&(r._contribFields||[]).indexOf("descentText")>=0);}
/* THERE IS NO RIVALRY HERE, and this comment previously asserted one. Two things happen in
   ClimbMatch's merge and you have to read both:

     1. every contribution is written through the rename map `M`, which has
        {descentText:"descent"} -- so the form key `descentText` lands in route.descent;
     2. AFTER both merge paths, `if(o.descent!=null)o.descentText=o.descent;` MIRRORS it back
        (#787), and its own comment says "Write both spellings; equal strings make the
        comparison moot."

   So a real contribution leaves route.descent === route.descentText, and this function returns
   the correction whichever side it reads -- including under the bare length comparison that
   predates every change to it. #897 made it prefer `b` and called that a fix; #915 made it
   prefer `a` and called #897 a regression that had "discarded the correction". Measured by
   rendering both variants against a fixture that sets BOTH properties: behaviourally identical.
   Neither was a live fix, and #915's accusation was false.

   Keep the branch -- it costs nothing and it is what keeps this correct IF the mirror is ever
   removed. Do not describe it as fixing a live defect, and do not "restore" the other ordering
   on the strength of the M rename alone. See #932, which had to un-assert the same claim inside
   check:correction-readers, where it had hardened into a rule.

   The real instance of this class is `rack` -- see _rackEdited. */
export function descentBeta(r){if(!r)return "";const a=String(r.descent||"").trim(),b=String(r.descentText||"").trim();if(a&&_descEdited(r))return a;return b.length>a.length?b:a;}

/* The topo box's two states, as a function rather than two ternaries in the JSX, for the reason
   seasonShort() and campDetail() are functions: it can be RUN. react-query does not surface a
   cached error under renderToStaticMarkup -- it reports `pending` and masks it -- so a flag read
   off a hook inside this component is unreachable to an SSR probe, which is exactly why every
   sibling (ConsensusPanel, CatchLedger, FriendsList, Inbox) takes its flag as a PROP and is
   provable. TopoSection owns its own query, so the decision comes out instead of the query going
   up. check:topo-outage-copy executes both branches and renders the healthy one end to end.

   The failing branch must not invite the first topo. The headline already flipped; the
   explanation under it did not, so an outage read "Couldn't load the topos" and then "Got a clear
   shot? Add it..." -- honest headline, and a body still presuming there is nothing there. */
/** @param {boolean} unavailable @param {string} [noun] what the climb is called: "route", or "problem" on a boulder */
export function topoEmptyCopy(unavailable, noun){
  const n = noun || "route";
  return unavailable
    ?{head:"Couldn’t load the topos",
      body:"A topo may already be on file for this "+n+" — this one list just didn’t load, so this is not a claim that there is none. Check your connection and try again."}
    :{head:"No topo yet",
      body:"A topo overlays the "+n+" line and markers on a photo of the wall, face, or line. Got a clear shot? Add it and draw the line so the next party can follow it."};
}

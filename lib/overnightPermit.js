// The overnight permit a route's zone asks for, read off `access.overnight_permit`. Moved verbatim out of
// RouteDetail.jsx (2026-10-29, PR56 of the component extraction) so OvernightPermit in src/components/ can read it;
// RouteDetail.jsx re-exports it, because check:camping imports it from the page.

/* WHERE TO GET THE OVERNIGHT PERMIT for the zone this route sleeps in. `access.permit` answers the
   DAY question on most rows ("None required for day climbing"), each site's own `permit` prose says
   which permit without saying where to get it, and the ACCESS panel links only four agencies by a
   name match. `access.overnight_permit` = {what, where, url} is researched per zone; `url` is the
   issuing agency's own page and nothing else (check-camp-role-output.mjs enforces the host). */
export function overnightPermitOf(route){
  const p=route&&route.access&&route.access.overnight_permit;
  if(!p||typeof p!=="object")return null;
  const what=String(p.what||"").trim(),where=String(p.where||"").trim();
  let url=null;try{const u=new URL(String(p.url||""));if(u.protocol==="https:")url=u.href;}catch(e){url=null;}
  return (what||where)?{what:what,where:where,url:url}:null;
}

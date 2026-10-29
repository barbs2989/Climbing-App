# Rescue dispatch numbers: where each one was read

`lib/sarByCounty.js` holds one non-emergency dispatch line per county for the Safety tab's
EMERGENCY & RESCUE card. This file is the evidence for each entry. It is not in the bundle,
because the app names no sources.

**The rule:** a number goes in only when the agency itself (the sheriff, the county, or the
county's dispatch centre) publishes it on its own page, labelled for this purpose: non-emergency
dispatch, a 24-hour line, or search and rescue. Main office, records and jail lines are refused,
and so are city lines and directory sites. A county with no such page gets no entry. The card then
shows 911 guidance and an *Add it with Edit* prompt, never a neighbouring county's number.

**Adding a county:** read the official page yourself and add a row below in the same PR.
Re-check the whole list about once a year, because dispatch centres consolidate. Whatcom moved
to What-Comm 911 in 2025, for example.

## Utah (checked 2026-10-15, #2485)

| County | Number | Read on | Label on the page |
|---|---|---|---|
| Grand | (435) 259-8115 | grandcountyutah.net staff directory | Search & Rescue |
| Utah | (801) 794-3970 | utahcounty.gov/Safety.html | Non Emergency Dispatch; Sheriff Search and Rescue |
| Salt Lake | (801) 840-4000 | unifiedpoliceut.gov/contact-us | Dispatch Center, Non-Emergency |

Refused: Salt Lake's old (801) 743-7100, which no official page publishes.
#2485 also refused Washington County's (435) 634-5730 as "Washington City's line". **That was
wrong.** It was reinstated on 2026-10-28 (below), when the sheriff's own contact page was found
listing it as "Dispatch (non-emergency)".

## Utah (checked 2026-10-28)

UCA = the Utah Communications Authority's 2025 PSAP contact list (uca911.org). It is a state
agency's list of each county's dispatch lines, labelled "Dispatch" beside each office line.

| County | Number | Read on | Label on the page |
|---|---|---|---|
| Beaver | (435) 438-2862 | beaver.utah.gov/406/Dispatch; UCA | Dispatch Phone |
| Cache | (435) 753-7555 | cachecounty.gov sheriff general-information; loganutah.gov 911 communications | non-emergency purpose for contacting dispatch |
| Davis | (801) 497-8300 | daviscountyutah.gov/sheriff/police-and-fire and /law-enforcement | Davis County Non-emergency Dispatch |
| Emery | (435) 381-2111 | UCA | Dispatch |
| Garfield | (435) 676-1134 | UCA | Dispatch |
| Iron | (435) 586-9445 | dps.utah.gov Cedar Communications; ironsheriffut.gov/contact-us; UCA | Main Dispatch (the sheriff page's header also shows 867-7550) |
| Juab | (435) 623-1344 | juabsheriff.org | Non-Emergency |
| Kane | (435) 644-2349 | UCA | Dispatch |
| Millard | (435) 743-5302 | UCA; millardcounty.gov staff directory | Dispatch |
| Sevier | (435) 896-6471 | dps.utah.gov Richfield Communications (PSAP for Millard, Piute, Sevier, Wayne); UCA | Richfield Communications Center |
| Summit | (435) 615-3600 | summitcountyutah.gov/2458; UCA | Sheriff's Dispatch |
| Tooele | (435) 882-5600, option 1 | UCA | Dispatch |
| Uintah | (435) 789-4222 | dps.utah.gov Uintah Basin Communications; UCA | Main Dispatch |
| Wasatch | (435) 654-1411 | wasatchsheriff.gov; UCA | Dispatch Center |
| Washington | (435) 634-5730 | news.washeriff.net/contact-us/contact-information; washco.utah.gov emergency-management | Dispatch (non-emergency); Sheriff's Office Dispatch |
| Wayne | (800) 356-8757 | waynecountyutah.org county-offices; loautah.gov emergency-services | Non Emergency |
| Weber | (801) 395-8221 | webercountyutah.gov/sheriff online-reporting | non-emergency dispatch line (UCA lists 629-8221 as "Dispatch") |

Not added: San Juan (587-2237 is labelled only as the office line), Duchesne (no county page
could be read), and Box Elder (the county lists eight unlabelled dispatch numbers, and dispatch
is moving to Weber).

## Colorado (checked 2026-10-28)

| County | Number | Read on | Label on the page |
|---|---|---|---|
| Boulder | (303) 441-4444 | bouldercounty.gov sheriff contact-us and communications | For all non-emergencies ... / Non-Emergency |
| Clear Creek | (303) 980-7300 | clearcreekcounty.us/992/Public-Safety | For non-emergency, 24 hour assistance |
| Custer | (719) 783-2270 | custercounty-co.gov department directory | Non-emergency Sheriff |
| Douglas | (303) 660-7505, then 1 | dcsheriff.net | Press 1 for a non-emergent police response (Dispatch) |
| El Paso | (719) 390-5555 | epcsheriffsoffice.com/contact | El Paso County Dispatch (non-emergent crime) |
| Garfield | (970) 945-0453 | garcosheriff.com/contact-us | Non-Emergency (Patrol & Dispatch is 625-8095) |
| Huerfano | (719) 738-1044 | huerfano.us | Non-Emergency |
| Jefferson | (303) 980-7300 | jeffcosheriffco.gov/about/contact; jeffcom911co.gov | For immediate non-emergency service |
| Larimer | (970) 416-1985 | larimer.gov/sheriff/quick-links and make-a-report | 24-hour non-emergency number |
| Mesa | (970) 242-6707 | mesacounty.us/node/1458 | Non-Emergency Dispatch |
| Montezuma | (970) 565-8454 | montezumacounty.gov sheriff page | please call dispatch |
| Ouray | (970) 249-9110 | ouraycountyco.gov/152/Sheriff | Non-Emergency Dispatch |
| Teller | (719) 687-9652 | tellercounty.gov/514/Sheriffs-Office | Non-emergency requests |

Not added (no official page that could be read labels a line for this purpose): Chaffee,
Gunnison, San Miguel, San Juan, La Plata, Eagle, Summit, Lake, Fremont, Pitkin, Grand, Routt,
Mineral, Rio Grande, Saguache, Montrose. Park was also left out: its line (719-836-4121,
option 5) shares that option with Animal Control on the same page.

## California, Nevada, Arizona, Wyoming (checked 2026-10-28)

| County | Number | Read on | Label on the page |
|---|---|---|---|
| El Dorado, CA | (530) 621-6600 | eldoradocounty.ca.gov sheriff page | Non-Emergency Number |
| Fresno, CA | (559) 600-3111 | fresnosheriff.org media release; fresnocountyca.gov Fresno-County-Emergency | Non-Emergency Dispatch Line (automated greeting first) |
| Marin, CA | (415) 479-2311 | marinsheriff.gov/contact and /services/faq | For non-emergency dispatch, call |
| Nevada, CA | (530) 265-7880 | nevadacountyca.gov/3059 | call the dispatch line (non-emergency) |
| Riverside, CA | (800) 950-2444 | riversidesheriff.org/428/Who-to-Call | Non-Emergency Dispatch, Toll Free (area lines exist: West 951-776-1099, East 760-836-3215) |
| San Bernardino, CA | (760) 956-5001 desert · (909) 387-8313 valley | wp.sbcounty.gov/sheriff | NON-EMERGENCY DISPATCH, Desert / Valley (both shown: Joshua Tree is desert, the mountains are valley) |
| Santa Barbara, CA | (805) 683-2724 | sbsheriff.org/contact-us and home page | Non-Emergency 24/7 Dispatch |
| Siskiyou, CA | (530) 841-2900 | siskiyoucounty.gov/sheriff | Dispatch |
| Sonoma, CA | (707) 565-2121 | sonomasheriff.org/phone-directory and /911 | Dispatch, non-emergency |
| Ventura, CA | (805) 654-9511 | venturacounty.gov sheriff pages | NON-EMERGENCY; Dispatch & Watch Commander |
| Douglas, NV | (775) 782-5126 | sheriff.douglascountynv.gov contact_us and FAQ | Non-Emergency/Dispatch |
| Washoe, NV | (775) 785-9276 | washoelife.washoecounty.gov sheriff post | non-emergency line (WCSO) |
| Cochise, AZ | (520) 432-9500 | cochise.az.gov/sheriff | To Report Non-Emergencies (also 520-803-3550, 800-362-0812) |
| Maricopa, AZ | (602) 876-1011 | mcso.org | Non-emergency |
| Pima, AZ | (520) 351-4900 | pimasheriff.org | NON-EMERGENCY |
| Albany, WY | (307) 721-2526 | albanycountywy.gov/362/Sheriff | Dispatch Phone |
| Johnson, WY | (307) 684-5581 | johnsoncowy.gov sheriff contact | Non-emergency line |
| Park, WY | (307) 527-8700 | parkcountysheriff-wy.gov/contact-us (read 2026-10-28) | 24 Hour Non-Emergency Numbers, Cody (Powell 754-8700) |

Not added. The official page returned 403, or it lists only an unlabelled office line, or the
number appears only on directories, news or Nixle: Inyo, Mono, Mariposa, Tuolumne, San Diego, Los
Angeles, Tulare, Kern, Placer, Shasta, Alpine, Madera, Santa Clara (a city page only), Monterey;
Clark NV, Elko; Coconino, Yavapai, Pinal, Gila, Mohave; Teton WY, Fremont WY, Crook, Sublette,
Natrona, Carbon. Several have a likely candidate in the session report. **Retry these from a
browser**: most were refused only because the county site blocks automated fetches.

## Oregon, Idaho, Montana, New Mexico (checked 2026-10-28)

| County | Number | Read on | Label on the page |
|---|---|---|---|
| Baker, OR | (541) 523-6415 | bakersheriff.org/dispatch.htm | the Dispatch page's phone, beside 911 |
| Clackamas, OR | (503) 655-8211 | clackamas.us/911/about | Non-Emergency (24/7); CCOM area (LOCOM covers Lake Oswego, West Linn, Milwaukie) |
| Deschutes, OR | (541) 693-6911 | sheriff.deschutes.org/contact-sheriff; deschutescounty.gov 911 page | Non-Emergency Dispatch; 24/7 |
| Jackson, OR | (541) 776-7206 | jacksoncountyor.gov/sheriff | ECSO Dispatch non-emergency line |
| Lane, OR | (541) 682-4150, then 1 | lanecountyor.gov sheriff's office | Press 1 for Dispatch Services 24/7 |
| Linn, OR | (541) 967-3950 | linnsheriff.org/contact | For non-emergency contact (24 hours) |
| Marion, OR | (503) 588-5032 | co.marion.or.us/SO phone directory | Emergencies & Dispatch: for non-emergency crimes |
| Multnomah, OR | (503) 823-3333 | mcso.us/contact-us | For non-emergencies call |
| Ada, ID | (208) 377-6790 | adacounty.id.gov/sheriff | Non-Emergency Dispatch |
| Bonner, ID | (208) 265-5525 | bonnercountyid.gov/sheriff | Dispatch |
| Bonneville, ID | (208) 529-1200 | idahofallsidaho.gov/235/Dispatch-E911 (joint Idaho Falls–Bonneville County 911) | Non-Emergency Dispatch |
| Cassia, ID | (208) 878-2251 | cassia.gov/sheriff | Non Emergency Dispatch |
| Elmore, ID | (208) 587-2100 | elmorecounty.org/phone-numbers | Dispatch |
| Valley, ID | (208) 382-5160 | valleycountyid.gov/departments/911 | Non-Emergency Dispatch |
| Beaverhead, MT | (406) 683-3700 | beaverheadcountymt.gov | Non-Emergency |
| Flathead, MT | (406) 758-5610 | flatheadcounty.gov department directory, FECC | Non-Emergency Number, Sheriff / Dispatch |
| Lewis and Clark, MT | (406) 447-8235 | lccountymt.gov/Sheriff/Contact-Us | Non-Emergencies; Dispatch |
| Lincoln, MT | (406) 293-4112 ext. 5 | lincolncountymt.us sheriff contact | Non-Emergency Dispatch |
| Missoula, MT | (406) 728-0911 | missoulacounty.gov 9-1-1 Center | Reporting a non-emergent crime (also 406-258-3452) |
| Ravalli, MT | (406) 363-3033 | ravallicounty.gov/341/Dispatch-Center | calling for service, but it is NOT an emergency |
| Sandoval, NM | (505) 898-7585 | sandovalcountynm.gov SCSO contact | Non-Emergency |
| Santa Fe, NM | (505) 428-3710 | santafecountynm.gov/public-safety/recc | NON-EMERGENCY Dispatch (an older sheriff page shows 428-3720; the dispatch centre's own page wins) |

Not added: Jefferson OR, Hood River, Josephine, Douglas OR, Wallowa, Columbia OR, Klamath
(ext. 4, maybe weekdays only); Custer ID, Blaine, Boise, Kootenai, Twin Falls, Owyhee, Teton ID,
Idaho County; Gallatin, Park MT (a city page only), Carbon MT, Stillwater, Glacier, Madison, Sweet
Grass; Bernalillo, Taos, Doña Ana, Otero, Rio Arriba, San Miguel NM; Pennington SD (its
non-emergency line is Rapid City Police's), Custer SD (state directory only); Llano, Brewster,
El Paso TX, Burnet, Travis; Comanche, Kiowa OK.

## The East and Midwest (checked 2026-10-28)

| County | Number | Read on | Label on the page |
|---|---|---|---|
| Essex, NY | (518) 873-2116 | oes.essexcountyny.gov | Non-Emergency 24 Hour Line (the sheriff's own line is not staffed 24/7) |
| Carbon, PA | (570) 325-9123 | carboncountypa.gov emergency-management phone numbers; communication_center | Communications Center (non-emergency) |
| Monroe, PA | (570) 992-9911 | monroeco911.com (linked from monroecountypa.gov) | NON-EMERGENCY |
| Warren, NJ | (908) 475-6309 | wcsheriffnj.gov/faqs | Non-emergency contact information |
| Albemarle, VA | (434) 977-9041 | cua911.gov | Non Emergency? Dial |
| Fairfax, VA | (703) 691-2131 | fairfaxcounty.gov/911/Calling-non-emergency | non-emergency phone number |
| Scott, VA | (276) 386-9111 | scottcountyvirginiasheriff.com/contact; scottcountye911.com/contact | NON-EMERGENCY |
| Powell, KY | (606) 663-4116 | powellcounty.ky.gov Powell Dispatch page | Powell County Dispatch Center |
| Hamilton, TN | (423) 622-0022 | hcsheriff.gov/LawEnforcement | Non-Emergency number 24/7 |
| Marion, TN | (423) 942-2525 | marioncountytnsheriff.info/contact-us | Non Emergency number (also 942-3004) |
| Henderson, NC | (828) 697-4911 | sheriffhendersoncounty.com/communications | Communications Center (emergency and non-emergency calls) |
| Macon, NC | (828) 524-2020 | maconnc.org 911-communications and sheriffs-office | Non-Emergency Number |
| Rutherford, NC | (828) 287-6247 | rutherfordcountync.gov sheriff | Non-emergency (the Communications Center's unlabelled 286-2911 may be the 24-hour line) |
| Greenville, SC | (864) 271-5210 | gcso.org | NON-EMERGENCY |
| Pickens, SC | (864) 898-5500 | pickenssheriff.com contact | Non-emergency |
| DeKalb, AL | (256) 845-3801 | dekalbcountysheriff.org | Non-Emergency (24 hours) |
| Jackson, AL | (256) 574-2610 | jacksoncountysheriffal.org/administration | Non-Emergency (24 hours) |
| Pope, AR | (479) 968-0911 | popecountyar.gov Pope County 9-1-1 | Non-emergency dispatch |
| Cook, MN | (218) 387-3030 | cookcountymn.gov sheriff | report to Cook County Dispatch by our admin line |
| Iron, MO | (573) 546-4000 | icsomo.org/contact | Dispatch (24 hours) |

Not added: Ulster, Westchester; Carroll NH (603-539-2284 is a strong candidate; the page would
not load), Coos, Grafton; Chittenden, Lamoille; Hancock ME, Piscataquis (564-3304 appears only
on town pages); Berkshire, Middlesex MA; Connecticut, which has no county agencies; Luzerne;
Sussex NJ; Giles VA; Wolfe, Lee KY; Franklin TN; Burke, Stokes, Transylvania, Watauga,
McDowell NC; Walker, Dade, Rabun GA; Madison AL; Newton, Searcy, Pulaski AR; Lake MN, Nicollet;
Sauk WI; Johnson IL (658-8264 appears on a City of Vienna page only), Union IL, Jackson IL;
St. Francois MO.

## West Virginia (checked 2026-10-28)

All 55 counties come from the West Virginia Emergency Management Division's *Local 911
Non-Emergency 24-7 Contact Information* (emd.wv.gov/media/23/local-non-emergency-contacts, PDF
dated December 19, 2025). It is a state agency's list of each county's 24/7 non-emergency line,
which is exactly this purpose. Where a county lists two numbers (Clay, Kanawha), the first is
used. Climbing counties covered: Fayette (New River Gorge) 304-574-3590, Pendleton (Seneca
Rocks) 304-358-3271, Monongalia (Coopers Rock) 304-599-6382, Nicholas (Summersville Lake)
304-872-4911, Tucker 304-478-2187, Grant 304-257-2140, Randolph 304-636-2000, Raleigh
304-255-0911. **Other states may publish the same kind of list**, and it is the fastest way to
cover a whole state.

## Washington (checked 2026-10-28)

| County | Number | Read on | Label on the page |
|---|---|---|---|
| Asotin | (509) 758-2331 | asotincountywa.gov/242/Forms | "contact our dispatch" to make a report |
| Chelan | (509) 663-9911 | rivercom911.org/contact-us; douglascountywa.gov FAQ | For non-emergency service, contact our dispatch center |
| Clallam | (360) 417-2459 | clallamcountywa.gov/556/Contact-Us | Non-Emergency Dispatch (24 hours) |
| Clark | (360) 693-3111 | clark.wa.gov/sheriff/report-crime; cresa.wa.gov 911-311 | non-emergency law enforcement assistance |
| Columbia | (509) 382-2518 | columbiaco.com sheriff directory | Communications Center |
| Cowlitz | (360) 762-6800 | co.cowlitz.wa.us/957/Contact-Us | Non-emergency dispatch |
| Douglas | (509) 663-9911 | douglascountywa.gov/344 and FAQ | Call 663-9911 to speak with our dispatch |
| Grant | (509) 762-1160 | macc911.org; grantcountywa.gov directory | Non-Emergency (Call/Text) |
| Jefferson | (360) 344-9779 | jeffcom911.us/when-to-call; co.jefferson.wa.us/172/Sheriff | 24-hour non-emergency line |
| King | (206) 296-3311 | kingcounty.gov/en/dept/sheriff | For non-emergency service, call 206-296-3311 24 hours/day |
| Kittitas | (509) 925-8534 | co.kittitas.wa.us sheriff; kittcom.gov/186/Contact-Us | Kittcom's non-emergency line |
| Lewis | (360) 740-1105 | lewiscountywa.gov 911-communications | Central Dispatch (Non-Emergency) |
| Mason | (360) 426-4441 | masoncountywa.gov/sheriff/contact_us.php | Non-Emergency Dispatch |
| Okanogan | (509) 422-7232 | okanogancounty.gov/260 | Dispatch Complaint (non-emergency) line |
| Pend Oreille | (509) 447-3151 | pendoreille.gov/sheriff/page/dispatch | Communications Center: 911 and non-emergency calls |
| Pierce | (253) 287-4455 | southsound911.org/contact-us | Non-emergency police, fire or medical aid |
| Skagit | (360) 428-3211 | skagitcountywa.gov sheriff's office; code-compliance page | non-emergency 24 hour line |
| Snohomish | (425) 407-3999 | sno911.org; sno911.org/resources | Non-Emergency |
| Spokane | (509) 456-2233 | spokanecounty.gov sheriff directory and Crime Check page (403 to fetch; read via the search index) | Non-Emergency (Crime Check, 24/7) |
| Thurston | (360) 704-2740 | thurstoncountywa.gov/departments/sheriff | Police Non-Emergency / Dispatch |
| Walla Walla | (509) 527-3265 | wwcowa.gov/departments/sheriff | Dispatch |
| Whatcom | (360) 676-6911 | whatcomcounty.us/200/Sheriff (read 2026-09-16); 2025 sheriff press release | FOR NON-EMERGENCY DISPATCH OR TO SPEAK TO A DEPUTY |
| Yakima | (509) 574-2500 ext. 0 | yakimacounty.us FAQ | Sheriff's Office Dispatch for non-emergencies |

Notes:
- Skagit: 360-416-1911 is the Mount Vernon office's weekday business line, so it is not used.
  The stored `emergency` prose on many Skagit routes names 360-336-9450 and 428-3211 as
  after-hours lines. That matches this entry (see the sheriff-number sweep of 2026-09-16).
- A route's own stored `emergency.sheriffDispatch` still wins over this table; the table is
  shown only when the route has none.

No official page found (left out; a climber can add one through Edit): Skamania (the sheriff site
lists only an unlabelled 509-427-9490), Stevens (509-684-2555 appears only on non-official
lists), Klickitat, Garfield, Ferry (only an unlabelled 509-775-3132), Grays Harbor (533-8765
appears only on a radio-station page), and Whitman (its only non-emergency number is on a City
of Pullman page).

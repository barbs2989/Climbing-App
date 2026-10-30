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

Left out on 2026-10-28 for want of a labelled county page: Chaffee, Gunnison, San Miguel, San
Juan, La Plata, Eagle, Summit, Lake, Fremont, Pitkin, Grand, Routt, Park. All of them are now
filled from the state list below. Still not added: Mineral, Rio Grande, Saguache, Alamosa,
Conejos, Costilla (see below) and Montrose (Western Colorado Regional Dispatch answers for
Montrose and Ouray, but the City of Montrose announced its own centre in 2024, so which line
reaches the county is unsettled).

## Colorado: the state list (checked 2026-10-29)

Read on puc.colorado.gov/public-safety-answering-point-psap (Colorado Public Utilities
Commission, 403 to scripts, read in a browser). The page calls itself "a list of every active
Public Safety Answering Point (PSAP), or 9-1-1 call center, in Colorado, along with each
center's non-emergency administrative line". It is a state agency's list, labelled for this
purpose, the way West Virginia's is. It matches the county's own page for Boulder, El Paso,
Huerfano, Jefferson, Larimer, Mesa, Ouray and Teller.

| County | Number | PSAP row on the list |
|---|---|---|
| Adams | (303) 289-2235 | Adams County Communications Center Authority (Adcom) |
| Arapahoe | (303) 795-4711 | Arapahoe County Sheriff's Office |
| Archuleta | (970) 731-2160 | Archuleta County Combined Dispatch |
| Baca | (719) 523-4511 | Baca County Sheriff's Office |
| Bent | (719) 456-1363 | Bent County Communications Center |
| Chaffee | (719) 539-2596 | Chaffee County Emergency Communications Center |
| Crowley | (719) 267-5235 | Crowley County Sheriff's Office |
| Delta | (970) 874-2015 | Delta County 911 |
| Denver | (720) 913-2000 | Denver 911 Communications Center |
| Eagle | (970) 479-2201 | Vail Public Safety Communications Center |
| Fremont | (719) 276-5555 | Combined Regional Communications Authority (CRCA - Fremont and Custer Counties) |
| Gilpin | (303) 582-5500 | Gilpin County |
| Grand | (970) 725-3343 | Grand County Communications - Hot Sulphur Springs |
| Gunnison | (970) 641-8200, then 1 | Gunnison Regional Communications Center |
| Jackson | (970) 723-4242 | Jackson County Sheriff's Office |
| Kit Carson | (719) 346-9325 | Kit Carson County Communications Center |
| La Plata | (970) 385-2900 | Durango Emergency Communications Center |
| Lake | (719) 486-1249 | Lake County Emergency Communications Center |
| Las Animas | (719) 846-4441 | Las Animas County E911 Authority |
| Lincoln | (719) 743-2846 | Lincoln County Sheriff's Office |
| Morgan | (970) 867-8531 | Morgan County Communications Center |
| Park | (719) 836-4121, option 5 | Park County Communications |
| Phillips | (970) 854-2735 | Phillips County Communications Center |
| Pitkin | (970) 920-5310 | Pitkin County Regional Emergency Dispatch Center |
| Prowers | (719) 336-3977 | Prowers County Combined Communications Center |
| Pueblo | (719) 583-6250 | Pueblo County Sheriff's Office |
| Routt | (970) 879-1090 | Routt County Communications |
| San Juan | (970) 249-4392 | Colorado State Patrol - Montrose (Answering 911 for San Juan County) |
| San Miguel | (970) 728-1911 | San Miguel County Sheriff's Office |
| Sedgwick | (970) 474-3355 | Sedgwick County Communication Center |
| Summit | (970) 668-8600 | Summit County 911 Communications Center |
| Washington | (970) 848-0464 | Washington-Yuma Combined Communications Center |
| Yuma | (970) 848-0464 | Washington-Yuma Combined Communications Center |
| Weld | (970) 356-4015 | Weld County Regional Communications Center |

Notes:
- Eagle: the Vail Public Safety Communications Center is Eagle County's dispatch. La Plata:
  the Durango centre is the Durango-La Plata County one. San Juan: the State Patrol answers 911
  for San Juan County (Silverton), and the list says so.
- Gunnison is printed "xt 1" and Park "x5", and the card writes them as menu choices. Park was
  refused on 2026-10-28 because the county page shares option 5 with Animal Control; the state
  list names it as the dispatch centre's own line, so it goes in.
- Three counties already on the card differ from the state list, and keep the county's own
  labelled line: Douglas (state list 303-660-7500), Garfield (625-8095, which the sheriff's page
  names as Patrol & Dispatch) and Montezuma (Cortez centre 565-8441).
- Not used: the San Luis Valley row ("San Luis Valley E-911/Colorado State Patrol - Alamosa",
  719-589-5807). It names two agencies at once, so it is not clear that it is the six valley
  counties' own dispatch line. Eastern Rio Blanco only (878-9600) and every city, campus and
  base row are also left out.

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

## Alaska, Hawaii and more (checked 2026-10-28)

In Alaska, search and rescue outside the cities is run by the Alaska State Troopers, so each
borough gets its Trooper region's dispatch line, read on dps.alaska.gov/ast/contacts:

| Borough / census area | Number | Region named on the page |
|---|---|---|
| Matanuska-Susitna | (907) 352-5401 | Mat-Su Valley & Copper Valley |
| Copper River | (907) 352-5401 | Mat-Su Valley & Copper Valley |
| Kenai Peninsula | (907) 262-4453 | Kenai Peninsula & Southeast AK |
| Fairbanks North Star | (907) 451-5100 | Interior & Western Alaska |
| Denali | (907) 451-5100 | Interior & Western Alaska (Denali Borough is Interior) |

Other states:

| County | Number | Read on | Label on the page |
|---|---|---|---|
| Kauai, HI | (808) 241-1711 | kauai.gov county press release | Kaua'i Police Department's non-emergency dispatch line |
| Kendall, TX | (830) 249-9721 | kendallcountysheriff.com/departments | Phone (24-Hour) |
| Jackson, NC | (828) 586-1911 | jacksonnc.org/164/Sheriffs-Office | Dispatch |

Not added: Anchorage, Juneau and Chugach (no Trooper region line names them); Honolulu (529-3111
is unlabelled), Maui, Hawaii County; Hocking, Summit OH, Cuyahoga; Marquette, Alger, Keweenaw,
Houghton; Monroe IN, Lawrence IN; Rockcastle, Estill, Menifee, Laurel, McCreary; Fentress,
Morgan, Cumberland, Sequatchie, Rhea, Grundy; Chattooga, Habersham; Wilkes, Surry, Ashe, Avery,
Caldwell, Polk NC, Swain; Rockbridge (540-463-7328 is likely; the page dropped the connection),
Bland, Bath, Shenandoah, Smyth, Grayson; Maryland's Washington, Montgomery, Frederick and
Garrett; Orange, Rockland, Clinton, Warren NY, Hamilton NY, Herkimer; Bucks, Allegheny, Fayette
PA, Westmoreland, Adams; Norfolk, Franklin MA, Hampshire; Belknap, Sullivan, Cheshire; Rutland,
Windsor, Bennington; Oxford, Franklin ME, Knox; Bandera, Medina, Bexar, Brewster, Llano; Comanche,
Murray; Dawes; Lawrence SD, Meade; Billings ND; Douglas KS; Clayton, Dubuque; St. Louis MN, Pine,
Carlton, Goodhue; Door, Douglas WI, Bayfield. Most of these were not reached yet, not refused.

## Arkansas: the state list (checked 2026-10-29)

Read on the Arkansas 911 Board's *List of PSAP Contacts* (911board.arkansas.gov/psap-contacts),
spreadsheet EXTERNAL-PSAP-CONTACTS-05.16.2022.xlsx. It is a state agency's list, and its column
is headed "PSAP Non-Emergency 24/7". The card uses only rows for the county's own PSAP (sheriff,
county 911 or county central dispatch). It uses no city police, EMS or campus row. The file is
dated May 2022, so re-check it first when the list is next reviewed.

| County | Number | PSAP row |
|---|---|---|
| Ashley | (870) 853-2040 | Ashley County Sheriff |
| Baxter | (870) 425-2361 | Baxter County 911 |
| Benton | (479) 271-1005 | Benton County · CENCOM dispatch |
| Boone | (870) 365-0797 | Boone County 911 |
| Calhoun | (870) 798-2323 | Calhoun County Sheriff |
| Carroll | (870) 423-7373 | Carroll County Sheriff |
| Clark | (870) 246-2222 | Clark County Sheriff |
| Clay | (870) 598-2270 | Clay County Sheriff |
| Cleburne | (501) 362-8291 | Cleburne County 911 |
| Cleveland | (870) 325-6222 | Cleveland County 911 |
| Columbia | (870) 234-5655 | Columbia County Central Dispatch |
| Conway | (501) 215-2911 | Conway County 911 |
| Craighead | (870) 935-5551 | Craighead County · Jonesboro Regional 911 |
| Crawford | (479) 474-2261 | Crawford County Emergency Communications |
| Crittenden | (870) 702-2000 | Crittenden County Sheriff |
| Cross | (870) 238-5700 | Cross County Sheriff |
| Dallas | (870) 352-2002 | Dallas County 911 |
| Desha | (870) 222-3636 | Desha County 911 |
| Drew | (870) 367-3411 | Drew County 911 |
| Faulkner | (501) 328-5906 | Faulkner County 911 |
| Fulton | (870) 895-2601 | Fulton County 911 |
| Garland | (501) 622-3666 | Garland County Emergency Communications |
| Grant | (870) 942-2101 | Grant County 911 |
| Hot Spring | (501) 337-8451 | Hot Spring County 911 |
| Howard | (870) 845-3541 | Howard County Sheriff |
| Independence | (870) 698-2436 | Independence County Central Dispatch |
| Izard | (870) 368-4203 | Izard County Sheriff |
| Jefferson | (870) 541-5300 | Jefferson County 911 (MECA) |
| Johnson | (479) 774-6911 | Johnson County 911 |
| Lafayette | (870) 921-4252 | Lafayette County 911 |
| Little River | (870) 898-5115 | Little River County Sheriff |
| Logan | (479) 963-3271 | Logan County 911 |
| Marion | (870) 449-6666 | Marion County Sheriff |
| Miller | (870) 361-1010 | Miller County Sheriff |
| Monroe | (870) 747-3381 | Monroe County Sheriff |
| Montgomery | (870) 867-3151 | Montgomery County 911 |
| Nevada | (870) 887-4911 | Nevada County 911 |
| Newton | (870) 446-5124 | Newton County 911 (Jasper) |
| Ouachita | (870) 231-5300, ext. 1 | Ouachita County 911 |
| Perry | (501) 889-2333 | Perry County 911 |
| Phillips | (870) 338-5555 | Phillips County Sheriff |
| Poinsett | (870) 578-2116 | Poinsett County Sheriff |
| Polk | (479) 394-2511 | Polk County Sheriff (Mena) |
| Prairie | (870) 256-4137 | Prairie County Sheriff |
| Pulaski | (501) 340-6963 | Pulaski County Sheriff |
| St. Francis | (870) 633-2611 | St. Francis County Sheriff |
| Saline | (501) 303-5648 | Saline County Emergency Communications |
| Scott | (479) 637-4155 | Scott County Sheriff |
| Searcy | (870) 448-2340 | Searcy County Sheriff (Marshall) |
| Sebastian | (479) 783-1051 | Sebastian County Sheriff |
| Sevier | (870) 642-2125 | Sevier County 911 |
| Sharp | (870) 994-2211 | Sharp County Sheriff |
| Stone | (870) 269-3825 | Stone County Sheriff |
| Van Buren | (501) 884-6005 | Van Buren County 911 |
| White | (501) 279-6241 | White County 911 |
| Woodruff | (870) 347-3003 | Woodruff County 911 |
| Yell | (479) 495-4881 | Yell County 911 |

Not added: counties whose only PSAP row is a city police department (Arkansas, Bradley,
Hempstead, Jackson, Lee, Greene, Union's El Dorado row), and rows with an empty non-emergency
cell (Chicot, Franklin, Lawrence, Lincoln, Lonoke, Madison, Pike, Randolph, Union Sheriff,
Mississippi). Washington County's only county row is Central EMS, an ambulance service, so it
is not used either.

**Statewide lists, for the next pass.** Each of these could cover a whole state at once:
Colorado and Arkansas were read on 2026-10-29, above. The other three were read and refused:
- Pennsylvania: the PEMA directory now lives at pa.gov/agencies/ready/contact/county-911, read
  in a browser. It lists each county's **911 coordinator**, a named person with an office
  number, not a dispatch line.
- Oregon: OEM's *PSAP Directory by County* (dated 10/8/2026) labels its numbers only "Tel:" and
  "24hr:". Where the county publishes its own line, the "24hr" number disagrees with it.
  Deschutes's 24hr line is 541-693-7911, but the county's own non-emergency line is 693-6911.
  Clackamas's is 655-8911 against 655-8211. These look like internal lines, so the list is
  not used.
- Montana: DOJ's *Certified Primary PSAPs* (April 2025) labels only a manager's "Phone:".
- No other state was found to publish a usable list. Virginia, North Carolina, Vermont and New
  Hampshire were checked: their lists name contact people or no lines at all.

Two lists were refused. Minnesota DPS lists each county's 10-digit 24-hour *emergency* line,
not a non-emergency one. Washington's mil.wa.gov/alternative911 lists lines for use only when
911 is down. Michigan's per-county list is a 2021 draft from a non-state association.

## Read in a browser (checked 2026-10-29)

These county sites refused scripted reads on 2026-10-28. Each was read in Chrome on the
agency's own page. Rockbridge's and Sublette's pages label the line only "Dispatch", on the
sheriff's own page, which the rule accepts.

| State | County | Number | Read on | Label on the page |
|---|---|---|---|---|
| Wyoming | Teton | (307) 733-2331 | tetonsheriff.org/FAQ.aspx; /174/Communications-Center | the non-emergency line, 307-733-2331 (Communications Center, staffed 24/7) |
| Wyoming | Sublette | (307) 367-4378 | sublettecountywy.gov/directory.aspx?did=23 | Dispatch (county directory, sheriff's office) |
| Nevada | Clark | (702) 828-3111 | lvmpd.com/services/when-to-call-9-1-1-or-3-1-1 | To reach our Dispatch Center you can also call (702) 828-3111 (beside: call 3-1-1 for police non-emergency) |
| California | San Diego | (858) 868-3200 | sdsheriff.gov/i-want-to/report | Non-emergency dispatch |
| California | Kern | (661) 861-3110 | kernsheriff.org/online-reporting; /Contact | For non-emergencies, call ...; Contact page: Dispatch |
| California | Tuolumne | (209) 533-5815 | tuolumnecounty.ca.gov/Directory.aspx?did=35 | Dispatch Ph, Open 24/7 |
| California | Placer | (530) 886-5375 | placer.ca.gov/2533/Dispatch | The non-emergency phone line (Dispatch Center, 24/7) |
| California | Tulare | (559) 733-6218 | tularecounty.ca.gov/sheriff/about-us/contact-us | Communications – Non Emergency Dispatch |
| California | Shasta | (530) 245-6540 | shastacounty.gov/sheriff/page/vine | for non-emergencies, please call |
| California | Madera | (559) 675-7770 | maderacounty.com/government/sheriff/online-reporting | non-emergency |
| Arizona | Coconino | (928) 774-4523, option 1 | coconino.az.gov Sheriff contact form page | call our Dispatch Center at ..., option 1 |
| Arizona | Yavapai | (928) 771-3260 | ycsoaz.gov/Contact-Information | Non-Emergency |
| Arizona | Pinal | (520) 866-5111 | pinal.gov/m/directory/department?did=126 | Non-Emergency |
| New Mexico | Taos | (575) 758-2216 | taoscounty.org/217/Sheriffs-Office; /294/Taos-Central-Dispatch | For non-emergency calls, please call Central Dispatch (24/7) |
| New Mexico | Bernalillo | (505) 798-7000 | bernco.gov/bernalillo-county-sheriff/numbers | Sheriff's Office (Non-Emergency) |
| Virginia | Rockbridge | (540) 463-7328 | rockbridgecountyva.gov/147/Sheriff | Dispatch (sheriff's page) |
| Washington | Stevens | (509) 684-2555 | stevenscountywa.gov/21252/sheriffs-office-faqs | If it's a non-emergency, contact Stevens County Dispatch |
| Idaho | Blaine | (208) 578-3831 | blainecountyid.gov/m/faq?cat=27 | please call our non-emergency line (Emergency Communications FAQ) |
| Idaho | Kootenai | (208) 446-1854 | kcsheriff.com/Directory.aspx?did=18 | Kootenai County 911 Non-Emergency Line |
| Idaho | Teton | (208) 776-8200 | tetoncountyidaho.gov emergency contact information | (Non-Emergency Line) |

Still refused after the browser read:
- Inyo: only a weekday admin line (760-878-0383).
- Mono: (760) 932-7549 ext. 7, with no label; the pages that would label it return 404.
- Los Angeles: station lines only, with no countywide line.
- Mariposa: office line only.
- Alpine: department phone only.
- Mohave: main line only.
- Gila: the contact page would not load.
- Gunnison: the sheriff's page shows only an office line. It is filled from the Colorado state
  list instead.
- Eagle: main line only. It is filled from the state list.
- Fremont WY: office lines only.
- Carroll NH: the site errored twice.
- Coos NH: 404.
- Grafton NH: no county page.
- Ulster: an unlabelled 338-3640.
- Gallatin: its dispatch page prints 406-582-2092 with 8-5 hours.
- Custer ID: no official page was read.

## More counties (checked 2026-10-29)

Each number was read on the agency's own page (WebFetch or a browser), with the label shown.
Three are joint city-county centres whose page sits on the city's site: Dubuque, WHITCOM
(Whitman) and the Mesilla Valley Regional Dispatch Authority (Doña Ana). Each page says that
centre dispatches for the whole county, so it is not a city-only line. Pennington's line is the
county 911 page's own "NON-EMERGENCY NUMBER", for the joint Rapid City and Pennington centre.

| State | County | Number | Read on | Label on the page |
|---|---|---|---|---|
| North Carolina | Transylvania | (828) 884-3188 | transylvaniacounty.org/departments/communications-911 | Non Emergency (Communications 911 page) |
| North Carolina | Stokes | (336) 593-8139 | co.stokes.nc.us/departments/non_emergency_numbers.php; /patrol.php | NON Emergency Numbers: Communications Center (first of its lines; Patrol page names it) |
| Alabama | Madison | (256) 722-7181 | madisoncountysheriffal.org/contact | Non-emergency (24 hours) |
| Ohio | Hocking | (740) 385-2131 | hockingsheriff.org/contact-us | Non-Emergency Dispatch |
| Michigan | Marquette | (906) 475-9912 | co.marquette.mi.us/departments/central_dispatch | Central Dispatch Non-Emergency Calls |
| Minnesota | Pine | (320) 629-8380 | pinecountymn.gov sheriff when_not_to_call_9-1-1 | The non-emergency number for the Pine County Sheriff |
| Minnesota | Carlton | (218) 384-3632 | carltoncountymn.gov/266/Dispatch-Information | In a non-emergency: Call ... (Dispatch Information) |
| Minnesota | Goodhue | (651) 385-3155 | goodhuecountymn.gov/262 | Non Emergency (Emergency Communications Division) |
| Wisconsin | Sauk | (608) 356-4895 | co.sauk.wi.us sheriffs-office-contacts | Non-Emergency/Dispatch |
| Wisconsin | Door | (920) 746-2400 | co.door.wi.gov/844/Resources | Non-Emergency |
| Texas | Travis | (512) 974-0845, option 3 | tcsheriff.org/about/about-tcso/contact-us | 24/7 Non-Emergency Dispatch |
| Texas | Bexar | (210) 335-6000 | bexar.org/770/Report-a-Crime | Dispatch Office (Report a Crime page); county directory entry Non-Emergency Dispatch |
| South Dakota | Pennington | (605) 394-4131 | pennco.org/law_public_safety/911_communications | NON-EMERGENCY NUMBER (county 911 page; the joint Emergency Services Communications Center) |
| Iowa | Dubuque | (563) 589-4415 | cityofdubuque.org/397 | Non-Emergency Dispatch (the centre serves all of Dubuque County) |
| New York | Ulster | (845) 338-3640 | trafficsafety.ny.gov/location/ulster-county-sheriffs-office | 24/7 Dispatch (NY State traffic-safety agency's listing of the sheriff's office) |
| Maine | Franklin | (207) 778-6140 | franklincountymaine.gov/communications | For non-emergency concerns contact the Franklin County Regional Communications Center |
| Maine | Knox | (207) 593-9132 | knoxcountymaine.gov knox_regional_communications_center | For non-emergencies dial |
| Maine | Oxford | (207) 743-9554 | oxfordcounty.org/contact | REGIONAL COMMUNICATIONS CENTER (DISPATCH); the page says these numbers are non-emergency only |
| Maryland | Washington | (240) 313-4345 | washco-md.net/emergency-services/emerg-coms-911 | Non-Emergency Phone Number (Emergency Communications Center) |
| Maryland | Frederick | (301) 600-2071 | frederickcosheriff.com/phone-numbers-fcso | Non-Emergency Dispatch |
| Maryland | Garrett | (301) 334-1911 | garrettcountymd.gov emergency-management news 2025-12 | the Garrett County Sheriff's Office non-emergency line (fire/rescue communications: 301-334-1929) |
| Maryland | Montgomery | (301) 279-8000 | montgomerycountymd.gov/OPI/make_right_call.html | Police Non-Emergency Number (the county's own police) |
| Pennsylvania | Westmoreland | (724) 600-7300 | westmorelandcountypa.gov/m/faq?cat=49 | the Westmoreland County non-emergency phone number (county 9-1-1 FAQ) |
| Montana | Park | (406) 222-2050 | parkcountymt.gov Sheriff-s-Office | Non-Emergency Dispatch |
| Montana | Carbon | (406) 446-1234 | carbonmt.gov/sheriff | non-emergency/dispatch |
| Oregon | Klamath | (541) 884-4876, ext. 4 | klamath911.gov/contact-us | Non-Emergency Line, ext. 4 (Klamath 911 district) |
| Hawaii | Hawaii | (808) 935-3311 | hawaiipolice.gov/contact-us/hotlines | NON-EMERGENCY / the HPD's non-emergency telephone number |
| North Carolina | Wilkes | (336) 838-9111 | wilkescounty.net/174/Field-Operations | 336-838-9111 for non-emergency calls (sheriff's Field Operations page) |
| Washington | Grays Harbor | (360) 533-8765 | graysharbor.gov/government/sheriff | Dispatch Non-Emergency (sheriff's page, marked under construction) |
| Washington | Whitman | (509) 332-2521 | pullman-wa.gov/services/police/whitcom_911.php | Non-Emergency Reporting (WHITCOM serves Whitman and Asotin counties; page hosted by Pullman) |
| New Mexico | Doña Ana | (575) 526-0795 | lascruces.gov/?p=1240 | For non-emergencies, call ... (MVRDA answers and dispatches 911; page hosted by Las Cruces) |

Refused or not reached in the South and Midwest (2026-10-29):
- Custer SD: a state directory page only.
- Minnesota's DPS "24-Hour Telephone" list (Lake, St. Louis, Nicollet): refused, as on 2026-10-28.
- Search snippets only: Laurel KY (606-878-7000), Walker GA (706-375-7810; the county page is
  404), Douglas KS (785-843-0250), Bayfield (715-373-6120, a town page), Summit OH (a township
  page).
- Office lines only: Wolfe, Powell, Rockcastle, Marion TN, Sequatchie, Cumberland, Rabun (its
  page is 403), Llano and Brewster.
- Refused: Comanche OK (Nixle), Monroe IN (a 2015 city list) and Burke (a 2016 city document; 403).
- Nothing found: Watauga, Cuyahoga, Union IL and Johnson IL.
- Not reached yet: Lee KY, Estill, Menifee, McCreary; Franklin TN, Fentress, Morgan TN, Rhea,
  Grundy; McDowell, Wilkes, Surry, Ashe, Avery, Caldwell, Polk NC, Swain; Dade, Chattooga,
  Habersham; Jackson IL, Lawrence IN, St. Francois, Alger, Keweenaw, Houghton, Douglas WI;
  Burnet, El Paso TX, Bandera, Medina; Kiowa, Murray; Lawrence SD, Meade; Billings, Dawes,
  Clayton.

Refused or not reached in the East (2026-10-29):
- Carroll NH: 603-539-2284 is shown as "Dispatch" in search text, but the county site reset
  every connection, so the page itself could not be read.
- Office lines only, no label: Warren NY, Rockland, Coos, Belknap, Cheshire, Hancock ME, Sussex
  NJ, and the Vermont State Police barracks.
- Number seen only on a town, city or news page: Grafton, Piscataquis (564-3304; the "24/7
  non-emergency, option 1" label is on Dover-Foxcroft's page), Berkshire, Luzerne, Allegheny
  and Adams PA.
- Bucks: its only line is the 911-outage alternate.
- Not reached: Orange NY, Clinton, Hamilton NY, Herkimer, Westchester, Sullivan NH, the
  Massachusetts counties other than Berkshire, Fayette PA, Bland, Bath, Shenandoah, Smyth,
  Grayson and Giles VA.

Refused or not reached in the West (2026-10-29):
- Unlabelled lines: Madison MT, Sweet Grass, Fremont WY, Natrona, Honolulu (529-3111) and
  Stillwater (a sheriff's office line).
- The page returned 404: Gallatin (582-2100) and Mono.
- Number seen only in search text: Maui, McDowell, Klickitat (773-4545).
- No line found: Bandera, Custer ID, Inyo.
- Blocked (403): Jefferson OR, Douglas OR, Skamania.
- No official page found: Twin Falls, Glacier, Hood River, Josephine, Otero, Crook, Elko,
  Mohave, Gila, San Juan UT, Burnet, Surry, Lawrence SD.
- Not reached: Boise, Owyhee, Idaho County; Rio Arriba, San Miguel NM, Grant NM; Wallowa,
  Columbia OR, Wasco; Ferry, Garfield WA; Duchesne, Box Elder; Lincoln NV, Nye; Carbon WY, Big
  Horn WY; Alpine, Mariposa, Monterey, Santa Clara, Los Angeles; and the southern leftovers.
- Lewis and Clark also has the Helena-Lewis & Clark 911 Center's non-emergency line,
  406-457-8866 (on the city site). The card uses the sheriff's own line.

## Last sweep (checked 2026-10-29)

San Juan County, Utah (Indian Creek and Bluff) is dispatched by the Utah Department of Public
Safety's Price Communications Center. That centre serves Carbon, Emery, Grand and San Juan
counties (dps.utah.gov/dispatch). Its page labels 435-637-0890 "Main Dispatch", the same label
the card already takes for the Cedar and Uintah Basin centres. Before this, San Juan had no
line, because the sheriff's page shows only an office number.

| State | County | Number | Read on | Label on the page |
|---|---|---|---|---|
| North Carolina | Polk | (828) 894-0187 | polknc.gov/communications_911.php | Non-emergency line: (828) 894-0187 or 0188 (E-911 Communications, 24 hours) |
| Utah | Box Elder | (435) 856-7023 | boxeldercountyut.gov/257/Frequently-Dialed-Numbers; dps.utah.gov/dispatch/box-elder-communications | Box Elder County Non-Emergency Dispatch Phone Number (eight numbers under it; the state DPS page names 856-7023 the Communications Center's main number) |
| Nevada | Nye | (775) 751-7000 | nyecountynv.gov/109 | Non-Emergencies (sheriff's page; Tonopah 482-8101 and Beatty 553-2345 also listed) |
| Utah | San Juan | (435) 637-0890 | dps.utah.gov/dispatch/price-communications; dps.utah.gov/dispatch | Main Dispatch (Utah DPS Price Communications Center, which serves Carbon, Emery, Grand and San Juan counties) |
| Utah | Carbon | (435) 637-0890 | dps.utah.gov/dispatch/price-communications | Main Dispatch (Utah DPS Price Communications Center) |
| Oregon | Jefferson | (541) 384-2080 | jeffersoncountyor.gov/sheriff | 24-hour non-emergency Dispatch |
| Oregon | Douglas | (541) 440-4471 | dcso.com/Directory.aspx?did=12; dcso.com/276/Making-a-Report | Dispatch (Non-Emergency); call our dispatch center at |
| Washington | Skamania | (509) 427-9490 | skamaniacounty.gov county-clerk/protection-orders | for non-emergency calls to the Sheriff's Department (county clerk's page) |
| Nevada | Elko | (775) 777-7300 | elkocountynv.net sheriff/phone_directory.php | Non-Emergency Dispatch (sheriff staff directory) |
| Kansas | Douglas | (785) 843-0250 | dgcoks.gov/emergency-communications-911 | For non-emergency situations ... (24 hour, non-emergency) |
| California | Mono | (760) 932-7549, ext. 7 | monocounty.ca.gov/1278/Bridgeport-Main-Office | Dispatch 760-932-7549, ext. 7 |
| Arizona | Gila | (928) 402-4449 | gilacountyaz.gov short-term-rental page | Sheriff Department Non-Emergency Line (county page) |

Refused in the 2026-10-29 sweep of counties not reached before:
- Unlabelled ("Phone" only): Idaho County (208-983-1100, probably dispatch), Owyhee, Inyo,
  Los Angeles, Alger, Houghton, Medina TX and Ferry.
- Search, Nixle or town pages only: Mariposa, Watauga, Shenandoah (540-459-6101), Grayson,
  Giles, Meade, Carbon WY and Wallowa.
- Blocked or 404: Boise County, Orange NY, Clinton NY and El Paso TX.
- McDowell NC: 828-659-2241 is the 911 centre's contact "Phone", with no non-emergency label.
- Blocked even in a browser: Klickitat, Maui, Gallatin, Natrona, Walker GA, Carroll NH.
- Unlabelled lines: Burke (437-1911), Rabun, Piscataquis, Twin Falls, Mohave.
- Hood River: (541) 386-2711 is labelled "Non-Emergency" only in an image-only county brochure
  that could not be read.
- Josephine: its line needs a menu choice (474-5123, option 3), and the page could not be read.
- Laurel KY: a community directory only.
- Grand County, Utah keeps the sheriff's Search & Rescue line (259-8115). The Price centre
  (637-0890) dispatches for Grand too, but the Moab line is the more local of the two.

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

No official page found (left out; a climber can add one through Edit): Klickitat, Garfield, Ferry (only an unlabelled 509-775-3132), Grays Harbor (533-8765
appears only on a radio-station page), and Whitman (its only non-emergency number is on a City
of Pullman page).

# Technique how-to content: deep research (2026-11-14)

Owner asked (after the safety-and-skills audit, item B "the app teaches nothing"): "for 2, do deep research".
Four research passes, about 110 web searches plus page reads. No blocked site was worked around: SummitPost,
The Mountaineers, CascadeClimbers, Peakbagger and REI were skipped; Petzl tech-tip bodies render by script, so
Petzl claims rest on titles/snippets. **†** = no fetched source; check before it is written into the app.
Nothing here is legal advice.

## 1. Recommendation in one paragraph

Give each skill in `SKILLS` (ClimbMatchCore.jsx) a short **skill card**: what it is, when you need it, the
failure modes the accident data shows, "practise near the ground first", then **2-3 curated outbound links**
(Petzl / VDiff / Alpine Savvy / AAI / Ortovox / AAC) and **find a course** (AMGA, Mountaineers, AAI, clubs —
Washington first). The only procedures the app writes itself are short **field checklists** (rappel BRAKES,
partner check, lowering, crevasse-rescue order), available offline. Do **not** write our own step-by-step
rescue walkthroughs, never copy or redraw anyone's diagrams, never call a climber "verified/competent" for a
skill, and add an opt-in **"last practised"** date per skill.

## 2. Why (the evidence)

- **Climbers overrate rescue skill.** Hawley et al., *Wilderness & Environmental Medicine* 2019;30(1):44-51:
  25 multipitch climbers, 3 standard rescue scenarios — pass rates 28%, 68%, 52%; **only 24% passed all
  three**; experience, training and climbing frequency did not predict it; confidence matched ability in only
  one scenario. https://experts.mcmaster.ca/display/publication1642450
  → self-claims and vouches are weak evidence; no quizzes that award a skill.
- **Skills decay.** Meta-analysis of 457 reports (*Psychological Bulletin* 2025): about half of a procedural
  skill gain is lost after ~6.5 months unused. https://pubmed.ncbi.nlm.nih.gov/40455501/ Red Cross: CPR
  refresh every 6-12 months. Forum norm: "practise escaping the belay every season."
  → a "last practised" date with an opt-in 12-month nudge.
- **Accident data points at checks, not exotic systems.**
  - Inadequate/pulled protection is in 49% of trad incidents; all 13 pulled-pro accidents in 2023 were cams
    (Climbing.com analysis of ANAC; AAC Know the Ropes: Human Factors, 2025).
  - Descents ≈ 32% of incidents; rappel errors 29% of those, 76 of 251 fatal; leading rappel causes: anchor
    failure, no backup, rappelling off the ends (uneven ropes, no stopper knots).
    https://publications.americanalpineclub.org/articles/13201200200/Know-the-Ropes-Rappelling
  - More than half of lowering accidents: the rope end passed through the belay device.
    https://americanalpineclub.org/news/tag/lowering
  - Tie-in failures in ANAC are **unfinished** knots, not mistied ones → partner check.
  - 43% of ANAC accidents since 1948 involved experienced climbers.
    https://publications.americanalpineclub.org/articles/13201217363
- **Nobody else in our space does this.** Mountain Project's old "School of Rock" is gone; theCrag, KAYA,
  Vertical-Life, OpenBeta, Gaia and onX have no technique content. Instruction lives on specialist sites
  (Alpine Savvy, VDiff, Petzl, Ropelab, HowNOT2), organised **by discipline/skill, not by level**, as short
  numbered steps or short single-skill videos.

## 3. Licensing — what we may do

| Source | Link | Embed | Reproduce text / diagrams |
|---|---|---|---|
| Petzl tech tips | yes | Petzl YouTube via the YouTube player | no — "private, personal, non-commercial use"; written consent needed |
| Animated Knots | yes ("linking is welcome") | one image may illustrate the link | no |
| YouTube (AMGA, BMC, HowNOT2, Petzl) | yes | yes, official player only; not if the owner disabled embedding | no download / re-host |
| VDiff, Alpine Savvy, AAI, AAC, Ortovox, Ropelab, UIAA, Avalanche Canada | yes | — | no (all rights reserved / no licence) |
| Wikibooks "Rock Climbing" (CC BY-SA) | — | — | allowed, but ~25% written, no rescue chapters: useless |
| OpenBeta (CC0) | — | — | data only, no instruction |

Facts and procedures are not copyrightable, their expression is: our own short checklists in our own words are
fine; anything longer links out. Never imply a partnership with AMGA / Petzl / BMC.

## 4. Liability landscape (not legal advice — get a lawyer before launch)

- Every publisher uses a visible "seek qualified instruction" line. Models:
  - Petzl: "Mastering these techniques requires specific training. Work with a professional to confirm your
    ability… before attempting them unsupervised." https://www.petzl.com/GB/en/Operators/Knots
  - Alpine Savvy: "information and ideas (not advice)… In-person training from a qualified instructor is
    strongly recommended… may be inaccurate or out of date." https://www.alpinesavvy.com/disclaimer
  - AMGA video disclaimer: https://old.amga.com/video-disclaimer
- *Winter v. G.P. Putnam's Sons* (9th Cir. 1991): a how-to book is expression, not a product; no strict
  liability, no duty to verify. **But** the same opinion separates navigational *charts* (treated as products:
  *Saloomey v. Jeppesen*, *Brocklesby v. US*). An interactive field tool that tells a user what to do step by
  step is arguably nearer the chart side † — this is the part to put in front of a lawyer.
  https://law.justia.com/cases/federal/appellate-courts/F2/938/1033/294363
- No US case against a climbing instruction/guidebook publisher was found.
- User content (vouches, comments) generally has Section 230 cover; content the app writes does not †.

## 5. Skill → best sources (keyed to `SKILLS`)

Tier: F foundational, I intermediate, A advanced, G guide-level (flag it).

### Ropework fundamentals
| key | tier | link first | then | must-say on the card |
|---|---|---|---|---|
| `knots` | F | [Animated Knots climbing](https://www.animatedknots.com/climbing-knots) | [Petzl: joining rappel ropes](https://www.petzl.com/INT/en/Sport/Knot-for-joining-rappel-ropes); [Moyer EDK tests](http://user.xmission.com/~tmoyer/testing/EDK.html) | finish the knot without interruption; flat overhand with ≥30 cm tails for rappel joins, not a flat figure-8 |
| (partner check, retired) | F | [Petzl Partner Check](https://www.petzl.com/GB/en/Sport/PARTNER-CHECK) | [BMC](https://www.thebmc.co.uk/News.aspx?id=9188) | by eye **and** by hand, every climb, whatever their experience |
| `gear` | F | [VDiff cams](https://www.vdiffclimbing.com/cam/) / [nuts](https://www.vdiffclimbing.com/nuts/) | [BD QC Lab](https://www.blackdiamondequipment.com/en_US/qc-lab-big-cams.html); [BMC passive pro](https://services.thebmc.co.uk/a-guide-to-passive-protection) | cams cause the pulled-pro accidents; never tipped out |
| `anchors` | F | [AAI anchor acronyms](https://www.alpineinstitute.com/popular-anchor-acronyms/) | [VDiff quad](https://vdiffclimbing.com/quad-anchor); [Petzl bolted belay](https://petzl.com/us/en/sport/tech-tips/basic-techniques/building-a-belay-anchor-and-belaying-on-a-bolted-multi-pitch-route/Relais-grande-voie_SPO_a77Tx000000E3MEIA0.html) | quad: clip two of four strands; acronyms aid judgment, don't replace it |
| `belayabove` | F-I | [Petzl Reverso multipitch video](https://www.petzl.com/US/en/Sport/Video-–-Tip-for-Belaying-with-the-REVERSO-on-Multi-Pitch-Routes) | the device's own manual; [AAC lowering error report](https://publications.americanalpineclub.org/articles/13201213079) | clip to the master point; two seconds: a hanging one disables the other's autoblock |
| `transitions` | I | [VDiff multipitch](https://www.vdiffclimbing.com/multipitch/) | [Petzl communication](https://www.petzl.com/FI/en/Sport/News/2016-6-16/How-to-effectively-communicate-on-multi-pitch-climbs) | clip in before "off belay"; agree calls on the ground ("Safe" and "Take" sound alike) |
| `ropemgmt` | I | [AAI rope saddlebag](https://www.alpineinstitute.com/?p=99484) | — | sources thin † |
| `rappelling` | F | [AAC Know the Ropes: Rappelling](https://publications.americanalpineclub.org/articles/13201200200/Know-the-Ropes-Rappelling) | [Alpine Savvy BRAKES](https://www.alpinesavvy.com/blog/a-great-rappel-check-acronym-brakes) | BRAKES check; knots in both ends; extension + friction-hitch backup; weight-test before unclipping |
| `cleaning` | F | [AAC Know the Ropes: Lowering](https://publications.americanalpineclub.org/articles/13201212427/Know-the-Ropes-Lowering) | [AAI cleaning anchors](https://www.alpineinstitute.com/cleaning-anchors-on-a-single-pitch-climb/) | agree "lower or rappel" on the ground; stopper knot; never lower over a sling |
| `leadbelay` / `softcatch` | F | [Petzl lead-belay good practice](https://www.petzl.com/US/en/Sport/Good-practices-for-belaying-a-lead-climber) | [Petzl stopping a fall](https://www.petzl.com/US/en/Sport/Stopping-a-climbing-fall) | soft = a hop, not extra slack; no soft catch near a ledge |

### Multipitch self-rescue and retreat
| key | tier | link first | then | must-say |
|---|---|---|---|---|
| `belayescape` | I | [VDiff escaping the belay](https://www.vdiffclimbing.com/belay-escape/) | [Ensoll #1](https://www.chrisensoll.com/chris-ensolls-blog/2017/6/1/rope-skills-rescues-1-escaping-the-system) | first ask whether lowering or having them prusik is simpler; guide mode / Grigri = already "escaped", just tie off |
| `loadtransfer` | I | [Petzl MMO video](https://www.petzl.com/US/en/Sport/Video-–-Munter-Hitch-With-Mule-Knot-and-Stopper-Knot) | [Fox: the MMO](https://foxmountainguides.com/the-munter-mule-overhand-mmo/); [Animated Knots](https://www.animatedknots.com/muntermule) | hold the brake strand while releasing; building block of every rescue |
| (guide-plate release, part of `assistrescue`) | I | [AAI lowering from a loaded plate](https://www.alpineinstitute.com/lowering-from-a-loaded-belay-plate/) | [Petzl belay from above](https://www.petzl.com/US/en/Sport/News/2018-6-29/How-to-belay-from-above) | redirect the brake strand + friction-hitch backup **first**; the plate can release suddenly |
| `assistrescue` (lower past knot) | A | [Ensoll #2 pass a knot](https://www.chrisensoll.com/chris-ensolls-blog/2017/8/22/rope-skills-rescues-2-how-to-pass-a-knot) | [Bath scenarios](https://people.bath.ac.uk/dac33/high/13SelfRescueSenarios2.htm) | rare: lowering to half a rope then rappelling is usual |
| `haul` | A | [VDiff hauling your partner](https://www.vdiffclimbing.com/hauling-your-partner/) | [Alpine Savvy 3:1](https://www.alpinesavvy.com/blog/a-3-1-z-drag-step-by-step); [Petzl stuck second](https://www.petzl.com/US/en/Sport/Second-climber-stuck--hauling-on-a-loaded-rope) | try the assisted drop loop first; a real 3:1 is far below 3×; never haul an unconscious climber unattended |
| `ascending` | I | [VDiff prusiking up a rope](https://www.vdiffclimbing.com/prusik-rope/) | [Alpine Savvy Grigri + device](https://www.alpinesavvy.com/blog/rope-ascending-with-a-grigri-and-belay-device); [Petzl ascending on a rappel](https://www.petzl.com/INT/en/Sport/Self-rescue--ascending-a-rope-on-a-multi-pitch-rappel) | backup knots below you; on a doubled rope, ascend both strands |
| `counterbalance` | A | [Climbing.com self-rescue](https://www.climbing.com/skills/how-to-self-rescue-climbing/) (login wall) | [Joe Stock rescue notes PDF](https://joe-stock-4y5n.squarespace.com/s/Rock-Rescue-Course-Notes.pdf) | no good open step source †; course-taught |
| `tandemrap` | A | [VDiff tandem abseil](https://www.vdiffclimbing.com/tandem-abseil/) | [AAC rappelling](https://publications.americanalpineclub.org/articles/13201200200/Know-the-Ropes-Rappelling) | never pass the next station; extensions: VDiff belay loop vs AAC tie-in points |
| `stuckrope` | I | [Alpine Savvy: brains, then brawn](https://www.alpinesavvy.com/blog/stuck-rappel-ropes-use-brains-then-brawn) | [VDiff stuck ropes](https://vdiffclimbing.com/stuck-ropes) | never climb a single stuck strand unprotected; test-pull after the first person is down |
| `retreat` | I | [VDiff retreating mid-pitch](https://www.vdiffclimbing.com/leader-retreat/) | [Alpine Savvy replace crap webbing](https://www.alpinesavvy.com/blog/rappel-anchors-replace-crap-webbing); [Petzl single-rope rappels](https://www.petzl.com/US/en/Sport/Multi-pitch-rappelling-with-a-single-rope) | old tat is guilty until proven innocent (broke at 2-3.5 kN vs 18 kN new); leave gear, it's cheaper |

### Glacier, snow, ice, alpine movement
| key | tier | link first | then | must-say |
|---|---|---|---|---|
| `ropeteam` / `glacier` | I | [Alpine Savvy glacier rigging](https://www.alpinesavvy.com/blog/rigging-your-rope-for-glacier-travel) | [Ortovox rope teams](https://ortovox.com/uk/safety-academy-lab-ice/chapter-2/rope-teams); [Petzl roped pair](https://www.petzl.com/INT/en/Sport/Approaching-a-glacier-as-a-roped-team-of-two) | rope taut, no hand loops; spacing and brake-knot advice varies — show the range, not one number |
| `crevasse` | I-A | [AAI crevasse rescue intro](https://www.alpineinstitute.com/articles/skills/crevasse-rescue/crevasse-rescue-introduction) | [Alpine Savvy modern methods](https://www.alpinesavvy.com/blog/modern-crevasse-rescue-techniques); [Ortovox rescuing a companion](https://ortovox.com/uk/safety-academy-lab-ice/chapter-3/rescuing-a-companion) | order: arrest → anchor → transfer → back up → lip → haul; drop loop is now the first choice; never reopen the master carabiner |
| `twoperson` | A | [ACC two-person teams](https://blog.alpineclubofcanada.ca/blog/2021/11/29/mountain-safety-glacier-travel-and-crevasse-rescue-for-two-person-teams) | Petzl roped pair (above) | ACC: traditional two-person rescue has a "dangerously high probability of catastrophic failure"; carry extra rope; three+ is safer |
| (self-rescue from a crevasse, part of `ascending`) | I | [UIAA extricate yourself](https://www.theuiaa.org/how-to-extricate-yourself-from-a-crevasse/) | [Ortovox self-rescue](https://www.ortovox.com/uk/safety-academy-lab-ice/chapter-3/self-rescue) | only if uninjured; hitches jam at the lip |
| `selfarrest` | F | [Ortovox self-arrest](https://ortovox.com/uk/safety-academy-lab-ice/chapter-2/self-arrest-techniques) | [BMC winter skills videos](https://services.thebmc.co.uk/new-winter-skills-videos-refresh) | with crampons, feet up; no guarantee on hard snow or ice; practise on a slope with a clean runout |
| `crampons` | F | [Ortovox walking on firn and ice](https://ortovox.com/uk/safety-academy-lab-ice/chapter-2/walking-techniques-on-firn-and-ice) | [AAI French technique](https://www.alpineinstitute.com/french-technique-for-cramponing/) | feet apart (snagged gaiters); heels low front-pointing |
| `snowanchors` | I | [Alpine Savvy snow anchor](https://www.alpinesavvy.com/blog/a-strong-simple-and-fast-snow-anchor) | [BD QC Lab snow anchors](https://blackdiamondequipment.com/blogs/stories/qc-lab-the-art-and-science-of-using-snow-anchors-1); [UIAA 155](https://theuiaa.org/documents/safety-standards/155-UIAA-SNOWPICKETS_V4_2017.pdf) | strength varies hugely with the snow; read hardness first (vertical vs T-slot) |
| `iceanchors` | I | [Petzl ice basics video](https://www.petzl.com/INT/en/Sport/Video--The-basics-of-ice-climbing--ice-screw-placement--belays--v-threads) | [AAI ice anchors](https://www.alpineinstitute.com/ice-anchors-part-i-2/); [Needle Sports Abalakov](https://www.needlesports.com/Information/Need-Advice/The-Abalakov-Thread) | back up the first V-thread; last person removes the backup |
| `shortrope` | **G** | [AAC Safer 4th Class](https://publications.americanalpineclub.org/articles/13201215053/Know-the-Ropes-Safer-4th-Class) | — | AAC: "seldom appropriate for the recreational climber"; card should say so up front |
| `simul` | A | AAC Safer 4th Class (above) | [Petzl Micro Traxion warning](https://www.petzl.com/be/en/sport/tech-tips/basic-techniques/belaying-the-second-with-a-micro-traxion-or-nano-traxion--beware-of-any-fall/MICRO-TRAXION---sport-7---Assurage-du-second-avec-_SPO_a77w0000000KysSAAS.html) | only on terrain you would not fall on; a follower fall can pull the leader off |
| `beacon` | I | [Avalanche Canada Avy Savvy](https://avysavvy.avalanche.ca/en-ca/companion-rescue) | [Avalanche.org companion rescue](https://avalanche.org/avalanche-encyclopedia/human/companion-rescue/) | take a course (AIARE Rescue); probe before digging |

## 6. Field checklists the app could write itself (our words, short, offline)

1. **Rappel — BRAKES** (Climbing magazine via Alpine Savvy): Buckles · Rappel device & rope (locked, both
   strands) · Anchor · Knots (joining knot, long tails) · Ends (reach, knotted, even) · Safety backup & sharp
   edges. Plus AAC: weight-test before you unclip.
2. **Partner check**: harness (above hips, buckles) · knot (finished, through both points) · locker on belay
   loop, locked · device threaded right · stopper knot in the end · check by eye and hand.
3. **Lowering**: agreed "lower or rappel" before leaving the ground · stopper knot · rope long enough · rope
   not over a sling.
4. **Crevasse rescue order**: arrest · first anchor · transfer onto the anchor · back up · protected approach to
   the lip · talk to the victim · prepare the lip · haul (drop loop, else 3:1, else 6:1).

## 7. Where sources disagree (the cards should show the range, not pick silently)

- Joining rappel ropes: flat overhand alone (AAC, Petzl) vs stacked double (Moyer, OTE); Petzl: not for ropes
  of different diameters.
- Cam retraction: "middle of range" (VDiff) vs 25-75% (Snowdonia) vs 70-90% retracted (Climbing Tech Tips).
- Lowering from guide mode: three release methods (AAI) vs "don't plan to" (Alpine Savvy, many guides).
- Tie-offs: MMO (US) vs mule + stopper (Petzl) vs half hitches (UK).
- Friction hitch per job: classic prusik to capture, klemheist to ascend, autoblock for rappel backup (VDiff);
  UK uses French prusik for captures.
- Glacier spacing for two: ≥15 m (ACC) vs ~18 m (Ortovox) vs 8 arm-spans + knots (Alpine Savvy); brake
  knots: 3-5 (Ortovox, Alpine Savvy) vs "only in favourable snow, they hinder rescue" (ACC).
- Crevasse rescue: modern drop loop first, prusiks not pre-rigged vs classic Z-pulley first, pre-rigged.
- Picket angle: ~25° back for a mid-clip (ACMG) vs the folk "45°" (no source †).
- Last climber at a sport anchor: rappel to save the anchor (AAC 2013) vs lower to stay on belay (gyms †).

## 8. Gaps (no open source found)

Texas kick step list · counterbalance-rappel steps · rescue spider build · PMMO/MOFT knot pass · plaquette 5:1 ·
judging pitons · rope-management detail · Petzl tech-tip text (renders by script: a human should read the
linked Petzl pages before we cite them).

## 9. Fits for a partner app

- **"Last practised" per skill** (self-reported, opt-in reminder after 12 months).
- **Vouch = "we practised this together on <date>"**, recorded as a session, never as a competence rating.
- **Find a course, Washington first**: [AMGA hire a guide](https://amga.com/hire-a-guide),
  [AAI crevasse courses](https://www.alpineinstitute.com/programs/by-skill/crevasse-rescue-courses),
  [Alpine Ascents 1-day clinic](https://www.alpineascents.com/school/1-day-crevasse-clinic/),
  [RMI crevasse school](https://www.rmiguides.com/mt-rainier/crevasse-rescue-school),
  The Mountaineers courses and free refresher clinics (site blocks automated reads; link only).
- From a route's *Your skills* line, "Not on your profile yet: Crevasse rescue" can link to that skill card.

## 10. Do not

- App-issued "certified / verified / qualified / competent" badges.
- Let required-skills + vouches imply a partner is safe.
- Gamified quizzes that award a skill.
- In-house step-by-step rescue walkthroughs presented as authoritative.
- Copy, re-host or redraw Petzl / Animated Knots / AAC diagrams.
- Embed a video whose owner disabled embedding; imply AMGA / Petzl / BMC partnership.
- Nag: practice reminders are opt-in.

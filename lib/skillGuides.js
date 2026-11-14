/* Skill guides and field checklists (owner, 2026-11-14: "do what you recommend" after the technique research,
   research/technique-howto-2026-11-14.md). What a card is, and what it deliberately is NOT:
   - It says what a skill is, when you need it, and the mistakes the accident record shows, in OUR words, then
     links out to the people who teach it (Petzl, VDiff, Alpine Savvy, AAI, AAC, Ortovox, Avalanche Canada) and
     to courses, Washington first. Their text and diagrams are all-rights-reserved: link, never copy or redraw.
   - It is NOT a step-by-step rescue walkthrough. A 2019 study (Hawley et al., Wilderness Environ Med 30:44)
     found only 24% of experienced multipitch climbers passed three standard rescue scenarios, and confidence
     did not predict who passed; the app does not teach these systems and never calls anyone competent at them.
   - The only procedures written here are short FIELD CHECKLISTS for steps people already know, aimed at the
     leading accident causes (rappelling off the ends, missed stopper knots, unfinished tie-ins, lowering
     miscommunication). They ship in the bundle, so they work offline.
   A skill with no researched sources has no guide, and the app draws no guide link for it. */

/** Shown on every card and checklist. Modelled on Petzl's and Alpine Savvy's wording. */
export const GUIDE_DISCLAIMER = "Information, not instruction. These techniques take hands-on training from a qualified instructor. Practise near the ground with a backup before you rely on them.";

/** @type {Record<string, string>} */
export const TIER_LABEL = { F: "Foundational", I: "Intermediate", A: "Advanced", G: "Guide-level" };

/** @typedef {{label: string, url: string}} GuideLink */
/** @typedef {{tier: "F"|"I"|"A"|"G", what: string, when: string, watch: string[], links: GuideLink[], checklist?: string, courses: "rock"|"glacier"|"avalanche"}} SkillGuide */

/** @param {string} label @param {string} url @returns {GuideLink} */
const L = (label, url) => ({ label, url });

const AAC_RAP = L("AAC Know the Ropes: Rappelling", "https://publications.americanalpineclub.org/articles/13201200200/Know-the-Ropes-Rappelling");
const AAC_4TH = L("AAC Know the Ropes: Safer 4th Class", "https://publications.americanalpineclub.org/articles/13201215053/Know-the-Ropes-Safer-4th-Class");
const VDIFF_HAUL = L("VDiff: Hauling your partner", "https://www.vdiffclimbing.com/hauling-your-partner/");
const AAI_PLATE = L("Alpine Institute: Lowering from a loaded belay plate", "https://www.alpineinstitute.com/lowering-from-a-loaded-belay-plate/");
const PETZL_PAIR = L("Petzl: Approaching a glacier as a roped team of two", "https://www.petzl.com/INT/en/Sport/Approaching-a-glacier-as-a-roped-team-of-two");

const LEAD_BELAY = /** @type {SkillGuide} */ ({
  tier: "F",
  what: "Feeding rope to a leader and catching their falls, softly where it is safe to.",
  when: "Every lead climb.",
  watch: [
    "Brake hand on the rope, always.",
    "A soft catch is a small hop or step toward the wall, not extra slack; Petzl notes that more slack does not lower the force.",
    "No soft catch where the climber could hit a ledge or the ground.",
  ],
  links: [
    L("Petzl: Good practices for belaying a lead climber", "https://www.petzl.com/US/en/Sport/Good-practices-for-belaying-a-lead-climber"),
    L("Petzl: Stopping a climbing fall", "https://www.petzl.com/US/en/Sport/Stopping-a-climbing-fall"),
  ],
  checklist: "partner",
  courses: "rock",
});

const ROPE_TEAM = /** @type {SkillGuide} */ ({
  tier: "I",
  what: "Roping a team together on a glacier so a crevasse fall can be held and the climber hauled out.",
  when: "Any travel on a snow-covered glacier.",
  watch: [
    "Keep the rope taut between climbers, with no loops held in the hand: slack means a harder fall and a dragged partner.",
    "Spacing and brake-knot advice differs between guides (for two people, roughly 15 to 18 m). Whatever you use, leave enough spare rope for a rescue.",
    "Everyone carries cord for friction hitches and knows the rescue order.",
  ],
  links: [
    L("Alpine Savvy: Rigging your rope for glacier travel", "https://www.alpinesavvy.com/blog/rigging-your-rope-for-glacier-travel"),
    L("Ortovox Safety Academy: Rope teams", "https://ortovox.com/uk/safety-academy-lab-ice/chapter-2/rope-teams"),
    PETZL_PAIR,
  ],
  checklist: "crevasse",
  courses: "glacier",
});

/** Keyed by SKILLS key (ClimbMatchCore.jsx). @type {Record<string, SkillGuide>} */
export const SKILL_GUIDES = {
  knots: {
    tier: "F",
    what: "The tie-in knot, the hitches anchors and belays are built from (clove, Munter, girth), and the knot that joins two rappel ropes.",
    when: "Every climb.",
    watch: [
      "Tie-in failures in the accident reports are unfinished knots, not wrong ones: tie it in one go, then have your partner check it.",
      "Join rappel ropes with a flat overhand and long tails (30 cm or more). A flat figure-8 rolls at much lower loads.",
      "Petzl warns the plain flat overhand is not for two ropes of very different diameters.",
    ],
    links: [
      L("Animated Knots: Climbing knots", "https://www.animatedknots.com/climbing-knots"),
      L("Petzl: Knot for joining rappel ropes", "https://www.petzl.com/INT/en/Sport/Knot-for-joining-rappel-ropes"),
      L("Tom Moyer: rappel-knot pull tests", "http://user.xmission.com/~tmoyer/testing/EDK.html"),
    ],
    checklist: "partner",
    courses: "rock",
  },
  gear: {
    tier: "F",
    what: "Placing cams and nuts, and judging whether a placement will hold.",
    when: "Every trad lead, and every gear anchor.",
    watch: [
      "Pulled protection is the leading factor in trad accidents (about half), and in 2023 every reported pulled piece was a cam.",
      "A cam near fully open (tipped out) is weak; go a size bigger. Guides differ on the ideal range, but agree on lobes even, stem toward the load, never tipped out.",
      "Extend placements so the rope does not walk them out.",
    ],
    links: [
      L("VDiff: Cams", "https://www.vdiffclimbing.com/cam/"),
      L("VDiff: Nuts", "https://www.vdiffclimbing.com/nuts/"),
      L("BMC: A guide to passive protection", "https://services.thebmc.co.uk/a-guide-to-passive-protection"),
    ],
    courses: "rock",
  },
  anchors: {
    tier: "F",
    what: "Building belay and rappel anchors on bolts or gear.",
    when: "Every multi-pitch belay, top-rope setup and rappel.",
    watch: [
      "Anchor failure is the leading cause of rappel accidents.",
      "SERENE, ERNEST and the other acronyms are prompts for judgment, not a test a single piece can pass.",
      "On a quad, clip two of the four strands; clipping all four comes apart if one leg fails.",
    ],
    links: [
      L("Alpine Institute: Popular anchor acronyms", "https://www.alpineinstitute.com/popular-anchor-acronyms/"),
      L("VDiff: Quad anchor", "https://vdiffclimbing.com/quad-anchor"),
    ],
    courses: "rock",
  },
  belayabove: {
    tier: "I",
    what: "Belaying a second from the anchor: in guide mode with a plate, redirected off your harness, or on a Munter.",
    when: "Every multi-pitch climb.",
    watch: [
      "Clip the device to the master point and set it up exactly as its manual shows.",
      "With two seconds, one hanging on the rope can switch off the plate's lock on the other rope.",
      "Lowering from guide mode is a rescue move: redirect the brake strand and add a friction-hitch backup before you release the plate.",
    ],
    links: [
      L("Petzl: Belaying with the Reverso on multi-pitch routes", "https://www.petzl.com/US/en/Sport/Video-–-Tip-for-Belaying-with-the-REVERSO-on-Multi-Pitch-Routes"),
      AAI_PLATE,
    ],
    courses: "rock",
  },
  transitions: {
    tier: "I",
    what: "The changeover at each belay: clipping in, swapping leads, restacking the rope and handing over the rack.",
    when: "Every multi-pitch climb.",
    watch: [
      "Clip in to the anchor before you call off belay.",
      "Agree your calls on the ground. \"Safe\" and \"Take\" sound alike at a distance.",
      "Keep the system closed at every step.",
    ],
    links: [
      L("VDiff: Multi-pitch", "https://www.vdiffclimbing.com/multipitch/"),
      L("Petzl: Communicating on multi-pitch climbs", "https://www.petzl.com/FI/en/Sport/News/2016-6-16/How-to-effectively-communicate-on-multi-pitch-climbs"),
    ],
    courses: "rock",
  },
  ropemgmt: {
    tier: "I",
    what: "Stacking the rope on ledges, lap-coiling it at hanging belays, and carrying it on rappels so it does not snag.",
    when: "Multi-pitch climbs and long rappels.",
    watch: [
      "Lap coils that shorten as they go feed out cleanly from the top.",
      "On windy or ledgy rappels, carry the rope in slings at your sides instead of throwing it.",
    ],
    links: [L("Alpine Institute: Carrying the rope on rappel", "https://www.alpineinstitute.com/?p=99484")],
    courses: "rock",
  },
  rappelling: {
    tier: "F",
    what: "Descending on the rope, from a fixed anchor or one you build.",
    when: "Most multi-pitch and alpine descents.",
    watch: [
      "Descents are about a third of reported accidents, and about 30% of rappel-error accidents were fatal.",
      "The leading causes: the anchor failed, there was no backup, or the climber rappelled off the end of uneven ropes.",
      "Extend the device, back it up with a friction hitch, knot both ends, and weight it before you unclip.",
    ],
    links: [AAC_RAP, L("Alpine Savvy: The BRAKES rappel check", "https://www.alpinesavvy.com/blog/a-great-rappel-check-acronym-brakes")],
    checklist: "rappel",
    courses: "rock",
  },
  cleaning: {
    tier: "F",
    what: "Taking your gear off a fixed anchor at the top of a pitch, then lowering or rappelling.",
    when: "The end of most single-pitch climbs.",
    watch: [
      "Agree \"lower\" or \"rappel\" on the ground, and confirm it again before anyone goes off belay.",
      "In more than half of lowering accidents the rope end ran through the belay device. Knot the end.",
      "Never lower with the rope running over a sling.",
    ],
    links: [
      L("AAC Know the Ropes: Lowering", "https://publications.americanalpineclub.org/articles/13201212427/Know-the-Ropes-Lowering"),
      L("Alpine Institute: Cleaning single-pitch anchors", "https://www.alpineinstitute.com/cleaning-anchors-on-a-single-pitch-climb/"),
    ],
    checklist: "lowering",
    courses: "rock",
  },
  leadbelay: LEAD_BELAY,
  softcatch: LEAD_BELAY,
  belayescape: {
    tier: "I",
    what: "Moving a loaded climber's weight from your belay onto the anchor, so your hands are free.",
    when: "Your partner is hurt or stuck and you need to go for help or start a rescue.",
    watch: [
      "First ask whether you can simply lower them to a ledge, or whether they can climb the rope.",
      "On a guide-mode plate or an assisted-braking device you are already out of the system: tie it off.",
      "Keep a brake hand on until the rope is tied off, and make sure the anchor can take the new direction of pull.",
    ],
    links: [
      L("VDiff: Escaping the belay", "https://www.vdiffclimbing.com/belay-escape/"),
      L("Chris Ensoll (IFMGA): Escaping the system", "https://www.chrisensoll.com/chris-ensolls-blog/2017/6/1/rope-skills-rescues-1-escaping-the-system"),
    ],
    courses: "rock",
  },
  loadtransfer: {
    tier: "I",
    what: "Locking a loaded Munter hitch hands-free with a mule and an overhand (the MMO), so it can still be released under load.",
    when: "Inside almost every rope rescue: escaping, lowering, hauling.",
    watch: [
      "Hold the brake strand while you release it.",
      "Tie the mule with the Munter set for lowering.",
      "UK climbers use other tie-offs. Learn one and practise it until it is automatic.",
    ],
    links: [
      L("Petzl: Munter hitch with mule knot", "https://www.petzl.com/US/en/Sport/Video-–-Munter-Hitch-With-Mule-Knot-and-Stopper-Knot"),
      L("Fox Mountain Guides: The MMO", "https://foxmountainguides.com/the-munter-mule-overhand-mmo/"),
      L("Animated Knots: Munter mule", "https://www.animatedknots.com/muntermule"),
    ],
    courses: "rock",
  },
  assistrescue: {
    tier: "A",
    what: "Raising a partner who can help you, and lowering a partner past the knot joining two ropes.",
    when: "A second who is stuck below a crux, or a lower longer than one rope.",
    watch: [
      "An assisted raise (drop loop) only works if they are close, under about a third of the rope away, and the rope hangs clean.",
      "Lowering past a knot is rare; lowering half a rope and then rappelling is the usual answer.",
      "Tie a backup knot before every load transfer.",
    ],
    links: [VDIFF_HAUL, L("Chris Ensoll (IFMGA): How to pass a knot", "https://www.chrisensoll.com/chris-ensolls-blog/2017/8/22/rope-skills-rescues-2-how-to-pass-a-knot"), AAI_PLATE],
    courses: "rock",
  },
  haul: {
    tier: "A",
    what: "Building a 3:1 (or larger) pulley system to raise a climber who cannot help.",
    when: "A second stuck or hurt below you, or a climber in a crevasse.",
    watch: [
      "Try an assisted raise first.",
      "Friction eats much of the advantage: a real 3:1 gives well under three times. Pull harder before adding more pulleys.",
      "Stop if anything snags, because the force on the anchor spikes. Never haul an unconscious climber you cannot see.",
    ],
    links: [
      VDIFF_HAUL,
      L("Alpine Savvy: A 3:1 Z-drag, step by step", "https://www.alpinesavvy.com/blog/a-3-1-z-drag-step-by-step"),
      L("Petzl: Second climber stuck, hauling on a loaded rope", "https://www.petzl.com/US/en/Sport/Second-climber-stuck--hauling-on-a-loaded-rope"),
    ],
    courses: "rock",
  },
  ascending: {
    tier: "I",
    what: "Climbing up a fixed rope with friction hitches or devices.",
    when: "After rappelling too far, freeing a stuck rope, or getting out of a crevasse.",
    watch: [
      "Stay attached at two points, and tie backup knots below you as you go.",
      "On a doubled rope, ascend both strands.",
      "Stand up with your legs instead of pulling with your arms. Out of a crevasse only if you are uninjured; hitches jam where the rope cuts into the lip.",
    ],
    links: [
      L("VDiff: Prusiking up a rope", "https://www.vdiffclimbing.com/prusik-rope/"),
      L("Petzl: Ascending a rope on a multi-pitch rappel", "https://www.petzl.com/INT/en/Sport/Self-rescue--ascending-a-rope-on-a-multi-pitch-rappel"),
      L("UIAA: How to extricate yourself from a crevasse", "https://www.theuiaa.org/how-to-extricate-yourself-from-a-crevasse/"),
    ],
    courses: "rock",
  },
  counterbalance: {
    tier: "A",
    what: "Rappelling one strand to an injured partner while their weight on the other strand holds you.",
    when: "Reaching a hurt second quickly, usually followed by a tandem rappel.",
    watch: [
      "Weight-test before you unclip from the anchor.",
      "The order of steps is harder than it looks. Learn it on a course, not from an article; no good open walkthrough exists.",
    ],
    links: [L("Joe Stock: Rock rescue course notes (PDF)", "https://joe-stock-4y5n.squarespace.com/s/Rock-Rescue-Course-Notes.pdf")],
    courses: "rock",
  },
  tandemrap: {
    tier: "A",
    what: "Two people descending on one rappel device: a rescuer with a hurt partner.",
    when: "Getting an injured climber down.",
    watch: [
      "Never rappel past the next station. Getting back up with a passenger may be impossible.",
      "Add friction for two people's weight and back it up with a friction hitch.",
      "Instructors differ on where the extensions attach (belay loop or tie-in points).",
    ],
    links: [L("VDiff: Tandem abseiling", "https://www.vdiffclimbing.com/tandem-abseil/"), AAC_RAP],
    courses: "rock",
  },
  stuckrope: {
    tier: "I",
    what: "Getting a stuck rappel rope down, or getting back up to it safely.",
    when: "The pull rope will not come.",
    watch: [
      "Brains before brawn: check you are pulling the right strand, change the angle, flick it. Yanking first can jam it worse.",
      "Never climb a single stuck strand without protection.",
      "Prevention: test the pull after the first person is down.",
    ],
    links: [
      L("Alpine Savvy: Stuck rappel ropes", "https://www.alpinesavvy.com/blog/stuck-rappel-ropes-use-brains-then-brawn"),
      L("VDiff: Stuck ropes", "https://vdiffclimbing.com/stuck-ropes"),
    ],
    courses: "rock",
  },
  retreat: {
    tier: "I",
    what: "Bailing off a route mid-way: lowering or rappelling off gear you leave, or off fixed anchors you have to judge.",
    when: "Weather, difficulty, injury, or running out of daylight.",
    watch: [
      "Treat old webbing as guilty until proven innocent; aged tat has broken at a fraction of new strength.",
      "Never rappel from a single found cord, and add a quick link so the rope does not run over sling.",
      "Leave gear. It is cheaper than an injury.",
    ],
    links: [
      L("VDiff: Retreating mid-pitch", "https://www.vdiffclimbing.com/leader-retreat/"),
      L("Alpine Savvy: Replace bad rappel webbing", "https://www.alpinesavvy.com/blog/rappel-anchors-replace-crap-webbing"),
      L("Petzl: Multi-pitch rappelling with a single rope", "https://www.petzl.com/US/en/Sport/Multi-pitch-rappelling-with-a-single-rope"),
    ],
    checklist: "rappel",
    courses: "rock",
  },
  ropeteam: ROPE_TEAM,
  glacier: ROPE_TEAM,
  crevasse: {
    tier: "I",
    what: "Holding a partner's crevasse fall, anchoring it, and getting them out.",
    when: "Any roped glacier travel.",
    watch: [
      "Never reopen the master carabiner once it holds the load.",
      "A drop loop (lowering a bight for the victim to clip) is now the first choice if they can clip it.",
      "Protect the lip and haul slowly near it. If hauling suddenly gets harder, stop and check the victim.",
    ],
    links: [
      L("Alpine Institute: Crevasse rescue introduction", "https://www.alpineinstitute.com/articles/skills/crevasse-rescue/crevasse-rescue-introduction"),
      L("Alpine Savvy: Modern crevasse rescue", "https://www.alpinesavvy.com/blog/modern-crevasse-rescue-techniques"),
      L("Ortovox Safety Academy: Rescuing a companion", "https://ortovox.com/uk/safety-academy-lab-ice/chapter-3/rescuing-a-companion"),
    ],
    checklist: "crevasse",
    courses: "glacier",
  },
  twoperson: {
    tier: "A",
    what: "Crevasse rescue when there are only two of you: one person holds the fall, builds the anchor and hauls alone.",
    when: "Any two-person glacier trip.",
    watch: [
      "The Alpine Club of Canada says the traditional two-person system has a \"dangerously high probability of catastrophic failure\". Three or more on a rope is safer.",
      "Carry extra rope. A knotted 60 m rope may not reach for a drop loop.",
      "Practise the whole sequence alone, start to finish.",
    ],
    links: [
      L("Alpine Club of Canada: Two-person glacier teams", "https://blog.alpineclubofcanada.ca/blog/2021/11/29/mountain-safety-glacier-travel-and-crevasse-rescue-for-two-person-teams"),
      PETZL_PAIR,
    ],
    checklist: "crevasse",
    courses: "glacier",
  },
  selfarrest: {
    tier: "F",
    what: "Stopping a slide on snow with the pick of your ice axe.",
    when: "Steep snow, snowfields and glaciers.",
    watch: [
      "Wearing crampons, keep your feet up or you can flip.",
      "On steep or hard snow a slide gets fast quickly, and an arrest is not guaranteed.",
      "Practise every position, feet-first and head-first, on a slope with a safe runout.",
    ],
    links: [
      L("Ortovox Safety Academy: Self-arrest techniques", "https://ortovox.com/uk/safety-academy-lab-ice/chapter-2/self-arrest-techniques"),
      L("BMC: Winter skills videos", "https://services.thebmc.co.uk/new-winter-skills-videos-refresh"),
    ],
    courses: "glacier",
  },
  crampons: {
    tier: "F",
    what: "Walking and climbing on firm snow and ice in crampons: flat-footed on gentler slopes, front-pointing on steep ones.",
    when: "Firm snow, ice and glaciers.",
    watch: [
      "Keep your feet apart; a crampon snagging a gaiter trips you.",
      "Keep your heels low when front-pointing.",
      "Check the fit and the bindings before the slope, not on it.",
    ],
    links: [
      L("Ortovox Safety Academy: Walking on firn and ice", "https://ortovox.com/uk/safety-academy-lab-ice/chapter-2/walking-techniques-on-firn-and-ice"),
      L("Alpine Institute: French technique", "https://www.alpineinstitute.com/french-technique-for-cramponing/"),
    ],
    courses: "glacier",
  },
  snowanchors: {
    tier: "I",
    what: "Anchors in snow: pickets driven or buried, buried deadmen, and bollards cut in the snow.",
    when: "Belays, rappels and crevasse rescue on snow.",
    watch: [
      "Strength varies hugely with the snow. Read its hardness first: a driven picket in hard snow, a buried one in soft.",
      "Do not trust a single test.",
      "Back up a bollard for everyone but the last person down.",
    ],
    links: [
      L("Alpine Savvy: A strong, simple and fast snow anchor", "https://www.alpinesavvy.com/blog/a-strong-simple-and-fast-snow-anchor"),
      L("Black Diamond QC Lab: Snow anchors", "https://blackdiamondequipment.com/blogs/stories/qc-lab-the-art-and-science-of-using-snow-anchors-1"),
    ],
    courses: "glacier",
  },
  iceanchors: {
    tier: "I",
    what: "Ice-screw protection and anchors, and V-threads (Abalakovs) for rappelling.",
    when: "Ice climbs and icy alpine descents.",
    watch: [
      "Solid ice only: not hollow, fractured or aerated.",
      "Back up a V-thread with a screw until the last person goes.",
      "If the first V-thread is poor, start again in clean ice.",
    ],
    links: [
      L("Petzl: The basics of ice climbing (video)", "https://www.petzl.com/INT/en/Sport/Video--The-basics-of-ice-climbing--ice-screw-placement--belays--v-threads"),
      L("Alpine Institute: Ice anchors", "https://www.alpineinstitute.com/ice-anchors-part-i-2/"),
      L("Needle Sports: The Abalakov thread", "https://www.needlesports.com/Information/Need-Advice/The-Abalakov-Thread"),
    ],
    checklist: "rappel",
    courses: "glacier",
  },
  shortrope: {
    tier: "G",
    what: "Moving on a short rope so a slip is stopped before it becomes a fall, on terrain too easy to pitch.",
    when: "Mostly guided parties on easy, ledgy ground.",
    watch: [
      "The AAC calls it seldom appropriate for recreational climbers.",
      "If a slip would load the rope with full body weight at once, it will not hold. Pitch it instead.",
      "Learn it from a guide.",
    ],
    links: [AAC_4TH],
    courses: "rock",
  },
  simul: {
    tier: "A",
    what: "Leader and follower climbing at the same time, with protection between them.",
    when: "Long, easy alpine terrain where speed matters.",
    watch: [
      "Only on terrain neither of you expects to fall on.",
      "A follower's fall can pull the leader off. A progress-capture device helps, but Petzl warns the Micro and Nano Traxion are not belay devices.",
      "Keep protection between you at all times.",
    ],
    links: [
      AAC_4TH,
      L("Petzl: Belaying with a Micro Traxion, beware of any fall", "https://www.petzl.com/be/en/sport/tech-tips/basic-techniques/belaying-the-second-with-a-micro-traxion-or-nano-traxion--beware-of-any-fall/MICRO-TRAXION---sport-7---Assurage-du-second-avec-_SPO_a77w0000000KysSAAS.html"),
    ],
    courses: "rock",
  },
  beacon: {
    tier: "I",
    what: "Finding and digging out a buried partner with transceiver, probe and shovel.",
    when: "Any travel in or below avalanche terrain.",
    watch: [
      "Speed decides it: aim to have them uncovered within about 15 minutes.",
      "Probe before you dig, and dig in from downhill.",
      "Take a rescue course and practise every season.",
    ],
    links: [
      L("Avalanche Canada: Avy Savvy companion rescue", "https://avysavvy.avalanche.ca/en-ca/companion-rescue"),
      L("Avalanche.org: Companion rescue", "https://avalanche.org/avalanche-encyclopedia/human/companion-rescue/"),
    ],
    courses: "avalanche",
  },
};

/** @typedef {{title: string, items: [string, string][], after?: string, more: GuideLink}} Checklist */

/** Field checklists, in our words. Each item is [what, detail]. @type {Record<string, Checklist>} */
export const CHECKLISTS = {
  rappel: {
    title: "Rappel check (BRAKES)",
    items: [
      ["Buckles", "Harness buckles fastened, leg loops snug."],
      ["Rappel device", "Both strands through the device, carabiner locked."],
      ["Anchor", "Every piece and sling looked at; the rope runs on metal, not on sling."],
      ["Knots", "The knot joining the ropes is dressed, with long tails."],
      ["Ends", "Both ends knotted, even, and reaching the next station."],
      ["Safety", "Friction-hitch backup on, device extended, no sharp edges."],
    ],
    after: "Weight the system before you unclip from the anchor.",
    more: L("Alpine Savvy: The BRAKES rappel check", "https://www.alpinesavvy.com/blog/a-great-rappel-check-acronym-brakes"),
  },
  partner: {
    title: "Partner check",
    items: [
      ["Harness", "Above the hips, snug, buckles fastened."],
      ["Knot", "Finished, dressed, through both tie-in points."],
      ["Carabiner", "On the belay loop and locked."],
      ["Device", "Threaded the right way. Tug-test an assisted-braking device."],
      ["Rope end", "Stopper knot in the other end."],
      ["Both of you", "Check each other by eye and by hand, however experienced."],
    ],
    more: L("Petzl: Partner check", "https://www.petzl.com/GB/en/Sport/PARTNER-CHECK"),
  },
  lowering: {
    title: "Before lowering",
    items: [
      ["Plan", "\"Lower\" or \"rappel\" agreed on the ground, and confirmed before anyone goes off belay."],
      ["Rope end", "Stopper knot in the belayer's end."],
      ["Length", "The rope is long enough to reach the ground at half its length."],
      ["Anchor", "The rope runs through metal, not a sling."],
    ],
    more: L("AAC Know the Ropes: Lowering", "https://publications.americanalpineclub.org/articles/13201212427/Know-the-Ropes-Lowering"),
  },
  crevasse: {
    title: "Crevasse rescue order",
    items: [
      ["Arrest", "Hold the fall: self-arrest, dig in."],
      ["Anchor", "Build the first anchor while holding the load."],
      ["Transfer", "Move the load onto the anchor. The master carabiner stays locked."],
      ["Back up", "Add a second piece and a backup knot."],
      ["Approach", "Go to the lip on a protected line, probing."],
      ["Talk", "Is the climber conscious and hurt? Can they clip a drop loop?"],
      ["Lip", "Pad and clear the lip."],
      ["Haul", "Drop loop first; a 3:1 if they cannot help; add more only if needed."],
    ],
    more: L("Alpine Institute: Crevasse rescue introduction", "https://www.alpineinstitute.com/articles/skills/crevasse-rescue/crevasse-rescue-introduction"),
  },
};

/** Where to learn it in person, Washington first. @type {Record<string, GuideLink[]>} */
export const COURSES = {
  rock: [
    L("AMGA: Hire a certified guide", "https://amga.com/hire-a-guide"),
    L("Alpine Institute: Technical rope rescue", "https://www.alpineinstitute.com/programs/technical-rope-rescue-comprehensive/"),
    L("The Mountaineers: Courses and clinics", "https://www.mountaineers.org/"),
  ],
  glacier: [
    L("Alpine Institute: Crevasse rescue courses", "https://www.alpineinstitute.com/programs/by-skill/crevasse-rescue-courses"),
    L("RMI: Crevasse rescue school", "https://www.rmiguides.com/mt-rainier/crevasse-rescue-school"),
    L("Alpine Ascents: 1-day crevasse clinic", "https://www.alpineascents.com/school/1-day-crevasse-clinic/"),
    L("The Mountaineers: Courses and clinics", "https://www.mountaineers.org/"),
  ],
  avalanche: [
    L("AIARE: Find an avalanche course", "https://avtraining.org/"),
    L("AMGA: Hire a certified guide", "https://amga.com/hire-a-guide"),
  ],
};

/** @param {unknown} key @returns {SkillGuide | null} */
export function skillGuide(key) {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(SKILL_GUIDES, key) ? SKILL_GUIDES[key] : null;
}

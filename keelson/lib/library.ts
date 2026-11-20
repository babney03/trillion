// Starting content for a small-vessel SMS. Every item is a draft the operator
// edits to match their own boat and work. Nothing here replaces the operator's
// own judgement, the Canada Shipping Act, 2001, or Transport Canada guidance.

export type ActivityKey =
  | "crew"
  | "passengers"
  | "towing"
  | "aquaculture"
  | "diving"
  | "cargo"
  | "survey"
  | "fishingGuests"
  | "night"
  | "remote"
  | "cold";

export const activities: { key: ActivityKey; label: string; hint: string }[] = [
  { key: "crew", label: "Crew transfers", hint: "Moving people to docks, sites or other vessels" },
  { key: "passengers", label: "Paying passengers", hint: "Water taxi, tours, charters" },
  { key: "fishingGuests", label: "Sport-fishing guests", hint: "Hooks, gaffs, guests moving on deck" },
  { key: "towing", label: "Towing or pushing", hint: "Barges, booms, disabled vessels" },
  { key: "aquaculture", label: "Aquaculture work", hint: "Net pens, longlines, cranes, hauling" },
  { key: "diving", label: "Dive support", hint: "Divers in the water from this vessel" },
  { key: "cargo", label: "Cargo or landing craft", hint: "Loading over a ramp or by crane" },
  { key: "survey", label: "Survey or research", hint: "Deploying gear over the side" },
  { key: "night", label: "Night operations", hint: "Running after dark" },
  { key: "remote", label: "Remote areas", hint: "Out of cell coverage, far from help" },
  { key: "cold", label: "Winter operations", hint: "Cold water, icing, short daylight" },
];

export interface HazardTemplate {
  key: string;
  title: string;
  description: string;
  likelihood: number; // 1–5
  severity: number; // 1–5
  controls: string[];
  when?: ActivityKey[]; // shown when any of these activities apply; empty = always
}

export const hazardLibrary: HazardTemplate[] = [
  {
    key: "mob",
    title: "Person overboard",
    description: "Crew or passenger falls into the water while working on deck, boarding or in rough weather.",
    likelihood: 3,
    severity: 5,
    controls: [
      "Lifejackets or PFDs worn on open deck",
      "Recovery means on board and practised (ladder, sling or parbuckle)",
      "Person-overboard drill run at least every season and with each new crew member",
      "No working alone on deck while under way",
    ],
  },
  {
    key: "cold-water",
    title: "Cold water immersion",
    description: "Cold shock and incapacitation within minutes in BC and Atlantic waters, year round.",
    likelihood: 2,
    severity: 5,
    controls: [
      "Immersion or float suits available for every person when conditions call for them",
      "Recovery plan assumes the person cannot help themselves",
      "Thermal protective aids in the first-aid kit",
    ],
  },
  {
    key: "fire",
    title: "Fire on board",
    description: "Engine room, electrical, galley or fuel fire.",
    likelihood: 2,
    severity: 5,
    controls: [
      "Extinguishers of the required type and number, inspected monthly and serviced yearly",
      "Fuel and battery systems maintained and free of leaks",
      "Fire drill run at least every season",
      "No smoking near fuel",
    ],
  },
  {
    key: "flooding",
    title: "Flooding or hull breach",
    description: "Water ingress from a fitting, hose, collision or grounding.",
    likelihood: 2,
    severity: 5,
    controls: [
      "Bilge pumps and high-water alarm tested before departure",
      "Through-hull fittings and hoses inspected on a schedule",
      "Damage control kit (plugs, patch) on board",
    ],
  },
  {
    key: "collision",
    title: "Collision or allision",
    description: "Contact with another vessel, a dock, a pen or a floating object.",
    likelihood: 2,
    severity: 4,
    controls: [
      "Proper lookout kept at all times",
      "Navigation lights and sound signals working",
      "Safe speed for traffic, visibility and debris",
      "Radar and AIS used where fitted",
    ],
  },
  {
    key: "grounding",
    title: "Grounding",
    description: "Striking bottom or a rock through navigation error or loss of power.",
    likelihood: 2,
    severity: 4,
    controls: [
      "Current charts and tide tables for the operating area",
      "Voyage planned before departure in unfamiliar water",
      "Depth sounder working",
    ],
  },
  {
    key: "weather",
    title: "Heavy weather",
    description: "Wind, sea state or reduced visibility beyond the vessel's limits.",
    likelihood: 3,
    severity: 4,
    controls: [
      "Marine forecast checked before each trip",
      "Written weather limits for this vessel and the master's authority to cancel",
      "Loose gear secured before departure",
    ],
  },
  {
    key: "machinery",
    title: "Loss of propulsion or steering",
    description: "Engine, fuel or steering failure leaving the vessel adrift.",
    likelihood: 3,
    severity: 3,
    controls: [
      "Planned maintenance followed and logged",
      "Clean fuel, filters changed on schedule, spare filters carried",
      "Anchor ready to deploy",
    ],
  },
  {
    key: "fuelling",
    title: "Fuelling and fuel spills",
    description: "Fire and pollution risk while taking fuel.",
    likelihood: 2,
    severity: 3,
    controls: [
      "Engines off, passengers ashore, no ignition sources while fuelling",
      "Spill kit on board",
      "Tank vents watched to prevent overfill",
    ],
  },
  {
    key: "slips",
    title: "Slips, trips and falls",
    description: "Wet decks, gear on deck, boarding and leaving the vessel.",
    likelihood: 4,
    severity: 2,
    controls: ["Non-slip deck surfaces kept clean", "Handholds at boarding points", "Deck kept clear of loose gear"],
  },
  {
    key: "fatigue",
    title: "Fatigue",
    description: "Long days, early starts and night work reducing alertness.",
    likelihood: 3,
    severity: 3,
    controls: ["Hours of rest planned and recorded", "Master may stand down a crew member who is unfit"],
  },
  {
    key: "co",
    title: "Carbon monoxide",
    description: "Exhaust gases entering the wheelhouse or cabin.",
    likelihood: 1,
    severity: 5,
    controls: ["CO alarm in enclosed spaces, tested monthly", "Exhaust system inspected"],
  },
  {
    key: "transfer",
    title: "Vessel-to-structure transfers",
    description: "People stepping between the vessel and a dock, pen or another vessel.",
    likelihood: 3,
    severity: 4,
    controls: [
      "Transfers only when the master says the vessel is secure",
      "One person at a time, hands free, lifejacket on",
      "Transfer stopped when sea state makes it unsafe",
    ],
    when: ["crew", "aquaculture"],
  },
  {
    key: "passenger-safety",
    title: "Passenger emergencies",
    description: "Passengers who do not know where safety equipment is or what to do.",
    likelihood: 3,
    severity: 4,
    controls: [
      "Safety briefing before departure on every trip",
      "Headcount before departure and on return",
      "Lifejackets for every passenger, including children's sizes",
    ],
    when: ["passengers", "fishingGuests"],
  },
  {
    key: "hooks",
    title: "Hooks, gaffs and fish handling",
    description: "Cuts and puncture injuries to guests and crew.",
    likelihood: 3,
    severity: 2,
    controls: ["Guests briefed on casting and landing fish", "First-aid kit stocked for puncture wounds"],
    when: ["fishingGuests"],
  },
  {
    key: "towline",
    title: "Towline failure and girting",
    description: "A parting line, snap-back, or the tow pulling the vessel over beam-on.",
    likelihood: 2,
    severity: 5,
    controls: [
      "Crew clear of the snap-back zone",
      "Quick release on the towing point, tested",
      "Tow plan made before connecting, including the towed vessel",
    ],
    when: ["towing"],
  },
  {
    key: "lifting",
    title: "Cranes, winches and heavy lifting",
    description: "Crush, entanglement and load drop during hauling and lifting.",
    likelihood: 3,
    severity: 4,
    controls: [
      "Lifting gear inspected and within its safe working load",
      "No one under a suspended load",
      "Emergency stop known to all crew",
    ],
    when: ["aquaculture", "cargo", "survey"],
  },
  {
    key: "stability",
    title: "Loading and stability",
    description: "Overloading or a shifting load reducing stability.",
    likelihood: 2,
    severity: 5,
    controls: [
      "Maximum load and passenger limits posted",
      "Cargo secured before departure",
      "Free surface and weight on deck watched while hauling",
    ],
    when: ["cargo", "aquaculture", "passengers"],
  },
  {
    key: "divers",
    title: "Divers in the water",
    description: "Propeller strike, lost diver or diver emergency at the surface.",
    likelihood: 2,
    severity: 5,
    controls: [
      "Diver-down flag (Code flag A) shown",
      "Propeller stopped near divers",
      "Diver recovery method practised",
    ],
    when: ["diving"],
  },
  {
    key: "night",
    title: "Reduced visibility at night",
    description: "Debris, unlit objects and other traffic harder to see.",
    likelihood: 3,
    severity: 4,
    controls: ["Reduced speed after dark", "Searchlight and deck lighting working", "Two people on watch where possible"],
    when: ["night"],
  },
  {
    key: "remote",
    title: "Far from help",
    description: "Delayed rescue and no cell coverage.",
    likelihood: 2,
    severity: 4,
    controls: [
      "Trip plan left ashore with expected return time",
      "VHF DSC radio registered with an MMSI; satellite messenger or EPIRB where needed",
      "Extra first-aid capacity on board",
    ],
    when: ["remote"],
  },
  {
    key: "icing",
    title: "Icing and winter conditions",
    description: "Ice build-up, frozen gear and short daylight.",
    likelihood: 2,
    severity: 4,
    controls: ["Ice removed from deck and superstructure", "Winter gear and spare heat on board"],
    when: ["cold"],
  },
];

export interface ProcedureTemplate {
  key: string;
  title: string;
  steps: string[];
  when?: ActivityKey[];
}

export const emergencyProcedures: ProcedureTemplate[] = [
  {
    key: "mob",
    title: "Person overboard",
    steps: [
      "Shout “Person overboard, port/starboard side” and keep pointing at the person.",
      "Throw a lifebuoy or throwable device to them.",
      "Mark the position on the GPS (MOB button) and note the time.",
      "Turn the vessel to return; approach from downwind and stop the propeller near the person.",
      "Recover using the vessel's recovery method. Treat for cold water and shock.",
      "If the person is not in sight or cannot be recovered: Mayday on VHF channel 16 or DSC distress.",
    ],
  },
  {
    key: "fire",
    title: "Fire",
    steps: [
      "Raise the alarm and tell everyone on board.",
      "Stop engines and shut off fuel to a fire in the engine space.",
      "Fight the fire with the nearest suitable extinguisher only if it is safe to do so.",
      "Close hatches and vents to starve an enclosed fire.",
      "Prepare to abandon; lifejackets on.",
      "If the fire is not out quickly: Mayday on VHF channel 16 or DSC distress.",
    ],
  },
  {
    key: "flooding",
    title: "Flooding",
    steps: [
      "Raise the alarm. Start all bilge pumps.",
      "Find the source. Plug, patch or close the valve if you can.",
      "Head for shallow water or the nearest safe haven if the vessel is still under control.",
      "Lifejackets on. Prepare to abandon.",
      "Pan-pan if the situation is under control, Mayday if it is not.",
    ],
  },
  {
    key: "abandon",
    title: "Abandon vessel",
    steps: [
      "Master gives the order. Mayday sent with position and number of people.",
      "Lifejackets and immersion suits on.",
      "Take the grab bag, EPIRB or satellite messenger, and handheld VHF.",
      "Launch the liferaft or rescue device if carried. Stay together.",
      "Account for every person.",
    ],
  },
  {
    key: "collision",
    title: "Collision or grounding",
    steps: [
      "Stop the vessel. Check everyone on board for injuries.",
      "Check for water ingress and damage. Do not back off a grounding until you know the hull is intact.",
      "Show the correct signals and lights.",
      "Report by VHF. Pan-pan or Mayday as the situation needs.",
      "Report the occurrence to the TSB and Transport Canada afterwards.",
    ],
  },
  {
    key: "medical",
    title: "Serious injury or illness",
    steps: [
      "Make the area safe, then give first aid.",
      "Call for help: VHF channel 16 or DSC, or 911 when in coverage. Ask for medical advice.",
      "Head for the nearest place an ambulance can meet the vessel.",
      "Record what happened, the time and the treatment given.",
    ],
  },
  {
    key: "power",
    title: "Loss of power or steering",
    steps: [
      "Warn others with the correct signals. Anchor if drifting toward danger.",
      "Find and fix the fault if it can be done safely.",
      "Call for a tow if needed. Pan-pan if there is a risk to the vessel or people.",
    ],
  },
  {
    key: "passengers",
    title: "Passenger evacuation",
    steps: [
      "Keep passengers calm and together. Lifejackets on.",
      "Headcount against the passenger list.",
      "Assign a crew member to children and anyone who needs help.",
      "Follow the abandon vessel procedure if ordered.",
    ],
    when: ["passengers", "fishingGuests"],
  },
  {
    key: "tow",
    title: "Towing emergency",
    steps: [
      "Release or slip the tow if it puts the vessel at risk.",
      "Clear the crew from the snap-back zone.",
      "Warn other traffic of the drifting tow by VHF.",
    ],
    when: ["towing"],
  },
  {
    key: "diver",
    title: "Diver emergency",
    steps: [
      "Recover the diver using the practised method.",
      "Give first aid and oxygen if trained and carried.",
      "Call for help and request medical evacuation for suspected decompression illness.",
    ],
    when: ["diving"],
  },
  {
    key: "spill",
    title: "Fuel or oil spill",
    steps: [
      "Stop the source. Contain with the spill kit.",
      "Report pollution to the Canadian Coast Guard (1-800-889-8852 in the Pacific region; check the number for your region).",
      "Record the amount, time and actions taken.",
    ],
  },
];

export const operatingProcedures: ProcedureTemplate[] = [
  {
    key: "predeparture",
    title: "Before departure",
    steps: [
      "Check the marine forecast against this vessel's weather limits.",
      "Complete the pre-departure checklist.",
      "Leave a trip plan ashore for trips outside the usual area.",
      "Brief crew (and passengers) on safety equipment and emergency procedures.",
    ],
  },
  {
    key: "voyage",
    title: "Voyage planning and navigation",
    steps: [
      "Use current charts, tide tables and Notices to Mariners for the area.",
      "Keep a proper lookout. Monitor VHF channel 16 and any traffic channel required.",
      "Follow the Collision Regulations and local traffic rules.",
    ],
  },
  {
    key: "radio",
    title: "Radio communications",
    steps: [
      "VHF radio operated by a person holding a ROC-M.",
      "DSC radio registered with an MMSI and connected to GPS.",
      "Know the Mayday, Pan-pan and Sécurité procedures.",
    ],
  },
  {
    key: "fuel",
    title: "Fuel transfer",
    steps: [
      "Engines off, no smoking, passengers ashore.",
      "Spill kit ready. Watch tank vents.",
      "Ventilate before restarting engines.",
    ],
  },
  {
    key: "weather",
    title: "Preparing for bad weather",
    steps: [
      "Secure loose gear and close openings.",
      "Lifejackets on for everyone on deck.",
      "Decide early to delay, divert or return. The master's decision is final.",
    ],
  },
  {
    key: "rest",
    title: "Hours of rest and fatigue",
    steps: ["Plan work so each person gets the rest they need.", "Record hours of rest where required.", "Stand down anyone unfit for duty."],
  },
  {
    key: "waste",
    title: "Garbage, sewage and waste oil",
    steps: ["Keep garbage on board for disposal ashore.", "Dispose of waste oil and filters at an approved facility.", "Follow the sewage rules for the area."],
  },
  {
    key: "layup",
    title: "Lay-up and winterizing",
    steps: ["Follow the engine maker's lay-up steps.", "Remove or protect safety equipment.", "Inspect before return to service and record it."],
  },
  {
    key: "towing",
    title: "Towing operations",
    steps: [
      "Plan the tow: route, weather, the towed vessel and its condition.",
      "Test the quick release before connecting.",
      "Keep crew clear of the towline while under load.",
    ],
    when: ["towing"],
  },
  {
    key: "lifting",
    title: "Lifting and hauling",
    steps: [
      "Check lifting gear and safe working load before use.",
      "Agree signals between the operator and the deck.",
      "Keep everyone clear of suspended loads.",
    ],
    when: ["aquaculture", "cargo", "survey"],
  },
  {
    key: "briefing",
    title: "Passenger safety briefing",
    steps: [
      "Where the lifejackets are and how to put one on.",
      "Where the other safety equipment is.",
      "What to do in an emergency and who to listen to.",
      "Rules for moving around the vessel.",
    ],
    when: ["passengers", "fishingGuests"],
  },
];

export const drillTypes = [
  { key: "mob", label: "Person overboard" },
  { key: "fire", label: "Fire" },
  { key: "abandon", label: "Abandon vessel" },
  { key: "flooding", label: "Flooding" },
  { key: "medical", label: "Medical emergency" },
  { key: "passengers", label: "Passenger evacuation" },
];

export const predepartureChecklist = [
  "Marine forecast checked and within limits",
  "Fuel sufficient for trip plus reserve",
  "Engine oil and coolant checked",
  "Bilge dry; pumps and alarm tested",
  "Lifejackets on board for everyone",
  "Lifebuoy and heaving line in place",
  "Fire extinguishers charged and in place",
  "Navigation lights and horn working",
  "VHF radio checked",
  "First-aid kit stocked",
  "Trip plan left ashore (if required)",
];

export const reviewChecklist = [
  "Safety and environmental protection policy still accurate",
  "Ship manager and contact details current",
  "Crew roles, authority and communication still correct",
  "Hazard register reviewed; new hazards added",
  "Procedures match how the vessel actually works",
  "Emergency procedures practised this year",
  "Drills held as scheduled and recorded",
  "All crew familiarized and records signed",
  "Incidents and non-conformities closed out",
  "Maintenance carried out and recorded",
  "Superseded documents removed from the vessel",
  "Records kept for at least 5 years",
];

export function forActivities<T extends { when?: ActivityKey[] }>(items: T[], acts: ActivityKey[]): T[] {
  return items.filter((i) => !i.when || i.when.length === 0 || i.when.some((w) => acts.includes(w)));
}

export function riskLevel(score: number): "Low" | "Medium" | "High" {
  if (score >= 12) return "High";
  if (score >= 6) return "Medium";
  return "Low";
}

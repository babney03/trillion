import type { Use } from "@/lib/classify";

// A general-arrangement style profile, drawn as a safety plan. Linework is
// plain geometry; colour appears only on the safety symbols.

type Kind = "work" | "passenger" | "tug";

export function kindForUse(use: Use): Kind {
  if (use === "passenger") return "passenger";
  if (use === "tug") return "tug";
  return "work";
}

function Fire({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="sym">
      <rect width="22" height="22" rx="2" fill="var(--fire)" />
      <rect x="8" y="7" width="7" height="12" rx="2" fill="#fff" />
      <path d="M11.5 7 V4.5 H16" stroke="#fff" strokeWidth="1.6" fill="none" />
    </g>
  );
}

function Buoy({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="sym">
      <rect width="22" height="22" rx="2" fill="var(--life)" />
      <circle cx="11" cy="11" r="6.2" stroke="#fff" strokeWidth="3" fill="none" />
    </g>
  );
}

function Aid({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="sym">
      <rect width="22" height="22" rx="2" fill="var(--life)" />
      <path d="M9 5h4v4h4v4h-4v4H9v-4H5V9h4z" fill="#fff" />
    </g>
  );
}

function Callout({ n, x, y, tx, ty }: { n: number; x: number; y: number; tx: number; ty: number }) {
  return (
    <g className="callout">
      <line x1={x} y1={y} x2={tx} y2={ty} stroke="var(--ink)" strokeWidth="1" />
      <circle cx={tx} cy={ty} r="2.6" fill="var(--ink)" />
      <circle cx={x} cy={y} r="13" fill="var(--sheet)" stroke="var(--ink)" strokeWidth="1.5" />
      <text x={x} y={y + 4.5} textAnchor="middle" fontSize="13" fontWeight="760" fill="var(--ink)">
        {n}
      </text>
    </g>
  );
}

function Work() {
  return (
    <g className="profile">
      {/* hull */}
      <path pathLength={1} className="ln ln--heavy" d="M58 148 L560 136 Q598 132 612 114 L586 196 Q566 214 512 216 L74 216 Z" />
      {/* deck line */}
      <path pathLength={1} className="ln" d="M66 160 L570 149 Q596 146 604 134" />
      {/* wheelhouse */}
      <path pathLength={1} className="ln ln--heavy" d="M332 150 L332 82 L452 82 L480 147" />
      <path pathLength={1} className="ln" d="M342 92 h40 v30 h-40 z M392 92 h40 v30 h-40 z M444 92 L462 128 h-18 z" />
      {/* mast and light */}
      <path pathLength={1} className="ln" d="M400 82 V40 M388 52 h24" />
      <circle cx="400" cy="38" r="3.5" className="ln" />
      {/* hauler davit */}
      <path pathLength={1} className="ln" d="M214 154 V96 L268 88 M268 88 V112" />
      {/* aft rail */}
      <path pathLength={1} className="ln" d="M76 128 H318 M76 128 V150 M124 128 V150 M172 128 V149 M220 128 V148 M268 128 V147 M316 128 V147" />
      {/* twin outboards */}
      <path pathLength={1} className="ln" d="M28 136 h30 v18 h-30 z M38 154 v58 h10 v-58 M34 212 h18" />
      {/* stern ladder */}
      <path pathLength={1} className="ln" d="M84 150 V206 M98 150 V206 M84 164 H98 M84 178 H98 M84 192 H98" />
    </g>
  );
}

function Passenger() {
  return (
    <g className="profile">
      <path pathLength={1} className="ln ln--heavy" d="M58 150 L560 138 Q598 134 612 116 L586 196 Q566 214 512 216 L74 216 Z" />
      <path pathLength={1} className="ln" d="M66 162 L570 151 Q596 148 604 136" />
      {/* passenger cabin */}
      <path pathLength={1} className="ln ln--heavy" d="M160 151 L160 92 L470 92 L506 146" />
      <path
        pathLength={1}
        className="ln"
        d="M176 104 h38 v26 h-38 z M226 104 h38 v26 h-38 z M276 104 h38 v26 h-38 z M326 104 h38 v26 h-38 z M376 104 h38 v26 h-38 z M426 104 h30 v26 h-30 z M466 104 L484 130 h-18 z"
      />
      {/* roof rails and light */}
      <path pathLength={1} className="ln" d="M170 92 V80 H462 V92 M420 80 V46 M408 58 h24" />
      <circle cx="420" cy="44" r="3.5" className="ln" />
      {/* boarding gate */}
      <path pathLength={1} className="ln" d="M76 130 H150 M76 130 V152 M112 130 V151 M150 130 V151" />
      {/* outboards */}
      <path pathLength={1} className="ln" d="M28 138 h30 v18 h-30 z M38 156 v56 h10 v-56 M34 212 h18" />
    </g>
  );
}

function Tug() {
  return (
    <g className="profile">
      <path pathLength={1} className="ln ln--heavy" d="M110 156 L520 140 Q566 130 586 100 L566 196 Q546 214 492 216 L124 216 Q104 200 110 156 Z" />
      <path pathLength={1} className="ln" d="M118 168 L530 153 Q560 146 578 120" />
      {/* raised wheelhouse */}
      <path pathLength={1} className="ln ln--heavy" d="M330 152 L330 108 L352 108 L352 64 L458 64 L476 106 L476 108 L500 108 L506 147" />
      <path pathLength={1} className="ln" d="M362 74 h36 v22 h-36 z M406 74 h34 v22 h-34 z M448 74 L460 96 h-12 z" />
      <path pathLength={1} className="ln" d="M404 64 V28 M392 40 h24" />
      <circle cx="404" cy="26" r="3.5" className="ln" />
      {/* fenders */}
      <path pathLength={1} className="ln" d="M150 176 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M200 174 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M250 172 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M300 170 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0" />
      {/* towing bitt and line */}
      <path pathLength={1} className="ln ln--heavy" d="M196 154 V128 M214 154 V128 M190 132 H220" />
      <path pathLength={1} className="ln ln--dash" d="M205 130 Q120 150 22 176" />
      {/* snap-back zone, hatched */}
      <path d="M118 124 L250 124 L250 152 L118 156 Z" fill="url(#hatch)" stroke="var(--fire)" strokeWidth="1" strokeDasharray="4 3" />
    </g>
  );
}

export default function VesselDrawing({ kind }: { kind: Kind }) {
  const caption =
    kind === "tug"
      ? "Towboat profile with towing bitt, snap-back zone, fire extinguisher and lifebuoy"
      : kind === "passenger"
        ? "Water taxi profile with passenger cabin, boarding gate, extinguisher, lifebuoy and first-aid kit"
        : "Workboat profile with wheelhouse, hauler davit, stern ladder, extinguisher and lifebuoy";

  return (
    <svg className="drawing" viewBox="0 0 640 270" role="img" aria-label={caption}>
      <defs>
        <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--fire)" strokeWidth="1.2" />
        </pattern>
      </defs>

      {/* waterline, baseline and stations */}
      <line x1="10" y1="196" x2="630" y2="196" className="ln ln--dash" />
      <text x="626" y="190" textAnchor="end" className="dim">
        DWL
      </text>
      <line x1="10" y1="236" x2="630" y2="236" className="ln ln--thin" />
      {Array.from({ length: 11 }, (_, i) => {
        const x = 60 + i * 54;
        return (
          <g key={i}>
            <line x1={x} y1="230" x2={x} y2="242" className="ln ln--thin" />
            <text x={x} y="258" textAnchor="middle" className="dim">
              {i}
            </text>
          </g>
        );
      })}

      <g key={kind} className="plot">
        {kind === "work" && (
          <>
            <Work />
            <Fire x={356} y={124} />
            <Buoy x={286} y={100} />
            <Callout n={1} x={120} y={36} tx={91} ty={180} />
            <Callout n={2} x={240} y={36} tx={290} ty={104} />
            <Callout n={3} x={330} y={36} tx={367} ty={126} />
            <Callout n={4} x={614} y={216} tx={500} ty={208} />
          </>
        )}
        {kind === "passenger" && (
          <>
            <Passenger />
            <Fire x={436} y={134} />
            <Buoy x={118} y={100} />
            <Aid x={184} y={134} />
            <Callout n={1} x={70} y={40} tx={124} ty={104} />
            <Callout n={2} x={190} y={40} tx={195} ty={136} />
            <Callout n={3} x={520} y={36} tx={447} ty={136} />
            <Callout n={4} x={614} y={216} tx={500} ty={208} />
          </>
        )}
        {kind === "tug" && (
          <>
            <Tug />
            <Fire x={420} y={120} />
            <Buoy x={300} y={118} />
            <Callout n={1} x={130} y={60} tx={160} ty={138} />
            <Callout n={2} x={290} y={40} tx={310} ty={120} />
            <Callout n={3} x={540} y={40} tx={431} ty={122} />
            <Callout n={4} x={614} y={216} tx={480} ty={208} />
          </>
        )}
      </g>
    </svg>
  );
}

export const calloutText: Record<Kind, string[]> = {
  work: ["Person overboard: stern ladder recovery", "Lifesaving: lifebuoy and heaving line", "Fire: extinguisher at the helm", "Flooding: bilge pump and high-water alarm"],
  passenger: ["Lifesaving: lifebuoy at the boarding gate", "First aid and passenger briefing", "Fire: extinguisher in the cabin", "Flooding: bilge pumps and alarm"],
  tug: ["Snap-back zone: crew clear of the towline", "Lifesaving: lifebuoy on the house", "Fire: extinguisher in the wheelhouse", "Flooding: bilge pumps and alarm"],
};

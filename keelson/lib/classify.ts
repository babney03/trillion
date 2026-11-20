// Vessel class finder for the Marine Safety Management System Regulations
// (SOR/2024-133), as described in Transport Canada's TP 15566 and its
// "Safety management systems in the marine sector" page. This is a guide for
// small operators, not a legal determination.

export type Use = "passenger" | "tug" | "work" | "fishing" | "pleasure";
export type Tonnage = "small" | "large"; // small = 15 GT or less
export type Length = "under24" | "over24";
export type Pax = "upTo12" | "over12";
export type Size7 = "upTo7" | "over7";

export interface FinderAnswers {
  use: Use;
  tonnage: Tonnage;
  length: Length;
  pax: Pax;
  size7: Size7;
  registeredBefore: boolean; // registered on or before July 3, 2024
}

export type Status = "due" | "passed" | "excluded" | "large";

export interface FinderResult {
  status: Status;
  classLabel: string; // e.g. "Class 5"
  headline: string;
  deadline?: string; // ISO date
  deadlineText: string;
  needs: string[];
  note?: string;
}

export const CLASS5_DEADLINE = "2027-07-02";

export const defaultAnswers: FinderAnswers = {
  use: "work",
  tonnage: "small",
  length: "under24",
  pax: "upTo12",
  size7: "over7",
  registeredBefore: true,
};

export function classify(a: FinderAnswers): FinderResult {
  if (a.use === "pleasure") {
    return {
      status: "excluded",
      classLabel: "Not covered",
      headline: "Pleasure craft are outside these regulations.",
      deadlineText: "No SMS required",
      needs: [
        "If the boat is ever used for hire or for work, it becomes a commercial vessel and this changes.",
      ],
    };
  }

  if (a.use === "fishing" && !(a.length === "over24" && a.tonnage === "large")) {
    return {
      status: "excluded",
      classLabel: "Not covered",
      headline: "Fishing vessels up to 24.4 m and 150 GT are excluded.",
      deadlineText: "No SMS required under SOR/2024-133",
      needs: [
        "A boat used for sport-fishing charters with paying guests is a passenger vessel, not a fishing vessel. Answer “Carries passengers” instead.",
        "Fishing vessel safety rules still apply (Fishing Vessel Safety Regulations).",
      ],
    };
  }

  if (a.length === "over24") {
    return {
      status: "large",
      classLabel: "Class 2 or 3",
      headline: "A vessel 24 m or longer falls in Class 2 or 3.",
      deadlineText: "Grace periods ended in 2025–2026",
      needs: [
        "A documented SMS and a Canadian Document of Compliance and Safety Management Certificate.",
        "Keelson is built for small vessels. Talk to a marine consultant on Transport Canada’s list.",
      ],
    };
  }

  if (a.tonnage === "large") {
    const pax = a.use === "passenger";
    return {
      status: "passed",
      classLabel: "Class 4",
      headline: "Under 24 m and over 15 GT: Class 4, certificate required.",
      deadlineText: pax
        ? "Grace period ended at your inspection certificate date after July 2, 2025"
        : "Grace period ended at your inspection certificate date after July 2, 2026",
      needs: [
        "A documented SMS in use on board.",
        "A Canadian Document of Compliance and Safety Management Certificate (apply on forms 85-0547A and 85-0547B).",
        "Records of drills, familiarization, reviews and non-conformities, kept 5 years.",
      ],
    };
  }

  // 15 GT or less, under 24 m
  if (a.use === "passenger" && a.pax === "over12") {
    return {
      status: "passed",
      classLabel: "Class 4",
      headline: "15 GT or less, more than 12 passengers: Class 4.",
      deadlineText: "Grace period ended at your inspection certificate date after July 2, 2025",
      needs: [
        "A documented SMS in use on board, and certification under the regulations.",
        "Records of drills, familiarization, reviews and non-conformities, kept 5 years.",
      ],
    };
  }

  if (a.use === "passenger" || a.use === "tug") {
    const what = a.use === "tug" ? "tug or towboat" : "passenger vessel (12 or fewer)";
    return {
      status: "passed",
      classLabel: "Class 4B",
      headline: `15 GT or less ${what}: Class 4B.`,
      deadlineText:
        a.size7 === "over7"
          ? "Grace period ended at your Certificate of Registry date after July 2, 2025"
          : "Grace period ended at your Certificate of Registry date after July 2, 2026",
      needs: [
        "A documented SMS in use, with a declaration of compliance to Transport Canada.",
        a.use === "tug"
          ? "Towing procedures that cover the towed, non-propelled vessels too."
          : "Passenger safety briefing, headcount and evacuation procedures.",
        "Records of drills, familiarization, reviews and non-conformities, kept 5 years.",
      ],
      note: a.registeredBefore
        ? undefined
        : "Registered after July 3, 2024: no grace period applied. The SMS was needed from the start.",
    };
  }

  // Class 5
  return {
    status: "due",
    classLabel: "Class 5",
    headline: "15 GT or less, not carrying passengers, not a tug: Class 5.",
    deadline: CLASS5_DEADLINE,
    deadlineText: a.registeredBefore
      ? "Documented SMS required by July 2, 2027"
      : "Registered after July 3, 2024: SMS due within 6 months of registration",
    needs: [
      "An up-to-date SMS manual kept on board. No certificate to apply for.",
      "A named ship manager responsible for the SMS.",
      "Records of drills, familiarization, reviews and non-conformities, kept 5 years.",
    ],
  };
}

export function daysUntil(iso: string, from: Date = new Date()): number {
  const target = new Date(iso + "T00:00:00");
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

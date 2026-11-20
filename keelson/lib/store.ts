"use client";

import { useCallback, useEffect, useState } from "react";
import { ActivityKey, hazardLibrary, forActivities } from "./library";

export type VesselType = "work" | "passenger" | "tug";

export interface Crew {
  id: string;
  name: string;
  role: string;
  certs: { name: string; expires: string }[];
}

export interface Hazard {
  id: string;
  key?: string;
  title: string;
  description: string;
  likelihood: number;
  severity: number;
  controls: string[];
}

export interface Vessel {
  id: string;
  name: string;
  officialNumber: string;
  type: VesselType;
  lengthM: string;
  grossTonnage: string;
  maxPersons: string;
  area: string;
  homePort: string;
  season: string;
  weatherLimits: string;
  activities: ActivityKey[];
  hazards: Hazard[];
}

export type RecordKind = "drill" | "familiarization" | "check" | "incident" | "maintenance" | "review";

export interface LogRecord {
  id: string;
  vesselId: string;
  kind: RecordKind;
  date: string; // ISO yyyy-mm-dd
  title: string;
  people: string;
  notes: string;
  signedBy: string;
  // incident / non-conformity fields (TP 15566 s.3.7.3)
  ncType?: string;
  section?: string;
  rootCause?: string;
  correction?: string;
  closed?: boolean;
  items?: { label: string; ok: boolean }[];
}

export interface Revision {
  rev: number;
  date: string;
  by: string;
  note: string;
}

export interface KeelsonState {
  version: 1;
  company: {
    name: string;
    address: string;
    shipManager: string;
    phone: string;
    email: string;
    dpa: string;
    policy: string;
  };
  vessels: Vessel[];
  activeVesselId: string | null;
  crew: Crew[];
  records: LogRecord[];
  revisions: Revision[];
  drillCycleMonths: number;
  sample: boolean;
}

const KEY = "keelson:v1";

export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const defaultPolicy =
  "We will operate this vessel so that no one is hurt and nothing is spilled. The master has the authority and the duty to stop any work, refuse any trip and turn back when safety requires it. Every person on board is expected to follow this system, report hazards and incidents without fear of blame, and help us improve it.";

export function hazardsFor(acts: ActivityKey[]): Hazard[] {
  return forActivities(hazardLibrary, acts).map((h) => ({
    id: uid(),
    key: h.key,
    title: h.title,
    description: h.description,
    likelihood: h.likelihood,
    severity: h.severity,
    controls: [...h.controls],
  }));
}

export function emptyState(): KeelsonState {
  return {
    version: 1,
    company: { name: "", address: "", shipManager: "", phone: "", email: "", dpa: "", policy: defaultPolicy },
    vessels: [],
    activeVesselId: null,
    crew: [],
    records: [],
    revisions: [],
    drillCycleMonths: 3,
    sample: false,
  };
}

export function newVessel(partial: Partial<Vessel> = {}): Vessel {
  const acts = partial.activities ?? [];
  return {
    id: uid(),
    name: "",
    officialNumber: "",
    type: "work",
    lengthM: "",
    grossTonnage: "",
    maxPersons: "",
    area: "Sheltered and near-coastal waters",
    homePort: "",
    season: "Year round",
    weatherLimits: "Return to shelter or do not depart when winds exceed 25 knots or seas exceed 1.5 m.",
    activities: acts,
    hazards: hazardsFor(acts),
    ...partial,
  };
}

export function sampleState(): KeelsonState {
  const v = newVessel({
    name: "Tidewater Spirit",
    officialNumber: "C00000BC",
    type: "work",
    lengthM: "9.1",
    grossTonnage: "6.8",
    maxPersons: "6",
    homePort: "Nanaimo, BC",
    activities: ["crew", "aquaculture", "remote"],
  });
  v.hazards = hazardsFor(v.activities);
  const s = emptyState();
  const t = new Date();
  const ago = (days: number) => {
    const d = new Date(t.getTime() - days * 86_400_000);
    return d.toISOString().slice(0, 10);
  };
  const inDays = (days: number) => new Date(t.getTime() + days * 86_400_000).toISOString().slice(0, 10);
  return {
    ...s,
    sample: true,
    company: {
      ...s.company,
      name: "Sample Marine Services Ltd.",
      address: "Nanaimo, BC",
      shipManager: "Alex Morgan",
      phone: "250-555-0100",
      email: "ops@example.com",
    },
    vessels: [v],
    activeVesselId: v.id,
    crew: [
      { id: uid(), name: "Alex Morgan", role: "Master", certs: [{ name: "SVOP", expires: "" }, { name: "Marine First Aid", expires: inDays(40) }] },
      { id: uid(), name: "Sam Lee", role: "Deckhand", certs: [{ name: "MED A3", expires: "" }] },
      { id: uid(), name: "Jordan Pike", role: "Deckhand", certs: [] },
    ],
    records: [
      { id: uid(), vesselId: v.id, kind: "drill", date: ago(110), title: "Person overboard", people: "Alex Morgan, Sam Lee", notes: "Recovered dummy with sling in 4 min. Ladder hard to reach from water; add a step.", signedBy: "Alex Morgan" },
      { id: uid(), vesselId: v.id, kind: "drill", date: ago(60), title: "Fire", people: "Alex Morgan, Sam Lee", notes: "Engine space fire scenario. Fuel shut-off located in 20 s.", signedBy: "Alex Morgan" },
      { id: uid(), vesselId: v.id, kind: "familiarization", date: ago(200), title: "Sam Lee", people: "Sam Lee", notes: "Safety equipment, emergency procedures, duties.", signedBy: "Alex Morgan" },
      { id: uid(), vesselId: v.id, kind: "incident", date: ago(25), title: "Near miss: line in propeller during pen approach", people: "Alex Morgan", notes: "Floating rope fouled the prop at low speed. Cleared by hand at the dock.", signedBy: "Alex Morgan", ncType: "Near miss", section: "Operating procedures: lookout", rootCause: "Approach made with no bow lookout during hauling.", correction: "Bow lookout required on every pen approach.", closed: false },
    ],
    revisions: [{ rev: 1, date: ago(210), by: "Alex Morgan", note: "First issue (sample)" }],
  };
}

function load(): KeelsonState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as KeelsonState;
    if (parsed.version !== 1) return emptyState();
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

export function useKeelson() {
  const [state, setState] = useState<KeelsonState>(emptyState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  }, [state, ready]);

  const update = useCallback((fn: (s: KeelsonState) => KeelsonState) => setState((s) => fn(s)), []);
  const replace = useCallback((s: KeelsonState) => setState(s), []);

  return { state, ready, update, replace };
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export function drillKeysFor(vessel: Vessel): string[] {
  const keys = ["Person overboard", "Fire", "Abandon vessel", "Flooding"];
  if (vessel.activities.includes("passengers") || vessel.activities.includes("fishingGuests")) keys.push("Passenger evacuation");
  return keys;
}

export interface DueItem {
  id: string;
  level: "overdue" | "soon" | "ok";
  title: string;
  detail: string;
  due?: string;
  action?: { tab: string; kind?: RecordKind; preset?: string };
}

export function dueItems(s: KeelsonState, vessel: Vessel | undefined, now = new Date()): DueItem[] {
  if (!vessel) return [];
  const items: DueItem[] = [];
  const t = now.toISOString().slice(0, 10);
  const recs = s.records.filter((r) => r.vesselId === vessel.id);
  const diff = (iso: string) => Math.round((new Date(iso + "T00:00:00").getTime() - new Date(t + "T00:00:00").getTime()) / 86_400_000);

  // Annual internal review
  const reviews = recs.filter((r) => r.kind === "review").sort((a, b) => b.date.localeCompare(a.date));
  const base = reviews[0]?.date ?? s.revisions[0]?.date;
  if (!base) {
    items.push({ id: "review-none", level: "soon", title: "Adopt your SMS", detail: "Review the draft manual and issue revision 1.", action: { tab: "manual" } });
  } else {
    const due = addMonths(base, 12);
    const d = diff(due);
    items.push({
      id: "review",
      level: d < 0 ? "overdue" : d <= 45 ? "soon" : "ok",
      title: "Internal review",
      detail: d < 0 ? `Overdue by ${-d} days` : `Due in ${d} days`,
      due,
      action: { tab: "records", kind: "review" },
    });
  }

  // Drills on a rotating cycle
  for (const k of drillKeysFor(vessel)) {
    const last = recs.filter((r) => r.kind === "drill" && r.title === k).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!last) {
      const adopted = s.revisions.length > 0;
      items.push({
        id: `drill-${k}`,
        level: adopted ? "overdue" : "soon",
        title: `${k} drill`,
        detail: adopted ? "No drill recorded since the SMS was issued" : "Not recorded yet",
        action: { tab: "records", kind: "drill", preset: k },
      });
      continue;
    }
    const due = addMonths(last.date, s.drillCycleMonths);
    const d = diff(due);
    items.push({
      id: `drill-${k}`,
      level: d < 0 ? "overdue" : d <= 14 ? "soon" : "ok",
      title: `${k} drill`,
      detail: d < 0 ? `Overdue by ${-d} days` : `Next due in ${d} days`,
      due,
      action: { tab: "records", kind: "drill", preset: k },
    });
  }

  // Crew familiarization and certificates
  for (const c of s.crew) {
    const fam = recs.find((r) => r.kind === "familiarization" && r.title === c.name);
    if (!fam) {
      items.push({ id: `fam-${c.id}`, level: s.revisions.length > 0 ? "overdue" : "soon", title: `Familiarize ${c.name}`, detail: "No signed familiarization record", action: { tab: "records", kind: "familiarization", preset: c.name } });
    }
    for (const cert of c.certs) {
      if (!cert.expires) continue;
      const d = diff(cert.expires);
      if (d <= 60) {
        items.push({ id: `cert-${c.id}-${cert.name}`, level: d < 0 ? "overdue" : "soon", title: `${c.name}: ${cert.name}`, detail: d < 0 ? `Expired ${-d} days ago` : `Expires in ${d} days`, due: cert.expires, action: { tab: "crew" } });
      }
    }
  }

  // Open non-conformities
  for (const r of recs.filter((r) => r.kind === "incident" && !r.closed)) {
    items.push({ id: `nc-${r.id}`, level: "soon", title: "Close out report", detail: r.title, due: r.date, action: { tab: "records", kind: "incident" } });
  }

  const order = { overdue: 0, soon: 1, ok: 2 };
  return items.sort((a, b) => order[a.level] - order[b.level]);
}

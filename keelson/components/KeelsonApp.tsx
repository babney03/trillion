"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Brand from "./Brand";
import Manual, { vesselClass } from "./Manual";
import {
  useKeelson,
  KeelsonState,
  Vessel,
  VesselType,
  LogRecord,
  RecordKind,
  Crew,
  Hazard,
  newVessel,
  sampleState,
  emptyState,
  hazardsFor,
  dueItems,
  formatDate,
  today,
  uid,
} from "@/lib/store";
import { activities, ActivityKey, drillTypes, predepartureChecklist, reviewChecklist, riskLevel, hazardLibrary, forActivities } from "@/lib/library";
import { daysUntil, CLASS5_DEADLINE } from "@/lib/classify";

type Tab = "today" | "boat" | "hazards" | "manual" | "records";
type Update = (fn: (s: KeelsonState) => KeelsonState) => void;

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "today", label: "Today", icon: <path d="M4 6h16M4 12h10M4 18h7M17 15l2 2 4-4" /> },
  { key: "boat", label: "Boat", icon: <path d="M3 13h18l-3 6H6zM7 13V8h7l3 5M10 8V4" /> },
  { key: "hazards", label: "Hazards", icon: <path d="M12 3l10 18H2zM12 10v5M12 18v.5" /> },
  { key: "manual", label: "Manual", icon: <path d="M5 3h10l4 4v14H5zM15 3v4h4M8 12h8M8 16h8" /> },
  { key: "records", label: "Records", icon: <path d="M4 4h16v16H4zM4 9h16M9 9v11" /> },
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="ico" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const kindLabels: Record<RecordKind, string> = {
  drill: "Drills",
  familiarization: "Familiarization",
  check: "Checks",
  incident: "Reports",
  maintenance: "Maintenance",
  review: "Reviews",
};

export default function KeelsonApp() {
  const { state, ready, update, replace } = useKeelson();
  const [tab, setTab] = useState<Tab>("today");
  const [recordIntent, setRecordIntent] = useState<{ kind: RecordKind; preset?: string } | null>(null);

  useEffect(() => {
    const read = () => {
      const h = location.hash.replace("#", "") as Tab;
      if (tabs.some((t) => t.key === h)) setTab(h);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
    window.scrollTo({ top: 0 });
  };

  const vessel = state.vessels.find((v) => v.id === state.activeVesselId) ?? state.vessels[0];

  if (!ready) {
    return (
      <div className="app app--loading">
        <p className="muted">Opening your vessel…</p>
      </div>
    );
  }

  if (!vessel) {
    return <Setup state={state} update={update} replace={replace} />;
  }

  const cls = vesselClass(vessel);

  return (
    <div className="app">
      <header className="bar no-print">
        <Brand />
        <div className="bar__vessel">
          {state.vessels.length > 1 ? (
            <select
              aria-label="Vessel"
              value={vessel.id}
              onChange={(e) => update((s) => ({ ...s, activeVesselId: e.target.value }))}
            >
              {state.vessels.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name || "Unnamed vessel"}
                </option>
              ))}
            </select>
          ) : (
            <b>{vessel.name || "Unnamed vessel"}</b>
          )}
          <span className="bar__class">{cls.classLabel}</span>
        </div>
        <nav className="tabs" aria-label="App sections">
          {tabs.map((t) => (
            <button key={t.key} className="tab" aria-current={tab === t.key ? "page" : undefined} onClick={() => go(t.key)}>
              <Icon>{t.icon}</Icon>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {state.sample && (
        <div className="sample no-print" role="note">
          <span>
            <b>Sample vessel.</b> Everything here is made up so you can look around.
          </span>
          <button className="btn btn--small" onClick={() => replace(emptyState())}>
            Start my own
          </button>
        </div>
      )}

      <main className="screen" id="main">
        {tab === "today" && (
          <Today
            state={state}
            vessel={vessel}
            onAction={(t, kind, preset) => {
              if (kind) setRecordIntent({ kind, preset });
              go(t as Tab);
            }}
          />
        )}
        {tab === "boat" && <Boat state={state} vessel={vessel} update={update} replace={replace} />}
        {tab === "hazards" && <Hazards vessel={vessel} update={update} />}
        {tab === "manual" && <ManualScreen state={state} vessel={vessel} update={update} />}
        {tab === "records" && (
          <Records state={state} vessel={vessel} update={update} intent={recordIntent} clearIntent={() => setRecordIntent(null)} />
        )}
      </main>
    </div>
  );
}

/* ── Setup ─────────────────────────────────────────────────────────── */

function Setup({ state, update, replace }: { state: KeelsonState; update: Update; replace: (s: KeelsonState) => void }) {
  const [v, setV] = useState<Vessel>(() => newVessel());
  const [company, setCompany] = useState(state.company);
  const canSave = v.name.trim().length > 0 && company.shipManager.trim().length > 0;

  const create = () => {
    const vessel = { ...v, hazards: hazardsFor(v.activities) };
    update((s) => ({ ...s, company, vessels: [...s.vessels, vessel], activeVesselId: vessel.id, sample: false }));
  };

  return (
    <div className="app">
      <header className="bar bar--setup">
        <Brand />
      </header>
      <main className="screen setup">
        <div className="setup__intro">
          <h1>Set up your vessel</h1>
          <p className="lead">A few facts about the boat and the work. Keelson drafts your hazard register and manual from them. You can change anything later.</p>
          <button className="btn btn--quiet" onClick={() => replace(sampleState())}>
            Or look around with a sample vessel
          </button>
        </div>

        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) create();
          }}
        >
          <h2>The vessel</h2>
          <div className="form-grid">
            <label className="field">
              <span>Vessel name</span>
              <input type="text" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required autoComplete="off" />
            </label>
            <label className="field">
              <span>Official number</span>
              <input type="text" value={v.officialNumber} onChange={(e) => setV({ ...v, officialNumber: e.target.value.toUpperCase() })} placeholder="C12345BC" autoComplete="off" />
            </label>
          </div>
          <fieldset className="q">
            <legend>What it does</legend>
            <div className="choices">
              {(
                [
                  ["work", "Work"],
                  ["passenger", "Carries passengers"],
                  ["tug", "Tows or pushes"],
                ] as [VesselType, string][]
              ).map(([val, label]) => (
                <label className="choice" key={val}>
                  <input type="radio" name="vtype" checked={v.type === val} onChange={() => setV({ ...v, type: val })} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-grid form-grid--3">
            <label className="field">
              <span>Length (m)</span>
              <input type="number" inputMode="decimal" step="0.1" min="0" value={v.lengthM} onChange={(e) => setV({ ...v, lengthM: e.target.value })} />
            </label>
            <label className="field">
              <span>Gross tonnage</span>
              <input type="number" inputMode="decimal" step="0.1" min="0" value={v.grossTonnage} onChange={(e) => setV({ ...v, grossTonnage: e.target.value })} />
            </label>
            <label className="field">
              <span>Max persons</span>
              <input type="number" inputMode="numeric" min="1" value={v.maxPersons} onChange={(e) => setV({ ...v, maxPersons: e.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>Home port</span>
            <input type="text" value={v.homePort} onChange={(e) => setV({ ...v, homePort: e.target.value })} />
          </label>
          <Activities value={v.activities} onChange={(acts) => setV({ ...v, activities: acts })} />

          <h2 className="panel__h2">Who is responsible</h2>
          <div className="form-grid">
            <label className="field">
              <span>Ship manager</span>
              <input type="text" value={company.shipManager} onChange={(e) => setCompany({ ...company, shipManager: e.target.value })} required autoComplete="name" />
              <small>The person or company responsible for the SMS.</small>
            </label>
            <label className="field">
              <span>Company or owner</span>
              <input type="text" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} autoComplete="organization" />
            </label>
            <label className="field">
              <span>Phone</span>
              <input type="tel" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} autoComplete="tel" />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} autoComplete="email" />
            </label>
          </div>
          <div className="actions">
            <button className="btn btn--ink" type="submit" disabled={!canSave}>
              Draft my SMS
            </button>
            {!canSave && <span className="muted">Add the vessel name and ship manager to continue.</span>}
          </div>
        </form>
      </main>
    </div>
  );
}

function Activities({ value, onChange }: { value: ActivityKey[]; onChange: (a: ActivityKey[]) => void }) {
  return (
    <fieldset className="q">
      <legend>The work you do</legend>
      <div className="acts">
        {activities.map((a) => {
          const on = value.includes(a.key);
          return (
            <label key={a.key} className="act">
              <input type="checkbox" checked={on} onChange={() => onChange(on ? value.filter((x) => x !== a.key) : [...value, a.key])} />
              <span className="act__box" aria-hidden="true" />
              <span>
                <b>{a.label}</b>
                <small>{a.hint}</small>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ── Today ─────────────────────────────────────────────────────────── */

function Today({ state, vessel, onAction }: { state: KeelsonState; vessel: Vessel; onAction: (tab: string, kind?: RecordKind, preset?: string) => void }) {
  const items = useMemo(() => dueItems(state, vessel), [state, vessel]);
  const cls = vesselClass(vessel);
  const rev = state.revisions[state.revisions.length - 1];
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => setDays(daysUntil(CLASS5_DEADLINE)), []);
  const overdue = items.filter((i) => i.level === "overdue").length;

  return (
    <>
      <div className="tb head-tb">
        <div className="tb__row">
          <div className="tb__cell">
            <span className="label">Vessel</span>
            <span className="tb__val">{vessel.name}</span>
          </div>
          <div className="tb__cell">
            <span className="label">Official no.</span>
            <span className="tb__val">{vessel.officialNumber || "—"}</span>
          </div>
        </div>
        <div className="tb__row">
          <div className="tb__cell">
            <span className="label">Class</span>
            <span className="tb__val">{cls.classLabel}</span>
          </div>
          <div className="tb__cell">
            <span className="label">Manual</span>
            <span className="tb__val">{rev ? `Rev ${rev.rev}` : "Draft"}</span>
          </div>
          <div className="tb__cell">
            <span className="label">{cls.status === "due" ? "Days to deadline" : "Status"}</span>
            <span className="tb__val">{cls.status === "due" ? (days ?? "—") : cls.status === "passed" ? "In force" : "—"}</span>
          </div>
        </div>
      </div>

      <section className="block" aria-labelledby="due-h">
        <div className="block__head">
          <h1 id="due-h">{overdue > 0 ? `${overdue} thing${overdue === 1 ? "" : "s"} overdue` : "Nothing overdue"}</h1>
          <p className="muted">{cls.deadlineText}</p>
        </div>
        <ul className="due">
          {items.map((i) => (
            <li key={i.id} className={`due__item due__item--${i.level}`}>
              <div className="due__text">
                <span className={`mark mark--${i.level}`}>{i.level === "overdue" ? "Overdue" : i.level === "soon" ? "Due soon" : "On track"}</span>
                <b>{i.title}</b>
                <span className="muted">
                  {i.detail}
                  {i.due ? ` · ${formatDate(i.due)}` : ""}
                </span>
              </div>
              {i.action && i.level !== "ok" && (
                <button className="btn btn--small" onClick={() => onAction(i.action!.tab, i.action!.kind, i.action!.preset)}>
                  {i.action.kind === "drill" ? "Log drill" : i.action.kind === "familiarization" ? "Sign off" : i.action.kind === "review" ? "Start review" : i.action.tab === "manual" ? "Open manual" : "Open"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="block" aria-labelledby="quick-h">
        <h2 id="quick-h" className="block__h2">Log something now</h2>
        <div className="quick">
          <button className="btn" onClick={() => onAction("records", "check")}>
            Pre-departure check
          </button>
          <button className="btn" onClick={() => onAction("records", "drill")}>
            Drill
          </button>
          <button className="btn" onClick={() => onAction("records", "incident")}>
            Incident or near miss
          </button>
          <button className="btn" onClick={() => onAction("records", "maintenance")}>
            Maintenance
          </button>
        </div>
      </section>
    </>
  );
}

/* ── Boat ──────────────────────────────────────────────────────────── */

function Boat({ state, vessel, update, replace }: { state: KeelsonState; vessel: Vessel; update: Update; replace: (s: KeelsonState) => void }) {
  const setVessel = (patch: Partial<Vessel>) =>
    update((s) => ({ ...s, vessels: s.vessels.map((v) => (v.id === vessel.id ? { ...v, ...patch } : v)) }));
  const setCompany = (patch: Partial<KeelsonState["company"]>) => update((s) => ({ ...s, company: { ...s.company, ...patch } }));
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `keelson-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg("Backup saved to your downloads.");
  };

  const importData = (file: File) => {
    file
      .text()
      .then((t) => {
        const parsed = JSON.parse(t) as KeelsonState;
        if (parsed.version !== 1 || !Array.isArray(parsed.vessels)) throw new Error("bad");
        replace({ ...emptyState(), ...parsed });
        setMsg("Backup restored.");
      })
      .catch(() => setMsg("That file is not a Keelson backup. Nothing was changed."));
  };

  const addMissingHazards = () => {
    const have = new Set(vessel.hazards.map((h) => h.key));
    const add = hazardsFor(vessel.activities).filter((h) => !have.has(h.key));
    setVessel({ hazards: [...vessel.hazards, ...add] });
    setMsg(add.length ? `Added ${add.length} hazard${add.length === 1 ? "" : "s"} for the new work.` : "Your hazard register already covers this work.");
  };

  return (
    <>
      <h1 className="screen__h1">Boat, crew and settings</h1>
      {msg && (
        <p className="toast" role="status">
          {msg}
        </p>
      )}

      <section className="panel">
        <h2>Vessel</h2>
        <div className="form-grid">
          <label className="field">
            <span>Vessel name</span>
            <input type="text" value={vessel.name} onChange={(e) => setVessel({ name: e.target.value })} />
          </label>
          <label className="field">
            <span>Official number</span>
            <input type="text" value={vessel.officialNumber} onChange={(e) => setVessel({ officialNumber: e.target.value.toUpperCase() })} />
          </label>
        </div>
        <fieldset className="q">
          <legend>What it does</legend>
          <div className="choices">
            {(
              [
                ["work", "Work"],
                ["passenger", "Carries passengers"],
                ["tug", "Tows or pushes"],
              ] as [VesselType, string][]
            ).map(([val, label]) => (
              <label className="choice" key={val}>
                <input type="radio" name="vtype-edit" checked={vessel.type === val} onChange={() => setVessel({ type: val })} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-grid form-grid--3">
          <label className="field">
            <span>Length (m)</span>
            <input type="number" inputMode="decimal" step="0.1" value={vessel.lengthM} onChange={(e) => setVessel({ lengthM: e.target.value })} />
          </label>
          <label className="field">
            <span>Gross tonnage</span>
            <input type="number" inputMode="decimal" step="0.1" value={vessel.grossTonnage} onChange={(e) => setVessel({ grossTonnage: e.target.value })} />
          </label>
          <label className="field">
            <span>Max persons</span>
            <input type="number" inputMode="numeric" value={vessel.maxPersons} onChange={(e) => setVessel({ maxPersons: e.target.value })} />
          </label>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Home port</span>
            <input type="text" value={vessel.homePort} onChange={(e) => setVessel({ homePort: e.target.value })} />
          </label>
          <label className="field">
            <span>Operating area</span>
            <input type="text" value={vessel.area} onChange={(e) => setVessel({ area: e.target.value })} />
          </label>
          <label className="field">
            <span>Season</span>
            <input type="text" value={vessel.season} onChange={(e) => setVessel({ season: e.target.value })} />
          </label>
        </div>
        <label className="field">
          <span>Weather limits</span>
          <textarea value={vessel.weatherLimits} onChange={(e) => setVessel({ weatherLimits: e.target.value })} />
          <small>When does this boat stay in, or turn back? Be specific.</small>
        </label>
        <Activities value={vessel.activities} onChange={(acts) => setVessel({ activities: acts })} />
        <div className="actions">
          <button className="btn btn--small" onClick={addMissingHazards}>
            Add hazards for this work
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Ship manager and policy</h2>
        <div className="form-grid">
          <label className="field">
            <span>Ship manager</span>
            <input type="text" value={state.company.shipManager} onChange={(e) => setCompany({ shipManager: e.target.value })} />
          </label>
          <label className="field">
            <span>Company or owner</span>
            <input type="text" value={state.company.name} onChange={(e) => setCompany({ name: e.target.value })} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input type="tel" value={state.company.phone} onChange={(e) => setCompany({ phone: e.target.value })} />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={state.company.email} onChange={(e) => setCompany({ email: e.target.value })} />
          </label>
          <label className="field">
            <span>Address</span>
            <input type="text" value={state.company.address} onChange={(e) => setCompany({ address: e.target.value })} />
          </label>
          <label className="field">
            <span>Designated person ashore</span>
            <input type="text" value={state.company.dpa} onChange={(e) => setCompany({ dpa: e.target.value })} placeholder="Optional for this class" />
          </label>
        </div>
        <label className="field">
          <span>Safety and environmental protection policy</span>
          <textarea rows={5} value={state.company.policy} onChange={(e) => setCompany({ policy: e.target.value })} />
          <small>Put it in your own words. Keep the master’s authority to stop work.</small>
        </label>
      </section>

      <CrewPanel state={state} update={update} />

      <section className="panel">
        <h2>Drills</h2>
        <label className="field field--inline">
          <span>Practise each drill at least every</span>
          <select value={state.drillCycleMonths} onChange={(e) => update((s) => ({ ...s, drillCycleMonths: Number(e.target.value) }))}>
            {[1, 2, 3, 4, 6, 12].map((m) => (
              <option key={m} value={m}>
                {m} month{m === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel">
        <h2>Backup</h2>
        <p className="muted">Your records live on this device. Save a backup file regularly and keep a copy off the boat.</p>
        <div className="actions">
          <button className="btn btn--small" onClick={exportData}>
            Save backup file
          </button>
          <button className="btn btn--small" onClick={() => fileRef.current?.click()}>
            Restore from file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importData(f);
              e.target.value = "";
            }}
          />
          <button
            className="btn btn--small btn--danger"
            onClick={() => {
              if (confirm("Delete every vessel and record on this device? This cannot be undone without a backup file.")) replace(emptyState());
            }}
          >
            Delete all data
          </button>
        </div>
      </section>
    </>
  );
}

function CrewPanel({ state, update }: { state: KeelsonState; update: Update }) {
  const [draft, setDraft] = useState<Crew>({ id: "", name: "", role: "Deckhand", certs: [] });
  const setCrew = (id: string, patch: Partial<Crew>) => update((s) => ({ ...s, crew: s.crew.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

  return (
    <section className="panel">
      <h2>Crew</h2>
      {state.crew.length === 0 && <p className="muted">No crew yet. Add everyone who works on board, including yourself.</p>}
      <ul className="crew">
        {state.crew.map((c) => (
          <li key={c.id} className="crew__item">
            <div className="crew__top">
              <b>{c.name}</b>
              <span className="muted">{c.role}</span>
              <button className="btn btn--quiet btn--small" onClick={() => update((s) => ({ ...s, crew: s.crew.filter((x) => x.id !== c.id) }))}>
                Remove
              </button>
            </div>
            <div className="certs">
              {c.certs.map((cert, i) => (
                <div className="cert" key={i}>
                  <input
                    type="text"
                    aria-label="Certificate"
                    value={cert.name}
                    onChange={(e) => setCrew(c.id, { certs: c.certs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                  />
                  <input
                    type="date"
                    aria-label={`${cert.name || "Certificate"} expiry`}
                    value={cert.expires}
                    onChange={(e) => setCrew(c.id, { certs: c.certs.map((x, j) => (j === i ? { ...x, expires: e.target.value } : x)) })}
                  />
                  <button className="btn btn--quiet btn--small" aria-label={`Remove ${cert.name}`} onClick={() => setCrew(c.id, { certs: c.certs.filter((_, j) => j !== i) })}>
                    Remove
                  </button>
                </div>
              ))}
              <button className="btn btn--small" onClick={() => setCrew(c.id, { certs: [...c.certs, { name: "", expires: "" }] })}>
                Add certificate
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="crew__add"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.name.trim()) return;
          update((s) => ({ ...s, crew: [...s.crew, { ...draft, id: uid() }] }));
          setDraft({ id: "", name: "", role: "Deckhand", certs: [] });
        }}
      >
        <label className="field">
          <span>Name</span>
          <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label className="field">
          <span>Role</span>
          <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
            {["Master", "Mate", "Deckhand", "Engineer", "Guide", "Diver"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <button className="btn btn--small" type="submit" disabled={!draft.name.trim()}>
          Add crew member
        </button>
      </form>
    </section>
  );
}

/* ── Hazards ───────────────────────────────────────────────────────── */

function Scale({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <fieldset className="scale">
      <legend>{label}</legend>
      <div className="scale__row">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="scale__opt">
            <input type="radio" checked={value === n} onChange={() => onChange(n)} />
            <span>{n}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Hazards({ vessel, update }: { vessel: Vessel; update: Update }) {
  const setHazards = (hazards: Hazard[]) => update((s) => ({ ...s, vessels: s.vessels.map((v) => (v.id === vessel.id ? { ...v, hazards } : v)) }));
  const setH = (id: string, patch: Partial<Hazard>) => setHazards(vessel.hazards.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  const sorted = [...vessel.hazards].sort((a, b) => b.likelihood * b.severity - a.likelihood * a.severity);
  const unused = forActivities(hazardLibrary, vessel.activities).filter((t) => !vessel.hazards.some((h) => h.key === t.key));

  return (
    <>
      <div className="screen__head">
        <h1 className="screen__h1">Hazard register</h1>
        <p className="muted">Highest risk first. Rate each hazard for this boat and say how you control it.</p>
      </div>
      <ul className="hazards">
        {sorted.map((h) => {
          const s = h.likelihood * h.severity;
          const lvl = riskLevel(s);
          return (
            <li key={h.id}>
              <details className="hz-item">
                <summary>
                  <span className="hz-item__title">{h.title}</span>
                  <span className={`mark ${lvl === "High" ? "mark--overdue" : lvl === "Medium" ? "mark--soon" : "mark--ok"}`}>
                    {lvl} · {s}
                  </span>
                </summary>
                <div className="hz-item__body">
                  <label className="field">
                    <span>Hazard</span>
                    <input type="text" value={h.title} onChange={(e) => setH(h.id, { title: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>What could happen</span>
                    <textarea rows={2} value={h.description} onChange={(e) => setH(h.id, { description: e.target.value })} />
                  </label>
                  <div className="scales">
                    <Scale label="Likelihood" value={h.likelihood} onChange={(n) => setH(h.id, { likelihood: n })} />
                    <Scale label="Severity" value={h.severity} onChange={(n) => setH(h.id, { severity: n })} />
                  </div>
                  <label className="field">
                    <span>Controls, one per line</span>
                    <textarea
                      rows={Math.max(3, h.controls.length + 1)}
                      value={h.controls.join("\n")}
                      onChange={(e) => setH(h.id, { controls: e.target.value.split("\n") })}
                      onBlur={(e) => setH(h.id, { controls: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
                    />
                  </label>
                  <button className="btn btn--quiet btn--small" onClick={() => setHazards(vessel.hazards.filter((x) => x.id !== h.id))}>
                    Remove this hazard
                  </button>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      <div className="actions">
        <button
          className="btn"
          onClick={() =>
            setHazards([
              ...vessel.hazards,
              { id: uid(), title: "New hazard", description: "", likelihood: 3, severity: 3, controls: [] },
            ])
          }
        >
          Add a hazard
        </button>
        {unused.length > 0 && (
          <button
            className="btn btn--quiet"
            onClick={() =>
              setHazards([
                ...vessel.hazards,
                ...unused.map((t) => ({ id: uid(), key: t.key, title: t.title, description: t.description, likelihood: t.likelihood, severity: t.severity, controls: [...t.controls] })),
              ])
            }
          >
            Restore {unused.length} suggested hazard{unused.length === 1 ? "" : "s"}
          </button>
        )}
      </div>
    </>
  );
}

/* ── Manual ────────────────────────────────────────────────────────── */

function ManualScreen({ state, vessel, update }: { state: KeelsonState; vessel: Vessel; update: Update }) {
  const [note, setNote] = useState("");
  const [by, setBy] = useState(state.company.shipManager);
  const next = (state.revisions[state.revisions.length - 1]?.rev ?? 0) + 1;

  return (
    <>
      <div className="screen__head no-print">
        <h1 className="screen__h1">SMS manual</h1>
        <p className="muted">Built from your answers, crew and hazard register. Edit those and the manual follows.</p>
      </div>
      <section className="panel no-print">
        <h2>{next === 1 ? "Issue revision 1" : `Issue revision ${next}`}</h2>
        <p className="muted">
          {next === 1
            ? "When you have read the draft and it matches how this vessel works, issue it. Then print it for the boat."
            : "Changed something? Issue a new revision so the record shows what changed, then replace the copy on board."}
        </p>
        <form
          className="form-grid form-grid--rev"
          onSubmit={(e) => {
            e.preventDefault();
            if (!by.trim()) return;
            update((s) => ({ ...s, revisions: [...s.revisions, { rev: next, date: today(), by: by.trim(), note: note.trim() || (next === 1 ? "First issue" : "Revised") }] }));
            setNote("");
          }}
        >
          <label className="field">
            <span>Issued by</span>
            <input type="text" value={by} onChange={(e) => setBy(e.target.value)} />
          </label>
          <label className="field">
            <span>What changed</span>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={next === 1 ? "First issue" : "e.g. Added towing procedures"} />
          </label>
          <button className="btn btn--ink" type="submit" disabled={!by.trim()}>
            Issue rev {next}
          </button>
        </form>
        <div className="actions">
          <button className="btn btn--small" onClick={() => window.print()}>
            Print or save as PDF
          </button>
        </div>
      </section>
      <Manual state={state} vessel={vessel} />
    </>
  );
}

/* ── Records ───────────────────────────────────────────────────────── */

function Records({
  state,
  vessel,
  update,
  intent,
  clearIntent,
}: {
  state: KeelsonState;
  vessel: Vessel;
  update: Update;
  intent: { kind: RecordKind; preset?: string } | null;
  clearIntent: () => void;
}) {
  const [kind, setKind] = useState<RecordKind>(intent?.kind ?? "drill");
  const [open, setOpen] = useState<boolean>(!!intent);
  const [preset, setPreset] = useState<string | undefined>(intent?.preset);

  useEffect(() => {
    if (intent) {
      setKind(intent.kind);
      setPreset(intent.preset);
      setOpen(true);
      clearIntent();
    }
  }, [intent, clearIntent]);

  const list = state.records.filter((r) => r.vesselId === vessel.id && r.kind === kind).sort((a, b) => b.date.localeCompare(a.date));

  const save = (r: LogRecord) => {
    update((s) => ({ ...s, records: [...s.records, r] }));
    setOpen(false);
    setPreset(undefined);
  };

  return (
    <>
      <div className="screen__head no-print">
        <h1 className="screen__h1">Records</h1>
        <p className="muted">Kept on this device for at least 5 years. Print any list for the binder.</p>
      </div>
      <div className="seg no-print" role="tablist" aria-label="Record type">
        {(Object.keys(kindLabels) as RecordKind[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            className="seg__btn"
            onClick={() => {
              setKind(k);
              setOpen(false);
            }}
          >
            {kindLabels[k]}
          </button>
        ))}
      </div>

      <div className="actions no-print">
        {!open && (
          <button className="btn btn--ink" onClick={() => setOpen(true)}>
            New {kindLabels[kind].toLowerCase().replace(/s$/, "")} record
          </button>
        )}
        {list.length > 0 && (
          <button className="btn btn--small" onClick={() => window.print()}>
            Print this list
          </button>
        )}
      </div>

      {open && <RecordForm key={kind + (preset ?? "")} kind={kind} preset={preset} state={state} vessel={vessel} onSave={save} onCancel={() => setOpen(false)} />}

      <section className="records" aria-label={kindLabels[kind]}>
        <h2 className="print-only">
          {vessel.name} · {kindLabels[kind]}
        </h2>
        {list.length === 0 && !open && <p className="empty">No {kindLabels[kind].toLowerCase()} recorded yet.</p>}
        {list.map((r) => (
          <article key={r.id} className="rec">
            <header className="rec__head">
              <time dateTime={r.date}>{formatDate(r.date)}</time>
              <b>{r.title}</b>
              {r.kind === "incident" && <span className={`mark ${r.closed ? "mark--ok" : "mark--soon"}`}>{r.closed ? "Closed" : "Open"}</span>}
            </header>
            {r.people && <p>
                <span className="muted">People:</span> {r.people}
              </p>}
            {r.items && (
              <ul className="rec__items">
                {r.items.map((it) => (
                  <li key={it.label} className={it.ok ? "ok" : "no"}>
                    <span className="tick" aria-hidden="true" />
                    <span className="sr">{it.ok ? "Done: " : "Not done: "}</span>
                    {it.label}
                  </li>
                ))}
              </ul>
            )}
            {r.notes && <p>{r.notes}</p>}
            {r.kind === "incident" && (
              <dl className="rec__nc">
                {r.ncType && (
                  <>
                    <dt>Type</dt>
                    <dd>{r.ncType}</dd>
                  </>
                )}
                {r.section && (
                  <>
                    <dt>Manual section</dt>
                    <dd>{r.section}</dd>
                  </>
                )}
                {r.rootCause && (
                  <>
                    <dt>Root cause</dt>
                    <dd>{r.rootCause}</dd>
                  </>
                )}
                {r.correction && (
                  <>
                    <dt>Correction</dt>
                    <dd>{r.correction}</dd>
                  </>
                )}
              </dl>
            )}
            <footer className="rec__foot">
              <span>Signed: {r.signedBy || "—"}</span>
              <span className="no-print rec__btns">
                {r.kind === "incident" && !r.closed && (
                  <button
                    className="btn btn--small"
                    onClick={() => update((s) => ({ ...s, records: s.records.map((x) => (x.id === r.id ? { ...x, closed: true } : x)) }))}
                  >
                    Mark closed
                  </button>
                )}
                <button
                  className="btn btn--quiet btn--small"
                  onClick={() => {
                    if (confirm("Delete this record?")) update((s) => ({ ...s, records: s.records.filter((x) => x.id !== r.id) }));
                  }}
                >
                  Delete
                </button>
              </span>
            </footer>
          </article>
        ))}
      </section>
    </>
  );
}

function RecordForm({
  kind,
  preset,
  state,
  vessel,
  onSave,
  onCancel,
}: {
  kind: RecordKind;
  preset?: string;
  state: KeelsonState;
  vessel: Vessel;
  onSave: (r: LogRecord) => void;
  onCancel: () => void;
}) {
  const initialItems = kind === "check" ? predepartureChecklist : kind === "review" ? reviewChecklist : kind === "familiarization" ? ["Safety equipment locations", "Emergency procedures", "Duties and authority", "Read this SMS manual"] : [];
  const [r, setR] = useState<LogRecord>({
    id: uid(),
    vesselId: vessel.id,
    kind,
    date: today(),
    title:
      preset ??
      (kind === "drill" ? drillTypes[0].label : kind === "familiarization" ? (state.crew[0]?.name ?? "") : kind === "check" ? "Pre-departure check" : kind === "review" ? "Annual internal review" : ""),
    people: "",
    notes: "",
    signedBy: state.company.shipManager,
    ncType: kind === "incident" ? "Near miss" : undefined,
    closed: kind === "incident" ? false : undefined,
    items: initialItems.length ? initialItems.map((label) => ({ label, ok: false })) : undefined,
  });
  const set = (patch: Partial<LogRecord>) => setR((p) => ({ ...p, ...patch }));
  const valid = r.title.trim() && r.date && r.signedBy.trim();
  const titleLabel = kind === "drill" ? "Drill" : kind === "familiarization" ? "Crew member" : kind === "incident" ? "What happened, in a line" : kind === "maintenance" ? "Item or system" : "Title";

  return (
    <form
      className="panel recform"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ ...r, title: r.title.trim() });
      }}
    >
      <h2>New {kindLabels[kind].toLowerCase().replace(/s$/, "")} record</h2>
      <div className="form-grid">
        <label className="field">
          <span>Date</span>
          <input type="date" value={r.date} onChange={(e) => set({ date: e.target.value })} required />
        </label>
        {kind === "drill" ? (
          <label className="field">
            <span>{titleLabel}</span>
            <select value={r.title} onChange={(e) => set({ title: e.target.value })}>
              {drillTypes.map((d) => (
                <option key={d.key}>{d.label}</option>
              ))}
            </select>
          </label>
        ) : kind === "familiarization" && state.crew.length > 0 ? (
          <label className="field">
            <span>{titleLabel}</span>
            <select value={r.title} onChange={(e) => set({ title: e.target.value })}>
              {state.crew.map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <label className="field">
            <span>{titleLabel}</span>
            <input type="text" value={r.title} onChange={(e) => set({ title: e.target.value })} required />
          </label>
        )}
      </div>

      {kind === "incident" && (
        <fieldset className="q">
          <legend>Type</legend>
          <div className="choices">
            {["Near miss", "Injury", "Damage", "Pollution", "Non-conformity"].map((t) => (
              <label className="choice" key={t}>
                <input type="radio" name="nc" checked={r.ncType === t} onChange={() => set({ ncType: t })} />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {r.items && (
        <fieldset className="q">
          <legend>{kind === "check" ? "Checked" : kind === "review" ? "Reviewed" : "Shown"}</legend>
          <div className="checks">
            {r.items.map((it, i) => (
              <label key={it.label} className="act act--row">
                <input type="checkbox" checked={it.ok} onChange={() => set({ items: r.items!.map((x, j) => (j === i ? { ...x, ok: !x.ok } : x)) })} />
                <span className="act__box" aria-hidden="true" />
                <span>{it.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {kind !== "check" && (
        <label className="field">
          <span>{kind === "familiarization" ? "Shown by" : "People involved"}</span>
          <input type="text" value={r.people} onChange={(e) => set({ people: e.target.value })} placeholder={state.crew.map((c) => c.name).slice(0, 2).join(", ")} />
        </label>
      )}

      <label className="field">
        <span>{kind === "drill" ? "How it went and what to improve" : kind === "incident" ? "Description" : "Notes"}</span>
        <textarea value={r.notes} onChange={(e) => set({ notes: e.target.value })} />
      </label>

      {kind === "incident" && (
        <>
          <label className="field">
            <span>Manual section involved</span>
            <input type="text" value={r.section ?? ""} onChange={(e) => set({ section: e.target.value })} placeholder="e.g. Operating procedures: lookout" />
          </label>
          <label className="field">
            <span>Root cause</span>
            <textarea rows={2} value={r.rootCause ?? ""} onChange={(e) => set({ rootCause: e.target.value })} />
          </label>
          <label className="field">
            <span>Correction</span>
            <textarea rows={2} value={r.correction ?? ""} onChange={(e) => set({ correction: e.target.value })} />
          </label>
          <p className="muted small">Report marine occurrences to the TSB and Transport Canada as the regulations require. This log does not do that for you.</p>
        </>
      )}

      <label className="field">
        <span>Signed by</span>
        <input type="text" value={r.signedBy} onChange={(e) => set({ signedBy: e.target.value })} required />
      </label>
      <div className="actions">
        <button className="btn btn--ink" type="submit" disabled={!valid}>
          Save record
        </button>
        <button className="btn btn--quiet" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

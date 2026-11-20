"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { classify, daysUntil, defaultAnswers, FinderAnswers, CLASS5_DEADLINE } from "@/lib/classify";
import VesselDrawing, { calloutText, kindForUse } from "./VesselDrawing";

type Opt<T extends string> = { value: T; label: string };

function Choice<T extends string>({
  name,
  value,
  options,
  onChange,
  legend,
}: {
  name: string;
  value: T;
  options: Opt<T>[];
  onChange: (v: T) => void;
  legend: string;
}) {
  return (
    <fieldset className="q">
      <legend>{legend}</legend>
      <div className="choices">
        {options.map((o) => (
          <label className="choice" key={o.value}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function Hero() {
  const [a, setA] = useState<FinderAnswers>(defaultAnswers);
  const [days, setDays] = useState<number | null>(null);
  const r = useMemo(() => classify(a), [a]);
  const kind = kindForUse(a.use);
  const set = <K extends keyof FinderAnswers>(k: K, v: FinderAnswers[K]) => setA((p) => ({ ...p, [k]: v }));

  useEffect(() => setDays(daysUntil(CLASS5_DEADLINE)), []);

  const statusMark =
    r.status === "due" ? (
      <span className="mark mark--soon">Due</span>
    ) : r.status === "passed" ? (
      <span className="mark mark--overdue">In force now</span>
    ) : r.status === "excluded" ? (
      <span className="mark mark--ok">Not covered</span>
    ) : (
      <span className="mark mark--info">Large vessel</span>
    );

  const typeName = a.use === "passenger" ? "Passenger vessel" : a.use === "tug" ? "Tug / towboat" : a.use === "fishing" ? "Fishing vessel" : a.use === "pleasure" ? "Pleasure craft" : "Workboat";

  return (
    <section className="hero" aria-labelledby="hero-h">
      <div className="wrap hero__sheet">
        <div className="zones zones--top" aria-hidden="true">
          {["1", "2", "3", "4", "5", "6"].map((z) => (
            <span key={z}>{z}</span>
          ))}
        </div>
        <div className="zones zones--side" aria-hidden="true">
          {["A", "B", "C"].map((z) => (
            <span key={z}>{z}</span>
          ))}
        </div>

        <div className="hero__grid">
          <div className="hero__copy">
            <h1 id="hero-h">Your boat’s safety management system, drawn up and kept.</h1>
            <div className="hero__strip" aria-hidden="true">
              <VesselDrawing kind={kind} compact />
            </div>
            <p className="lead">
              Transport Canada now requires a documented SMS on most small commercial vessels. Keelson asks plain questions, drafts the manual, and
              keeps the records on your phone, even with no signal.
            </p>

            <form className="finder" onSubmit={(e) => e.preventDefault()} aria-describedby="finder-result">
              <h2 className="finder__h">Find your class and deadline</h2>
              <Choice
                legend="What does the vessel do?"
                name="use"
                value={a.use}
                onChange={(v) => set("use", v)}
                options={[
                  { value: "work", label: "Work" },
                  { value: "passenger", label: "Carries passengers" },
                  { value: "tug", label: "Tows or pushes" },
                  { value: "fishing", label: "Commercial fishing" },
                  { value: "pleasure", label: "Pleasure only" },
                ]}
              />
              {a.use !== "pleasure" && (
                <Choice
                  legend="Gross tonnage"
                  name="gt"
                  value={a.tonnage}
                  onChange={(v) => set("tonnage", v)}
                  options={[
                    { value: "small", label: "15 GT or less" },
                    { value: "large", label: "More than 15 GT" },
                  ]}
                />
              )}
              {a.use !== "pleasure" && a.tonnage === "large" && (
                <Choice
                  legend="Length"
                  name="len"
                  value={a.length}
                  onChange={(v) => set("length", v)}
                  options={[
                    { value: "under24", label: "Under 24 m" },
                    { value: "over24", label: "24 m or more" },
                  ]}
                />
              )}
              {a.use === "passenger" && a.tonnage === "small" && (
                <Choice
                  legend="Passengers carried"
                  name="pax"
                  value={a.pax}
                  onChange={(v) => set("pax", v)}
                  options={[
                    { value: "upTo12", label: "12 or fewer" },
                    { value: "over12", label: "More than 12" },
                  ]}
                />
              )}
              <p className="finder__hint">Boats on the Small Vessel Register are 15 GT or less.</p>

              <div className="result" id="finder-result" aria-live="polite">
                <div className="result__head">
                  <strong className="result__class">{r.classLabel}</strong>
                  {statusMark}
                </div>
                <p className="result__line">{r.headline}</p>
                <p className="result__deadline">
                  {r.deadlineText}
                  {r.status === "due" && days !== null && (
                    <>
                      {" "}
                      · <b>{days} days left</b>
                    </>
                  )}
                </p>
                <ul className="result__needs">
                  {r.needs.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                {r.note && <p className="result__note">{r.note}</p>}
              </div>

              <div className="finder__actions">
                <Link className="btn btn--ink" href="/app/">
                  Start my draft
                  <svg className="arrow" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </Link>
                <span className="muted finder__free">Free to build. No account needed.</span>
              </div>
            </form>
          </div>

          <figure className="hero__plan">
            <VesselDrawing kind={kind} />
            <ol className="legend">
              {calloutText[kind].map((t, i) => (
                <li key={t}>
                  <span className="balloon">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
            <div className="tb" role="group" aria-label="Drawing title block">
              <div className="tb__row">
                <div className="tb__cell">
                  <span className="label">Drawing</span>
                  <span className="tb__val">Safety plan &amp; SMS</span>
                </div>
                <div className="tb__cell">
                  <span className="label">Vessel</span>
                  <span className="tb__val">{typeName}</span>
                </div>
              </div>
              <div className="tb__row">
                <div className="tb__cell">
                  <span className="label">Class</span>
                  <span className="tb__val tb__val--big">{r.classLabel.replace("Class ", "") || "—"}</span>
                </div>
                <div className="tb__cell">
                  <span className="label">Deadline</span>
                  <span className="tb__val tb__val--big">{r.status === "due" ? "2027-07-02" : r.status === "passed" ? "Passed" : "—"}</span>
                </div>
                <div className="tb__cell">
                  <span className="label">Days left</span>
                  <span className="tb__val tb__val--big">{r.status === "due" && days !== null ? days : "—"}</span>
                </div>
              </div>
              <div className="tb__row">
                <div className="tb__cell">
                  <span className="label">Ref.</span>
                  <span className="tb__val">SOR/2024-133 · TP 15566</span>
                </div>
                <div className="tb__cell">
                  <span className="label">Rev.</span>
                  <span className="tb__val">Draft</span>
                </div>
              </div>
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}

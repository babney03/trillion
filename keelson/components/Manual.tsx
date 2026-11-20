import { KeelsonState, Vessel, formatDate } from "@/lib/store";
import { emergencyProcedures, operatingProcedures, forActivities, riskLevel, drillTypes, activities } from "@/lib/library";
import { classify, FinderAnswers } from "@/lib/classify";

export function answersFor(v: Vessel): FinderAnswers {
  const gt = parseFloat(v.grossTonnage);
  const len = parseFloat(v.lengthM);
  const persons = parseInt(v.maxPersons, 10);
  return {
    use: v.type === "passenger" ? "passenger" : v.type === "tug" ? "tug" : "work",
    tonnage: !isNaN(gt) && gt > 15 ? "large" : "small",
    length: !isNaN(len) && len >= 24 ? "over24" : "under24",
    pax: !isNaN(persons) && persons > 12 ? "over12" : "upTo12",
    size7: !isNaN(len) && len <= 7 ? "upTo7" : "over7",
    registeredBefore: true,
  };
}

export function vesselClass(v: Vessel) {
  return classify(answersFor(v));
}

function Blank({ v, hint }: { v: string; hint: string }) {
  return v ? <>{v}</> : <span className="blank">{hint}</span>;
}

export default function Manual({ state, vessel }: { state: KeelsonState; vessel: Vessel }) {
  const c = state.company;
  const cls = vesselClass(vessel);
  const ops = forActivities(operatingProcedures, vessel.activities);
  const ems = forActivities(emergencyProcedures, vessel.activities);
  const rev = state.revisions[state.revisions.length - 1];
  const actLabels = activities.filter((a) => vessel.activities.includes(a.key)).map((a) => a.label.toLowerCase());
  const drills = drillTypes.filter((d) => d.key !== "passengers" || vessel.activities.includes("passengers") || vessel.activities.includes("fishingGuests"));
  let n = 0;
  const sec = () => ++n;

  return (
    <article className="doc" aria-label="Safety management system manual">
      <header className="doc__cover">
        <div>
          <h1>Safety Management System</h1>
          <p className="doc__vessel">
            <Blank v={vessel.name} hint="Vessel name" /> · <Blank v={vessel.officialNumber} hint="Official number" />
          </p>
        </div>
        <div className="tb doc__tb">
          <div className="tb__row">
            <div className="tb__cell">
              <span className="label">Ship manager</span>
              <span className="tb__val">
                <Blank v={c.shipManager} hint="Name" />
              </span>
            </div>
            <div className="tb__cell">
              <span className="label">Class</span>
              <span className="tb__val">{cls.classLabel}</span>
            </div>
          </div>
          <div className="tb__row">
            <div className="tb__cell">
              <span className="label">Revision</span>
              <span className="tb__val">{rev ? `${rev.rev} · ${formatDate(rev.date)}` : "Draft, not issued"}</span>
            </div>
            <div className="tb__cell">
              <span className="label">Ref.</span>
              <span className="tb__val">SOR/2024-133 · TP 15566</span>
            </div>
          </div>
        </div>
      </header>

      {!rev && (
        <p className="doc__draft">
          Draft. Read every section, change what does not match how this vessel works, then issue revision 1. You are responsible for the final content.
        </p>
      )}

      <section>
        <h2>
          {sec()}. Ship manager and vessel
        </h2>
        <table className="kv">
          <tbody>
            <tr>
              <th>Company</th>
              <td>
                <Blank v={c.name} hint="Company or owner name" />
                {c.address && `, ${c.address}`}
              </td>
            </tr>
            <tr>
              <th>Ship manager</th>
              <td>
                <Blank v={c.shipManager} hint="Name" /> · <Blank v={c.phone} hint="Phone" /> · <Blank v={c.email} hint="Email" />
              </td>
            </tr>
            <tr>
              <th>Designated person ashore</th>
              <td>{c.dpa || "Not appointed (recommended for this class, not required)"}</td>
            </tr>
            <tr>
              <th>Vessel</th>
              <td>
                <Blank v={vessel.name} hint="Name" />, official number <Blank v={vessel.officialNumber} hint="C00000BC" />
              </td>
            </tr>
            <tr>
              <th>Particulars</th>
              <td>
                Length <Blank v={vessel.lengthM} hint="—" /> m · <Blank v={vessel.grossTonnage} hint="—" /> GT · up to <Blank v={vessel.maxPersons} hint="—" />{" "}
                persons
              </td>
            </tr>
            <tr>
              <th>Home port</th>
              <td>
                <Blank v={vessel.homePort} hint="Home port" />
              </td>
            </tr>
            <tr>
              <th>Operations</th>
              <td>
                {vessel.area}. {vessel.season}.{actLabels.length > 0 && ` Work includes ${actLabels.join(", ")}.`}
              </td>
            </tr>
            <tr>
              <th>Weather limits</th>
              <td>{vessel.weatherLimits}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>
          {sec()}. Safety and environmental protection policy
        </h2>
        <p className="doc__policy">{c.policy}</p>
        <p className="sig">
          Signed: ______________________ <Blank v={c.shipManager} hint="Ship manager" />, ship manager
        </p>
      </section>

      <section>
        <h2>
          {sec()}. Crew, authority and communication
        </h2>
        <p>
          The ship manager is responsible for this system and for giving the master and crew what they need to follow it. The master has overriding
          authority on board for safety and pollution prevention, including the authority to refuse a trip, stop work or return to port.
        </p>
        {state.crew.length > 0 ? (
          <table className="grid">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Certificates</th>
              </tr>
            </thead>
            <tbody>
              {state.crew.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.role}</td>
                  <td>{p.certs.map((x) => (x.expires ? `${x.name} (exp. ${formatDate(x.expires)})` : x.name)).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="blank">Add crew in Boat → Crew.</p>
        )}
        <p>
          Communication on board is by voice and VHF radio. The ship manager and master speak before each trip outside the usual area and after any
          incident.
        </p>
      </section>

      <section>
        <h2>
          {sec()}. Hazard register
        </h2>
        <p>Risk = likelihood × severity, each from 1 (lowest) to 5 (highest). High is 12 or more; medium is 6 to 11.</p>
        <table className="grid hz">
          <thead>
            <tr>
              <th>Hazard</th>
              <th>Risk</th>
              <th>Controls</th>
            </tr>
          </thead>
          <tbody>
            {vessel.hazards.map((h) => {
              const s = h.likelihood * h.severity;
              return (
                <tr key={h.id}>
                  <td>
                    <b>{h.title}</b>
                    <br />
                    <span className="muted">{h.description}</span>
                  </td>
                  <td className="nowrap">
                    {h.likelihood}×{h.severity} = <b>{s}</b>
                    <br />
                    {riskLevel(s)}
                  </td>
                  <td>
                    <ul>
                      {h.controls.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2>
          {sec()}. Operating procedures
        </h2>
        {ops.map((p) => (
          <div className="proc" key={p.key}>
            <h3>{p.title}</h3>
            <ol>
              {p.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      <section>
        <h2>
          {sec()}. Emergency procedures
        </h2>
        <p>Every person on board must know where the safety equipment is and what to do in each emergency below.</p>
        {ems.map((p) => (
          <div className="proc" key={p.key}>
            <h3>{p.title}</h3>
            <ol>
              {p.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      <section>
        <h2>
          {sec()}. Drills and familiarization
        </h2>
        <p>
          Drills are held on a rotating schedule so that each one below is practised at least every {state.drillCycleMonths} months, at the start of
          each season, and when a new crew member joins. Each drill is recorded with the date, who took part and what was learned. Check the Marine
          Personnel Regulations for any drill frequency that applies to your vessel.
        </p>
        <ul>
          {drills.map((d) => (
            <li key={d.key}>{d.label}</li>
          ))}
        </ul>
        <p>
          Before a new crew member works on board, the master shows them the safety equipment, the emergency procedures and their duties. The crew
          member and the master sign the familiarization record.
        </p>
      </section>

      <section>
        <h2>
          {sec()}. Maintenance
        </h2>
        <p>
          The vessel, its machinery and its safety equipment are maintained to the maker’s schedules and kept in working order. Pre-departure checks
          are done before each trip. Defects are reported to the master, fixed before the vessel sails if they affect safety, and recorded with what
          was done.
        </p>
      </section>

      <section>
        <h2>
          {sec()}. Reporting casualties and non-conformities
        </h2>
        <p>
          Marine occurrences are reported to the Transportation Safety Board and Transport Canada as the regulations require. Any person can report a
          hazard, near miss, incident or failure to follow this system without blame.
        </p>
        <p>
          Each report records the type, date, section of this manual involved, a description, the root cause, the correction, and a signature. The
          ship manager follows each report until it is closed.
        </p>
      </section>

      <section>
        <h2>
          {sec()}. Internal review
        </h2>
        <p>
          The whole system is reviewed at least every 12 months, and after any serious incident. Where possible the review is done by someone other
          than the person who runs the area being reviewed. The review is recorded with findings and actions.
        </p>
      </section>

      <section>
        <h2>
          {sec()}. Document control and records
        </h2>
        <p>
          The current revision of this manual is kept on board. When it changes, the revision table is updated and old copies are removed from the
          vessel. The manual, review reports and records are kept for at least 5 years.
        </p>
        <table className="grid">
          <thead>
            <tr>
              <th>Rev</th>
              <th>Date</th>
              <th>By</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {state.revisions.length === 0 ? (
              <tr>
                <td colSpan={4} className="blank">
                  Not issued yet
                </td>
              </tr>
            ) : (
              state.revisions.map((r) => (
                <tr key={r.rev}>
                  <td>{r.rev}</td>
                  <td className="nowrap">{formatDate(r.date)}</td>
                  <td>{r.by}</td>
                  <td>{r.note}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <footer className="doc__foot">
        Prepared with Keelson. Based on Transport Canada TP 15566. This manual is the operator’s document; Keelson is not affiliated with Transport
        Canada.
      </footer>
    </article>
  );
}

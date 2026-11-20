import Link from "next/link";
import "./landing.css";
import Brand from "@/components/Brand";
import Hero from "@/components/Hero";

const manual: [string, string, string][] = [
  ["Ship manager and vessel particulars", "Who is responsible, how to reach them, the vessel and where it works", "2.2.4"],
  ["Safety and environmental protection policy", "A short policy in your words, with the master's authority to stop work", "2.2.4"],
  ["Crew, authority and communication", "Who does what on board and ashore, and how they talk", "3.3"],
  ["Hazard register", "Hazards for your boat and your work, each rated and controlled", "2.3"],
  ["Operating procedures", "Departure, navigation, radio, fuel, weather, rest, waste, lay-up, plus towing, lifting or passengers if you do them", "3.5"],
  ["Emergency procedures", "Person overboard, fire, flooding, abandon, collision, medical, and the ones your work adds", "3.8"],
  ["Drills and familiarization", "What to practise, how often, and how new crew are shown the boat", "3.3.4 · 3.5.6"],
  ["Maintenance", "Keeping the vessel and its equipment in working order, with records", "3.9"],
  ["Reporting", "Casualties to the TSB and Transport Canada; non-conformities with cause and correction", "3.6 · 3.7"],
  ["Internal review", "A check of the whole system at least every 12 months", "3.10"],
  ["Document control and records", "Revisions, removal of old copies, and 5 years of records", "3.11 · 1.11"],
];

function Arrow() {
  return (
    <svg className="arrow" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <header className="mast">
        <div className="wrap mast__in">
          <Brand />
          <nav aria-label="Sections">
            <a href="#rule">The rule</a>
            <a href="#how">How it works</a>
            <a href="#manual">The manual</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">Questions</a>
          </nav>
          <Link className="btn btn--small" href="/app/">
            Open the app
          </Link>
        </div>
      </header>

      <main>
        <Hero />

        <section className="sec" id="rule" aria-labelledby="rule-h">
          <div className="wrap">
            <div className="sec__head">
              <h2 id="rule-h">The rule, in plain words</h2>
              <p>
                The Marine Safety Management System Regulations reach far smaller boats than the old rules did. Here is what they ask of a small
                operator.
              </p>
            </div>
            <div className="notes">
              <ol>
                <li>
                  <span>
                    The regulations came into force on <b>July 3, 2024</b>, and require a documented safety management system on most Canadian
                    commercial vessels, small ones included.
                  </span>
                </li>
                <li>
                  <span>
                    <b>Class 5</b> vessels (15 GT or less, not carrying passengers, not towing) must have one by <b>July 2, 2027</b>. Grace periods for
                    Class 4 vessels, including small passenger boats and tugs, ended in 2025 and 2026.
                  </span>
                </li>
                <li>
                  <span>
                    A Class 5 vessel needs no certificate. It needs an up-to-date SMS manual on board and a named ship manager.
                  </span>
                </li>
                <li>
                  <span>
                    The system has to be used, not just written: drills, crew familiarization, incident and non-conformity reports, an internal review at
                    least every 12 months, and records kept for at least 5 years.
                  </span>
                </li>
                <li>
                  <span>
                    Transport Canada can check compliance at any time. Fines can reach <b>$250,000</b>.
                  </span>
                </li>
              </ol>
              <aside aria-labelledby="excl-h">
                <h3 id="excl-h">Who is left out</h3>
                <p>Fishing vessels up to 24.4 m and 150 GT, pleasure craft, human-powered boats, and unpowered vessels that carry no people, oil or chemicals.</p>
                <p>
                  A boat taking paying sport-fishing guests is a passenger vessel, not a fishing vessel.
                </p>
                <p className="fine">
                  Sources: Transport Canada,{" "}
                  <a href="https://tc.canada.ca/en/marine-transportation/vessel-inspection-certification/safety-management-systems-marine-sector">
                    Safety management systems in the marine sector
                  </a>{" "}
                  and{" "}
                  <a href="https://tc.canada.ca/en/marine-transportation/publications/tp-15566-guide-canadian-vessels-operators-compliance-marine-safety-management-system-regulations">
                    TP 15566
                  </a>
                  .
                </p>
              </aside>
            </div>
          </div>
        </section>

        <section className="sec" id="how" aria-labelledby="how-h">
          <div className="wrap">
            <div className="sec__head">
              <h2 id="how-h">From a few answers to a working system</h2>
              <p>You know your boat. Keelson knows what the guide asks for. Together that becomes a manual you can sign and a log you keep up as you work.</p>
            </div>
            <div className="stations">
              <div className="station">
                <span className="balloon">1</span>
                <h3>Answer</h3>
                <p>Tell it about the vessel, the crew and the work you do. Each activity brings the hazards and procedures that come with it.</p>
                <div className="frag" aria-hidden="true">
                  <span className="frag__tick">
                    <i className="on" />
                    Crew transfers
                  </span>
                  <span className="frag__tick">
                    <i className="on" />
                    Aquaculture work
                  </span>
                  <span className="frag__tick">
                    <i />
                    Towing or pushing
                  </span>
                  <span className="frag__tick">
                    <i className="on" />
                    Remote areas
                  </span>
                </div>
              </div>
              <div className="station">
                <span className="balloon">2</span>
                <h3>Draft</h3>
                <p>Keelson writes the manual around TP 15566: policy, hazards, procedures, emergencies, reporting and review. You edit anything, then issue it.</p>
                <div className="frag" aria-hidden="true">
                  <div className="frag__row">
                    <b>Vessel-to-structure transfers</b>
                    <span className="mark mark--overdue">High</span>
                  </div>
                  <div className="frag__row muted">
                    <span>Likelihood 3 × Severity 4</span>
                    <span className="score">12</span>
                  </div>
                  <table className="revtab">
                    <thead>
                      <tr>
                        <th>Rev</th>
                        <th>Date</th>
                        <th>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td>2027-01-14</td>
                        <td>First issue</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="station">
                <span className="balloon">3</span>
                <h3>Keep</h3>
                <p>Log drills, familiarization, checks and reports as they happen. Keelson shows what is due, and prints the lot for the binder or an inspector.</p>
                <div className="frag" aria-hidden="true">
                  <div className="steps12">
                    {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((m, i) => (
                      <span key={i} className={i === 0 || i === 3 || i === 6 ? "done" : i === 9 ? "next" : ""}>
                        {m}
                      </span>
                    ))}
                  </div>
                  <div className="frag__row">
                    <b>Fire drill</b>
                    <span className="mark mark--soon">Due in 18 days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec" id="manual" aria-labelledby="manual-h">
          <div className="wrap">
            <div className="sec__head">
              <h2 id="manual-h">What goes in your manual</h2>
              <p>Every section the TP 15566 guide lists as minimum content, filled in for your boat. Section numbers refer to the guide.</p>
            </div>
            <table className="schedule">
              <thead>
                <tr>
                  <th scope="col">Sec.</th>
                  <th scope="col">Contents</th>
                  <th scope="col">TP 15566</th>
                </tr>
              </thead>
              <tbody>
                {manual.map(([t, d, ref], i) => (
                  <tr key={t}>
                    <td>{i + 1}</td>
                    <td>
                      <b>{t}</b>
                      <span>{d}</span>
                    </td>
                    <td>{ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="sec" aria-labelledby="spec-h">
          <div className="wrap">
            <div className="sec__head">
              <h2 id="spec-h">Made for the deck, not the office</h2>
              <p>Most small operators do their paperwork on a phone, between trips. Keelson is built for that.</p>
            </div>
            <dl className="spec">
              <div>
                <dt>No signal</dt>
                <dd>Once opened, the app keeps working offline. Entries save on the device as you go.</dd>
              </div>
              <div>
                <dt>Sun and gloves</dt>
                <dd>Large type, high contrast and big targets. A low-glare night palette for the wheelhouse.</dd>
              </div>
              <div>
                <dt>Paper when you need it</dt>
                <dd>Print or save the manual and the records as a PDF for the binder on board.</dd>
              </div>
              <div>
                <dt>Your data</dt>
                <dd>Stays on your phone or computer. Export a backup file whenever you like.</dd>
              </div>
              <div>
                <dt>Plain words</dt>
                <dd>Written the way skippers talk, with the exact rule cited where it matters.</dd>
              </div>
              <div>
                <dt>Your call</dt>
                <dd>Everything Keelson drafts is yours to change. Nothing is issued until you sign it off.</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="sec" id="pricing" aria-labelledby="price-h">
          <div className="wrap">
            <div className="sec__head">
              <h2 id="price-h">Pricing</h2>
              <p>Build and preview for free. Pay per vessel when you issue your manual and start keeping records. Prices in Canadian dollars, before GST.</p>
            </div>
            <table className="prices">
              <tbody>
                <tr>
                  <td className="plan">Draft</td>
                  <td>Find your class, answer the questions, and preview your full manual.</td>
                  <td className="amt">
                    Free<small>no account</small>
                  </td>
                </tr>
                <tr className="feature">
                  <td className="plan">Keeper</td>
                  <td>Issue and print your manual, keep every record, get reminders for drills, crew and the annual review.</td>
                  <td className="amt">
                    $390<small>per vessel, per year</small>
                  </td>
                </tr>
                <tr>
                  <td className="plan">Fleet</td>
                  <td>Everything in Keeper for three or more vessels under one ship manager.</td>
                  <td className="amt">
                    $290<small>per vessel, per year</small>
                  </td>
                </tr>
                <tr>
                  <td className="plan">Set-up help</td>
                  <td>We tailor your system with you, by phone or at the dock on Vancouver Island.</td>
                  <td className="amt">
                    $490<small>once</small>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="sec" id="faq" aria-labelledby="faq-h">
          <div className="wrap">
            <div className="sec__head">
              <h2 id="faq-h">Questions skippers ask</h2>
            </div>
            <div className="faq">
              <details>
                <summary>Is Keelson approved by Transport Canada?</summary>
                <p>
                  No. Transport Canada does not approve or endorse SMS software or consultants. Keelson drafts your system around Transport Canada’s own
                  guide, TP 15566. You review it, adapt it to your boat and sign it off, and you remain responsible for compliance.
                </p>
              </details>
              <details>
                <summary>I run a fishing boat. Do I need this?</summary>
                <p>
                  Fishing vessels up to 24.4 m and 150 GT are excluded from these regulations. If you take paying sport-fishing guests, the boat is a
                  passenger vessel and is covered.
                </p>
              </details>
              <details>
                <summary>Do I need a certificate for a Class 5 vessel?</summary>
                <p>No. You need an up-to-date SMS manual on board, a named ship manager, and the records that show the system is in use.</p>
              </details>
              <details>
                <summary>Does it work without signal?</summary>
                <p>Yes. Once you have opened the app with signal, it keeps working offline and saves your entries on the device.</p>
              </details>
              <details>
                <summary>Where is my information kept?</summary>
                <p>On your phone or computer. Nothing is sent to us in this version. Export a backup file from the app and keep it somewhere safe.</p>
              </details>
              <details>
                <summary>What happens at an inspection?</summary>
                <p>
                  Show or print the manual and the records from the app: drills, familiarization, checks, incident reports and reviews, each with its date and
                  who signed it.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>

      <section className="close" aria-labelledby="close-h">
        <div className="wrap close__in">
          <div>
            <h2 id="close-h">Get your boat drawn up before July 2, 2027.</h2>
            <p>Start with the free draft. It takes your answers and turns them into a manual you can read tonight.</p>
          </div>
          <Link className="btn" href="/app/">
            Start my draft
            <Arrow />
          </Link>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap foot__in">
          <p>
            Keelson is an independent product. It is not affiliated with or endorsed by Transport Canada. Content is general guidance, not legal advice.
          </p>
          <p>
            Regulation: <a href="https://laws-lois.justice.gc.ca/eng/regulations/SOR-2024-133/FullText.html">Marine Safety Management System Regulations, SOR/2024-133</a>
          </p>
        </div>
      </footer>
    </>
  );
}

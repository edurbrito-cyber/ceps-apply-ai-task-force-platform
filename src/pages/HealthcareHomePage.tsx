import { PlatformFooter, TrackHero } from "./PlatformPageParts";

const contacts = [
  ["Susana Aires", "Researcher", "susana.airesgomes@ceps.eu"],
  ["Nicoleta Kyosovska", "Research Assistant", "nicoleta.kyosovska@ceps.eu"],
  ["Hannah Macdonald", "Researcher", "hannah.macdonald@ceps.eu"],
  ["Petra Varkonyi", "Research Assistant", "petra.varkonyi@ceps.eu"]
];

export default function HealthcareHomePage() {
  return (
    <>
      <main>
        <TrackHero
          backHref="#/"
          backLabel="All tracks"
          eyebrow="Track 1"
          title="Healthcare and Pharmaceuticals"
          description="Welcome to the CEPS Apply AI Task Force workspace for Healthcare and Pharmaceuticals. It gathers relevant materials in one place and supports participation through asynchronous feedback."
        />
        <section className="resource-grid healthcare-links">
          <a href="#/healthcare/session-materials" className="resource-card"><span>01</span><h2>Session Materials</h2><p>Briefings, agendas, notes and presentations.</p></a>
          <a href="#/healthcare/use-cases" className="resource-card featured"><span>02</span><h2>Use Cases</h2><p>AI uptake, enablers, challenges and impact across five healthcare areas.</p></a>
          <a href="#/healthcare/defining-success" className="resource-card"><span>03</span><h2>Defining Success</h2><p>A shared framework for outcomes and measures, currently in development.</p></a>
          <a href="#/healthcare/resources" className="resource-card"><span>04</span><h2>Additional Resources</h2><p>Supporting publications and materials from the Task Force.</p></a>
        </section>
        <section className="timeline-section" data-annotation-container="healthcare:timeline">
          <p className="platform-eyebrow">Task Force timeline</p>
          <h2>Three sessions, one developing body of work</h2>
          <ol>
            <li><b>10 June 2026</b><span>Session 1</span></li>
            <li><b>Forthcoming</b><span>Session 2</span></li>
            <li><b>Forthcoming</b><span>Session 3</span></li>
          </ol>
        </section>
        <section className="contact-section" data-annotation-container="healthcare:contacts">
          <p className="platform-eyebrow">Get in touch</p>
          <h2>Healthcare track rapporteurs</h2>
          <p>For comments or questions, contact the Task Force team.</p>
          <div>
            {contacts.map(([name, role, email]) => (
              <a href={`mailto:${email}`} key={email}><b>{name}</b><span>{role}</span><small>{email}</small></a>
            ))}
          </div>
        </section>
      </main>
      <PlatformFooter />
    </>
  );
}

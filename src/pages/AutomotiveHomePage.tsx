import { PlatformFooter, TrackHero } from "./PlatformPageParts";

export default function AutomotiveHomePage() {
  return (
    <>
      <main>
        <TrackHero
          backHref="#/"
          backLabel="All tracks"
          eyebrow="Track 2"
          title="Automotive, Transport and Mobility"
          description="Explore the Task Force's evidence, deliberation tools and meeting materials on autonomous mobility in Europe."
        />
        <section className="resource-grid">
          <a href="#/automotive/speedometer" className="resource-card featured">
            <span>Interactive output</span><h2>Autonomous Mobility Speedometer</h2>
            <p>Explore the 0-100 headline index, its 0-10 channel assessments and foresight pathways.</p>
          </a>
          <a href="#/automotive/session-materials" className="resource-card">
            <span>Task Force sessions</span><h2>Session materials</h2>
            <p>Access agendas, briefings, meeting notes and presentations as they are published.</p>
          </a>
          <article className="resource-card pending">
            <span>Developing output</span><h2>Meeting synthesis</h2>
            <p>Cross-session conclusions and recommendations will be added here.</p>
          </article>
          <article className="resource-card pending">
            <span>Resources</span><h2>Evidence and references</h2>
            <p>Supporting reports, policy documents and relevant external resources.</p>
          </article>
        </section>
      </main>
      <PlatformFooter />
    </>
  );
}

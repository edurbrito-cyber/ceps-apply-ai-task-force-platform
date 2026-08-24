import { PlatformFooter, TrackHero } from "./PlatformPageParts";

export default function HealthcareSuccessPage() {
  return (
    <>
      <main className="platform-content">
        <TrackHero
          backHref="#/healthcare"
          backLabel="Healthcare track"
          eyebrow="Track 1 output"
          title="Defining Success"
          description="This Task Force output is being defined and will develop through participant input."
        />
        <section className="placeholder-section">
          <span>Framework in development</span>
          <h2>What should successful AI adoption achieve?</h2>
          <p>Participants can use page comments to propose outcomes, indicators and safeguards.</p>
        </section>
      </main>
      <PlatformFooter />
    </>
  );
}

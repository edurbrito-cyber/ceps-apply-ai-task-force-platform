import { PlatformFooter, TrackHero } from "./PlatformPageParts";

export default function HealthcareResourcesPage() {
  return (
    <>
      <main className="platform-content">
        <TrackHero
          backHref="#/healthcare"
          backLabel="Healthcare track"
          eyebrow="Track 1 output"
          title="Additional Resources"
          description="Healthcare and pharmaceutical publications, presentations and supporting materials will be gathered here."
        />
        <section className="placeholder-section">
          <span>Resource library in preparation</span>
          <h2>Materials will be added as they are approved</h2>
          <p>The page structure is ready for the Track 1 resource list.</p>
        </section>
      </main>
      <PlatformFooter />
    </>
  );
}

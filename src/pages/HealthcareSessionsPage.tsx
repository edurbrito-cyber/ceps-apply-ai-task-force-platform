import { PlatformFooter, SessionCards, TrackHero } from "./PlatformPageParts";

export default function HealthcareSessionsPage() {
  return (
    <>
      <main className="platform-content">
        <TrackHero
          backHref="#/healthcare"
          backLabel="Healthcare track"
          eyebrow="Track 1 materials"
          title="Session materials"
          description="Each session will bring together its briefing, agenda, notes, key points and speaker presentations."
        />
        <SessionCards track="healthcare" />
      </main>
      <PlatformFooter />
    </>
  );
}

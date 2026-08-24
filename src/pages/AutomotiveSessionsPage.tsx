import { PlatformFooter, SessionCards, TrackHero } from "./PlatformPageParts";

export default function AutomotiveSessionsPage() {
  return (
    <>
      <main className="platform-content">
        <TrackHero
          backHref="#/automotive"
          backLabel="Automotive track"
          eyebrow="Track 2 materials"
          title="Task Force sessions"
          description="Briefings, notes, key points and presentations from each Automotive track session."
        />
        <SessionCards track="automotive" />
      </main>
      <PlatformFooter />
    </>
  );
}

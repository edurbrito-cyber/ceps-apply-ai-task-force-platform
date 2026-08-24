import { PlatformFooter } from "./PlatformPageParts";

type TrackId = "automotive" | "healthcare";

function TrackCard({
  track,
  title,
  description,
  enabled
}: {
  track: TrackId;
  title: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <article className={`track-card ${track}`}>
      <span>{track === "automotive" ? "Track 2" : "Track 1"}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <a href={`#/${track}`} className={`platform-button${enabled ? "" : " secondary"}`}>
        {enabled ? "Enter track" : "Sign in for access"}
      </a>
    </article>
  );
}

export default function HomePage({ roles }: { roles: TrackId[] }) {
  return (
    <>
      <main>
        <section className="platform-hero" data-annotation-container="platform:welcome">
          <div className="platform-hero-lockup">
            <img src="./assets/ceps-logo.png" alt="CEPS" />
            <div>
              <p className="platform-eyebrow">Participant platform</p>
              <h1>CEPS Apply AI Task Force</h1>
              <p>
                A shared workspace for the Healthcare and Pharmaceuticals track and the
                Automotive, Transport and Mobility track. Access materials, follow the work
                across sessions and contribute feedback directly on the content.
              </p>
            </div>
          </div>
        </section>
        <section className="track-grid" aria-label="Task Force tracks">
          <TrackCard
            track="healthcare"
            title="Healthcare and Pharmaceuticals"
            description="Session materials, sector use cases, success criteria and additional resources."
            enabled={roles.includes("healthcare")}
          />
          <TrackCard
            track="automotive"
            title="Automotive, Transport and Mobility"
            description="The Autonomous Mobility Speedometer, session materials and Task Force outputs."
            enabled={roles.includes("automotive")}
          />
        </section>
      </main>
      <PlatformFooter />
    </>
  );
}

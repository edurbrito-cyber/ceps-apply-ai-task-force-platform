type TrackId = "automotive" | "healthcare";

export function PlatformFooter() {
  return (
    <footer className="platform-footer">
      <img src="./assets/ceps-logo.png" alt="CEPS" />
      <span>CEPS Apply AI Task Force participant platform</span>
    </footer>
  );
}

export function TrackHero({
  eyebrow,
  title,
  description,
  backHref,
  backLabel
}: {
  eyebrow: string;
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <section className="track-hero">
      <a href={backHref} className="track-back-button">← {backLabel}</a>
      <p className="platform-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}

export function SessionCards({ track }: { track: TrackId }) {
  return (
    <section className="session-grid">
      {[1, 2, 3].map((session) => (
        <article className="session-card" key={session}>
          <span>Session {session}</span>
          <h2>{session === 1 ? "10 June 2026" : "Materials forthcoming"}</h2>
          <div>
            <button type="button" disabled>Briefing &amp; Agenda</button>
            <button type="button" disabled>Notes &amp; Key Points</button>
            <button type="button" disabled>Speaker Presentations</button>
          </div>
          {track === "automotive" && session === 1
            ? <p>Existing Track 2 materials will be linked in the next content pass.</p>
            : null}
        </article>
      ))}
    </section>
  );
}

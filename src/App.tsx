import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import Annotations, { supabase } from "./components/Annotations";

const AutomotiveSpeedometer = lazy(() => import("./tracks/automotive/AutomotiveSpeedometer"));

type TrackId = "automotive" | "healthcare";
type PageId =
  | "home"
  | "automotive"
  | "automotive-speedometer"
  | "automotive-sessions"
  | "healthcare"
  | "healthcare-sessions"
  | "healthcare-use-cases"
  | "healthcare-success"
  | "healthcare-resources";

const pageRoutes: Record<PageId, string> = {
  home: "/",
  automotive: "/automotive",
  "automotive-speedometer": "/automotive/speedometer",
  "automotive-sessions": "/automotive/session-materials",
  healthcare: "/healthcare",
  "healthcare-sessions": "/healthcare/session-materials",
  "healthcare-use-cases": "/healthcare/use-cases",
  "healthcare-success": "/healthcare/defining-success",
  "healthcare-resources": "/healthcare/resources"
};

const routePages = Object.fromEntries(
  Object.entries(pageRoutes).map(([page, route]) => [route, page])
) as Record<string, PageId>;

const healthcareContacts = [
  ["Susana Aires", "Researcher", "susana.airesgomes@ceps.eu"],
  ["Nicoleta Kyosovska", "Research Assistant", "nicoleta.kyosovska@ceps.eu"],
  ["Hannah Macdonald", "Researcher", "hannah.macdonald@ceps.eu"],
  ["Petra Varkonyi", "Research Assistant", "petra.varkonyi@ceps.eu"]
];

const useCases = ["Clinical Trials", "Diagnostics", "Drug Discovery", "Operations", "Patient Care"];
const useCaseTopics = ["State of AI uptake", "Enablers", "Challenges", "Impact"];

function currentPage(): PageId {
  const route = window.location.hash.slice(1).replace(/\/$/, "") || "/";
  if (route.startsWith("/automotive/speedometer/")) return "automotive-speedometer";
  return routePages[route] ?? "home";
}

function PageLink({ to, children, className = "" }: { to: PageId; children: ReactNode; className?: string }) {
  return <a className={className} href={`#${pageRoutes[to]}`}>{children}</a>;
}

function PlatformFooter() {
  return (
    <footer className="platform-footer">
      <img src="./assets/ceps-logo.png" alt="CEPS" />
      <span>CEPS Apply AI Task Force participant platform</span>
    </footer>
  );
}

function AccessMessage({ session }: { session: Session | null }) {
  return (
    <main className="platform-access">
      <p className="platform-eyebrow">Participant access</p>
      <h1>{session ? "This track is not assigned to your account" : "Sign in to access this track"}</h1>
      <p>
        {session
          ? "A CEPS administrator can add this track to your participant role."
          : "Use the comments button to sign in or create an account with a pre-approved email address."}
      </p>
      <PageLink to="home" className="platform-button secondary">Return to all tracks</PageLink>
    </main>
  );
}

function TrackGate({
  track,
  session,
  rolesReady,
  roles,
  children
}: {
  track: TrackId;
  session: Session | null;
  rolesReady: boolean;
  roles: TrackId[];
  children: ReactNode;
}) {
  if (!rolesReady) return <main className="platform-access"><p>Checking track access…</p></main>;
  if (!session || !roles.includes(track)) return <AccessMessage session={session} />;
  return children;
}

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
      <PageLink to={track} className={`platform-button${enabled ? "" : " secondary"}`}>
        {enabled ? "Enter track" : "Sign in for access"}
      </PageLink>
    </article>
  );
}

function Home({ roles }: { roles: TrackId[] }) {
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

function TrackHero({
  eyebrow,
  title,
  description,
  backTo,
  backLabel
}: {
  eyebrow: string;
  title: string;
  description: string;
  backTo: PageId;
  backLabel: string;
}) {
  return (
    <section className="track-hero">
      <PageLink to={backTo} className="track-back-button">← {backLabel}</PageLink>
      <p className="platform-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}

function AutomotiveHome() {
  return (
    <>
      <main>
        <TrackHero
          backTo="home"
          backLabel="All tracks"
          eyebrow="Track 2"
          title="Automotive, Transport and Mobility"
          description="Explore the Task Force’s evidence, deliberation tools and meeting materials on autonomous mobility in Europe."
        />
        <section className="resource-grid">
          <PageLink to="automotive-speedometer" className="resource-card featured">
            <span>Interactive output</span><h2>Autonomous Mobility Speedometer</h2>
            <p>Explore the 0–100 headline index, its 0–10 channel assessments and foresight pathways.</p>
          </PageLink>
          <PageLink to="automotive-sessions" className="resource-card">
            <span>Task Force sessions</span><h2>Session materials</h2>
            <p>Access agendas, briefings, meeting notes and presentations as they are published.</p>
          </PageLink>
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

function SessionCards({ track }: { track: TrackId }) {
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
          {track === "automotive" && session === 1 ? <p>Existing Track 2 materials will be linked in the next content pass.</p> : null}
        </article>
      ))}
    </section>
  );
}

function AutomotiveSessions() {
  return (
    <>
      <main className="platform-content">
        <TrackHero backTo="automotive" backLabel="Automotive track" eyebrow="Track 2 materials" title="Task Force sessions" description="Briefings, notes, key points and presentations from each Automotive track session." />
        <SessionCards track="automotive" />
      </main>
      <PlatformFooter />
    </>
  );
}

function HealthcareHome() {
  return (
    <>
      <main>
        <TrackHero
          backTo="home"
          backLabel="All tracks"
          eyebrow="Track 1"
          title="Healthcare and Pharmaceuticals"
          description="Welcome to the CEPS Apply AI Task Force workspace for Healthcare and Pharmaceuticals. It gathers relevant materials in one place and supports participation through asynchronous feedback."
        />
        <section className="resource-grid healthcare-links">
          <PageLink to="healthcare-sessions" className="resource-card"><span>01</span><h2>Session Materials</h2><p>Briefings, agendas, notes and presentations.</p></PageLink>
          <PageLink to="healthcare-use-cases" className="resource-card featured"><span>02</span><h2>Use Cases</h2><p>AI uptake, enablers, challenges and impact across five healthcare areas.</p></PageLink>
          <PageLink to="healthcare-success" className="resource-card"><span>03</span><h2>Defining Success</h2><p>A shared framework for outcomes and measures, currently in development.</p></PageLink>
          <PageLink to="healthcare-resources" className="resource-card"><span>04</span><h2>Additional Resources</h2><p>Supporting publications and materials from the Task Force.</p></PageLink>
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
            {healthcareContacts.map(([name, role, email]) => (
              <a href={`mailto:${email}`} key={email}><b>{name}</b><span>{role}</span><small>{email}</small></a>
            ))}
          </div>
        </section>
      </main>
      <PlatformFooter />
    </>
  );
}

function HealthcareSessions() {
  return (
    <><main className="platform-content"><TrackHero backTo="healthcare" backLabel="Healthcare track" eyebrow="Track 1 materials" title="Session materials" description="Each session will bring together its briefing, agenda, notes, key points and speaker presentations." /><SessionCards track="healthcare" /></main><PlatformFooter /></>
  );
}

function HealthcareUseCases() {
  return (
    <>
      <main className="platform-content">
        <TrackHero backTo="healthcare" backLabel="Healthcare track" eyebrow="Track 1 evidence" title="Healthcare AI use cases" description="Review all five areas on one page and contribute examples from your organisation or region." />
        <nav className="use-case-nav" aria-label="Healthcare use cases">
          {useCases.map((useCase) => {
            const targetId = useCase.toLowerCase().replaceAll(" ", "-");
            return <button type="button" onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" })} key={useCase}>{useCase}</button>;
          })}
        </nav>
        <div className="use-case-list">
          {useCases.map((useCase) => {
            const id = useCase.toLowerCase().replaceAll(" ", "-");
            return (
              <section id={id} data-annotation-container={`healthcare:use-case:${id}`} key={useCase}>
                <p className="platform-eyebrow">Healthcare use case</p><h2>{useCase}</h2>
                {useCaseTopics.map((topic) => <details key={topic}><summary>{topic}</summary><p>Task Force evidence and participant examples will be developed here.</p></details>)}
              </section>
            );
          })}
        </div>
      </main>
      <PlatformFooter />
    </>
  );
}

function HealthcarePlaceholder({ type }: { type: "success" | "resources" }) {
  const success = type === "success";
  return (
    <><main className="platform-content"><TrackHero backTo="healthcare" backLabel="Healthcare track" eyebrow="Track 1 output" title={success ? "Defining Success" : "Additional Resources"} description={success ? "This Task Force output is being defined and will develop through participant input." : "Healthcare and pharmaceutical publications, presentations and supporting materials will be gathered here."} /><section className="placeholder-section"><span>{success ? "Framework in development" : "Resource library in preparation"}</span><h2>{success ? "What should successful AI adoption achieve?" : "Materials will be added as they are approved"}</h2><p>{success ? "Participants can use page comments to propose outcomes, indicators and safeguards." : "The page structure is ready for the Track 1 resource list."}</p></section></main><PlatformFooter /></>
  );
}

export default function App() {
  const [page, setPage] = useState<PageId>(currentPage);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<TrackId[]>([]);
  const [rolesReady, setRolesReady] = useState(false);

  useEffect(() => {
    const navigate = () => {
      setPage(currentPage());
      const speedometerSection = window.location.hash.match(/^#\/automotive\/speedometer\/([^/]+)$/)?.[1];
      if (speedometerSection) {
        window.setTimeout(() => document.getElementById(speedometerSection)?.scrollIntoView(), 180);
      } else {
        window.scrollTo({ top: 0 });
      }
    };
    navigate();
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);

  useEffect(() => {
    let active = true;
    const updateAccess = async (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession) {
        setRoles([]);
        setRolesReady(true);
        return;
      }
      setRolesReady(false);
      const { data, error } = await supabase.rpc("get_my_tracks");
      if (!active) return;
      setRoles(error ? [] : ((data ?? []) as TrackId[]));
      setRolesReady(true);
    };
    supabase.auth.getSession().then(({ data }) => void updateAccess(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => void updateAccess(nextSession));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (page === "home") {
    return <><Home roles={roles} /><Annotations trackId="platform" pageId="platform-home" title="Comment on the platform" /></>;
  }

  const track: TrackId = page.startsWith("automotive") ? "automotive" : "healthcare";
  let content: ReactNode;
  if (page === "automotive") content = <AutomotiveHome />;
  else if (page === "automotive-sessions") content = <AutomotiveSessions />;
  else if (page === "automotive-speedometer") content = (
    <>
      <PageLink to="automotive" className="platform-back">← Automotive track</PageLink>
      <Suspense fallback={<main className="platform-access"><p>Loading the Speedometer…</p></main>}>
        <AutomotiveSpeedometer showAnnotations={false} platformRoutes />
      </Suspense>
    </>
  );
  else if (page === "healthcare") content = <HealthcareHome />;
  else if (page === "healthcare-sessions") content = <HealthcareSessions />;
  else if (page === "healthcare-use-cases") content = <HealthcareUseCases />;
  else if (page === "healthcare-success") content = <HealthcarePlaceholder type="success" />;
  else content = <HealthcarePlaceholder type="resources" />;

  return (
    <>
      <TrackGate track={track} session={session} rolesReady={rolesReady} roles={roles}>{content}</TrackGate>
      <Annotations
        trackId={track}
        pageId={page}
        title={`Comment on the ${track === "automotive" ? "Automotive" : "Healthcare"} track`}
      />
    </>
  );
}

import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import Annotations, { supabase } from "./components/Annotations";
import AutomotiveHomePage from "./pages/AutomotiveHomePage";
import AutomotiveSessionsPage from "./pages/AutomotiveSessionsPage";
import HealthcareHomePage from "./pages/HealthcareHomePage";
import HealthcareResourcesPage from "./pages/HealthcareResourcesPage";
import HealthcareSessionsPage from "./pages/HealthcareSessionsPage";
import HealthcareSuccessPage from "./pages/HealthcareSuccessPage";
import HealthcareUseCasesPage from "./pages/HealthcareUseCasesPage";
import HomePage from "./pages/HomePage";

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

function currentPage(): PageId {
  const route = window.location.hash.slice(1).replace(/\/$/, "") || "/";
  if (route.startsWith("/automotive/speedometer/")) return "automotive-speedometer";
  return routePages[route] ?? "home";
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
      <a href="#/" className="platform-button secondary">Return to all tracks</a>
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
  if (!rolesReady) return <main className="platform-access"><p>Checking track access...</p></main>;
  if (!session || !roles.includes(track)) return <AccessMessage session={session} />;
  return children;
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
    return <><HomePage roles={roles} /><Annotations trackId="platform" pageId="platform-home" title="Comment on the platform" /></>;
  }

  const track: TrackId = page.startsWith("automotive") ? "automotive" : "healthcare";
  let content: ReactNode;
  if (page === "automotive") content = <AutomotiveHomePage />;
  else if (page === "automotive-sessions") content = <AutomotiveSessionsPage />;
  else if (page === "automotive-speedometer") content = (
    <>
      <a href="#/automotive" className="platform-back">← Automotive track</a>
      <Suspense fallback={<main className="platform-access"><p>Loading the Speedometer...</p></main>}>
        <AutomotiveSpeedometer showAnnotations={false} platformRoutes />
      </Suspense>
    </>
  );
  else if (page === "healthcare") content = <HealthcareHomePage />;
  else if (page === "healthcare-sessions") content = <HealthcareSessionsPage />;
  else if (page === "healthcare-use-cases") content = <HealthcareUseCasesPage />;
  else if (page === "healthcare-success") content = <HealthcareSuccessPage />;
  else content = <HealthcareResourcesPage />;

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

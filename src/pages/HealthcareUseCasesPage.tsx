import { PlatformFooter, TrackHero } from "./PlatformPageParts";

const useCases = ["Clinical Trials", "Diagnostics", "Drug Discovery", "Operations", "Patient Care"];
const topics = ["State of AI uptake", "Enablers", "Challenges", "Impact"];

function useCaseId(value: string) {
  return value.toLowerCase().replaceAll(" ", "-");
}

export default function HealthcareUseCasesPage() {
  return (
    <>
      <main className="platform-content">
        <TrackHero
          backHref="#/healthcare"
          backLabel="Healthcare track"
          eyebrow="Track 1 evidence"
          title="Healthcare AI use cases"
          description="Review all five areas on one page and contribute examples from your organisation or region."
        />
        <nav className="use-case-nav" aria-label="Healthcare use cases">
          {useCases.map((useCase) => {
            const id = useCaseId(useCase);
            return <button type="button" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })} key={useCase}>{useCase}</button>;
          })}
        </nav>
        <div className="use-case-list">
          {useCases.map((useCase) => {
            const id = useCaseId(useCase);
            return (
              <section id={id} data-annotation-container={`healthcare:use-case:${id}`} key={useCase}>
                <p className="platform-eyebrow">Healthcare use case</p><h2>{useCase}</h2>
                {topics.map((topic) => <details key={topic}><summary>{topic}</summary><p>Task Force evidence and participant examples will be developed here.</p></details>)}
              </section>
            );
          })}
        </div>
      </main>
      <PlatformFooter />
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import Annotations from "../../components/Annotations";
import Speedometer from "./components/Speedometer";
import {
  BASELINE_READING,
  channels,
  scenarios,
  zones
} from "./data/model";
import { evidenceEvents, evidenceMeta } from "./data/evidence";
import type { ChannelId, Scores, Weights } from "./types";

type AnnotationRevealDetail = {
  containerId: string | null;
  selectedText: string;
  textBefore: string;
  textAfter: string;
};

const baselineScores = Object.fromEntries(
  channels.map((channel) => [channel.id, channel.baseline])
) as Scores;
const defaultWeights = Object.fromEntries(
  channels.map((channel) => [channel.id, channel.weight])
) as Weights;

function normalizeWeights(input: Weights) {
  const total = Object.values(input).reduce((sum, value) => sum + value, 0);
  if (!total) return { ...defaultWeights };

  const shares = channels.map((channel) => {
    const exact = (input[channel.id] / total) * 100;
    return {
      id: channel.id,
      value: Math.floor(exact),
      remainder: exact - Math.floor(exact)
    };
  });
  let remaining = 100 - shares.reduce((sum, share) => sum + share.value, 0);
  const allocationOrder = [...shares].sort((a, b) => b.remainder - a.remainder);

  for (let index = 0; remaining > 0; index += 1, remaining -= 1) {
    allocationOrder[index % allocationOrder.length].value += 1;
  }

  return Object.fromEntries(shares.map((share) => [share.id, share.value])) as Weights;
}

function weightedScore(scores: Scores, weights: Weights) {
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (!totalWeight) return 0;
  return channels.reduce(
    (sum, channel) => sum + scores[channel.id] * (weights[channel.id] / totalWeight),
    0
  );
}

const baselineExact = weightedScore(baselineScores, defaultWeights);

function clamp(value: number) {
  return Math.max(0, Math.min(10, value));
}

function formatReading(value: number) {
  return value.toFixed(1);
}

function formatIndex(value: number) {
  return Math.round(value * 10);
}

function normalizeAnnotationText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function scenarioAnnotationText(scenario: (typeof scenarios)[number]) {
  return normalizeAnnotationText([
    scenario.horizon,
    scenario.title,
    scenario.description,
    scenario.startingPoint,
    ...scenario.timeline.flatMap((step) => [step.period, step.title, step.description]),
    scenario.outcome,
    ...Object.values(scenario.effectRationale),
    ...scenario.assumptions,
    ...scenario.sources.map((source) => source.label)
  ].filter(Boolean).join(" "));
}

export default function App({
  showAnnotations = true,
  platformRoutes = false
}: {
  showAnnotations?: boolean;
  platformRoutes?: boolean;
}) {
  const [scores, setScores] = useState<Scores>(baselineScores);
  const [weightInputs, setWeightInputs] = useState<Weights>(defaultWeights);
  const [activeScenarios, setActiveScenarios] = useState<string[]>([]);
  const [showWeights, setShowWeights] = useState(false);
  const [copied, setCopied] = useState(false);
  const [evidenceFilter, setEvidenceFilter] = useState<ChannelId | "all">("all");
  const [openScenarioId, setOpenScenarioId] = useState<string | null>(null);
  const scenarioDialogRef = useRef<HTMLDialogElement>(null);

  const weights = useMemo(() => normalizeWeights(weightInputs), [weightInputs]);
  const reading = useMemo(() => weightedScore(scores, weights), [scores, weights]);
  const activeBottlenecks = channels.flatMap((channel) => {
    const threshold = channel.markers.find((marker) => marker.kind === "threshold");
    return threshold && scores[channel.id] < threshold.value
      ? [{ channel, threshold }]
      : [];
  });
  const changedChannels = channels
    .map((channel) => ({
      ...channel,
      change: scores[channel.id] - channel.baseline
    }))
    .filter((channel) => channel.change !== 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const visibleEvidence =
    evidenceFilter === "all"
      ? evidenceEvents
      : evidenceEvents.filter((event) => event.channel === evidenceFilter);
  const openScenario = scenarios.find((scenario) => scenario.id === openScenarioId);
  const openScenarioScores = { ...baselineScores };
  if (openScenario) {
    for (const [id, change] of Object.entries(openScenario.changes)) {
      const channelId = id as ChannelId;
      openScenarioScores[channelId] = clamp(
        openScenarioScores[channelId] + (change ?? 0)
      );
    }
  }
  const openScenarioReading = weightedScore(openScenarioScores, weights);

  useEffect(() => {
    if (!openScenario) return undefined;

    const dialog = scenarioDialogRef.current;
    const root = document.documentElement;
    const body = document.body;
    const rootOverflow = root.style.overflow;
    const bodyOverflow = body.style.overflow;

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (dialog && !dialog.open) dialog.showModal();

    return () => {
      root.style.overflow = rootOverflow;
      body.style.overflow = bodyOverflow;
    };
  }, [openScenario]);

  useEffect(() => {
    const revealAnnotationContainer = (event: Event) => {
      const detail = (event as CustomEvent<AnnotationRevealDetail>).detail;
      if (detail.containerId?.startsWith("priority:")) setShowWeights(true);

      if (detail.containerId?.startsWith("evidence:")) {
        const evidenceId = detail.containerId.slice("evidence:".length);
        const evidence = evidenceEvents.find((item) => item.id === evidenceId);
        if (evidence) setEvidenceFilter(evidence.channel);
      } else {
        const matchedEvidence = evidenceEvents.find((item) => normalizeAnnotationText([
          item.title,
          item.note,
          item.sourceType
        ].join(" ")).includes(detail.selectedText));
        if (matchedEvidence) setEvidenceFilter(matchedEvidence.channel);
      }

      if (detail.containerId === "method") setShowWeights(true);

      const pathwayId = detail.containerId?.startsWith("pathway:")
        ? detail.containerId.slice("pathway:".length)
        : null;
      const matchedScenario = pathwayId
        ? scenarios.find((scenario) => scenario.id === pathwayId)
        : scenarios.find((scenario) => scenarioAnnotationText(scenario).includes(detail.selectedText));

      if (matchedScenario) setOpenScenarioId(matchedScenario.id);
    };

    window.addEventListener("ceps:reveal-annotation", revealAnnotationContainer);
    return () => window.removeEventListener("ceps:reveal-annotation", revealAnnotationContainer);
  }, []);

  function updateScore(id: ChannelId, value: number) {
    setScores((current) => ({ ...current, [id]: clamp(value) }));
    setActiveScenarios([]);
  }

  function toggleScenario(scenarioId: string) {
    const nextIds = activeScenarios.includes(scenarioId)
      ? activeScenarios.filter((id) => id !== scenarioId)
      : [...activeScenarios, scenarioId];

    const nextScores = { ...baselineScores };
    for (const scenario of scenarios.filter((item) => nextIds.includes(item.id))) {
      for (const [id, change] of Object.entries(scenario.changes)) {
        const channelId = id as ChannelId;
        nextScores[channelId] = clamp(nextScores[channelId] + (change ?? 0));
      }
    }
    setActiveScenarios(nextIds);
    setScores(nextScores);
  }

  function reset() {
    setScores(baselineScores);
    setWeightInputs(defaultWeights);
    setActiveScenarios([]);
  }

  async function copySurvey() {
    const response = [
      "CEPS Autonomous Mobility Speedometer: participant response",
      `Scenario score: ${formatIndex(reading)}/100`,
      "",
      "Priority weights:",
      ...channels.map(
        (channel) => `- ${channel.label}: ${weights[channel.id]}%`
      ),
      "",
      "Readiness assumptions:",
      ...channels.map((channel) => `- ${channel.label}: ${scores[channel.id]}/10`),
      "",
      "Please add:",
      "- Which readiness channel is missing or wrongly defined?",
      "- Why did you allocate these relative weights?",
      "- Which regional, national or cross-border case study should CEPS include?",
      "- What evidence should change the current baseline?",
      "- Which action could unlock deployment fastest?",
      "- Where do you disagree with the model?"
    ].join("\n");
    await navigator.clipboard.writeText(response);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const sectionHref = (section: string) =>
    platformRoutes ? `#/automotive/speedometer/${section}` : `#${section}`;

  return (
    <div className="site-shell">
      <a className="skip-link" href={sectionHref("main-content")}>Skip to main content</a>
      <header className="topbar">
        <a className="brand" href="https://www.ceps.eu/" aria-label="CEPS website">
          <img src="./assets/ceps-logo.png" alt="CEPS" />
        </a>
        <nav aria-label="Page sections">
          <a href={sectionHref("simulator")}>Simulator</a>
          <a href={sectionHref("baseline")}>Baseline</a>
          <a href={sectionHref("survey")}>Survey</a>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">Apply AI Task Force · Track 2</p>
            <h1>How fast is Europe moving?</h1>
            <p className="subtitle">
              The Autonomous Mobility Speedometer turns policy, deployment and
              investment signals into a shared view of Europe’s route to scale.
            </p>
            <a className="primary-link" href={sectionHref("simulator")}>Explore pathways <span>↓</span></a>
          </div>
          <Speedometer
            reading={reading}
            baseline={BASELINE_READING}
            zones={zones}
            showComparison={false}
          />
        </section>

        <section className="trust-strip" aria-label="Model principles">
          <span>Evidence-led</span>
          <span>Participant-reviewed</span>
          <span>Versioned over time</span>
          <span>Transparent on uncertainty</span>
        </section>

        <section className="workspace" id="simulator" aria-labelledby="simulator-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Pathway simulator</p>
              <h2 id="simulator-title">What could move the needle?</h2>
            </div>
            <p>
              Adjust the state of each readiness channel or combine policy pathways.
              Use the resulting scenarios to support deliberation.{" "}
              <a className="baseline-intro-link" href={sectionHref("baseline")}>
                See our methodology and why the current index reading is 36.
              </a>
            </p>
          </div>

          <div className="simulator-grid">
            <div className="controls-panel">
              <div className="panel-heading">
                <div>
                  <h3>Readiness by channel</h3>
                </div>
                <button className="text-button" type="button" onClick={reset}>Reset</button>
              </div>

              <div className="marker-legend" aria-label="Slider marker legend">
                <span><i className="threshold-dot" /> Bottleneck threshold</span>
                <span><i className="operational-dot" /> Operational</span>
                <span><i className="scale-dot" /> Scale-ready</span>
                <small>Hover or focus a marker for details.</small>
              </div>

              <div className="channel-controls">
                {channels.map((channel) => (
                  <div
                    className="channel-control"
                    data-annotation-container={`readiness:${channel.id}`}
                    key={channel.id}
                  >
                    <label className="channel-label" htmlFor={`channel-${channel.id}`}>
                      <strong>{channel.label}</strong>
                      <output>{scores[channel.id]}</output>
                    </label>
                    <div className="range-track">
                      <input
                        id={`channel-${channel.id}`}
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={scores[channel.id]}
                        onChange={(event) => updateScore(channel.id, Number(event.target.value))}
                      />
                      {channel.markers.map((marker) => (
                        <span
                          className={`slider-marker ${marker.kind}`}
                          style={{ left: `${marker.value * 10}%` }}
                          tabIndex={0}
                          aria-label={`${marker.label}, ${marker.value}. ${marker.description}`}
                          key={`${channel.id}-${marker.kind}`}
                        >
                          <span className="marker-tooltip" role="tooltip">
                            <strong>{marker.label}</strong>
                            <b>{marker.value}/10</b>
                            <small>{marker.description}</small>
                          </span>
                        </span>
                      ))}
                    </div>
                    <span className="range-labels"><i>No foundation</i><i>Draghi-aligned target</i></span>
                  </div>
                ))}
              </div>
            </div>

            <aside className="result-panel">
              <span className="step-label">Live result</span>
              <Speedometer
                reading={reading}
                baseline={BASELINE_READING}
                zones={zones}
                label="Simulated speed"
              />
              <div className="result-explanation">
                <div>
                  <span>Weighted channel score</span>
                  <strong>{formatReading(reading)} / 10</strong>
                </div>
                <div>
                  <span>Active bottlenecks</span>
                  <strong>{activeBottlenecks.length}</strong>
                </div>
              </div>
              {activeBottlenecks.length ? (
                <div className="bottleneck-notice">
                  <strong>Bottleneck signals</strong>
                  <ul>
                    {activeBottlenecks.map(({ channel, threshold }) => (
                      <li key={channel.id}>
                        <span>{channel.shortLabel}</span>
                        <b>{scores[channel.id]} / {threshold.value}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="bottleneck-notice clear">
                  <strong>Thresholds reached</strong>
                  Every bottleneck indicator has reached its working threshold.
                </p>
              )}
              <div className="movement-list">
                <span>What changed</span>
                {changedChannels.length ? changedChannels.slice(0, 3).map((channel) => (
                  <p key={channel.id}>
                    <strong>{channel.shortLabel}</strong>
                    <span>{channel.change > 0 ? "+" : ""}{channel.change}</span>
                  </p>
                )) : <p className="empty-state">Start with a pathway or move a slider.</p>}
              </div>
            </aside>
          </div>

          <div className="pathway-section">
            <div className="panel-heading">
              <div>
                <span className="step-label">02 · Foresight accelerators</span>
                <h3>Explore what could happen next</h3>
              </div>
              <span className="selection-count">{activeScenarios.length} selected</span>
            </div>
            <p className="pathway-intro">
              Each exercise starts from the 10 June 2026 baseline and traces a concrete
              sequence toward a faster future. Select pathways to test their modeled
              channel changes, then open each narrative to examine its milestones and assumptions.
            </p>
            <div className="pathway-grid">
              {scenarios.map((scenario) => {
                const active = activeScenarios.includes(scenario.id);
                const scenarioScores = { ...baselineScores };
                for (const [id, change] of Object.entries(scenario.changes)) {
                  const channelId = id as ChannelId;
                  scenarioScores[channelId] = clamp(
                    scenarioScores[channelId] + (change ?? 0)
                  );
                }
                const startingReading = weightedScore(baselineScores, weights);
                const scenarioReading = weightedScore(scenarioScores, weights);
                const overallChange = scenarioReading - startingReading;

                return (
                  <article
                    className={`pathway-card${active ? " active" : ""}`}
                    data-annotation-container={`pathway-card:${scenario.id}`}
                    key={scenario.id}
                  >
                    <span className="pathway-topline">
                      <i>{scenario.horizon}</i>
                      <b>+{formatIndex(overallChange)} index points</b>
                    </span>
                    <strong>{scenario.title}</strong>
                    <span className="pathway-description">{scenario.description}</span>
                    <span className="impact-tags">
                      {Object.entries(scenario.changes).map(([id, change]) => (
                        <i key={id}>
                          {channels.find((channel) => channel.id === id)?.shortLabel} +{change}
                        </i>
                      ))}
                    </span>
                    <div className="pathway-actions">
                      <button
                        className="pathway-toggle"
                        type="button"
                        onClick={() => toggleScenario(scenario.id)}
                        aria-pressed={active}
                      >
                        {active ? "Remove from scenario" : "Run this scenario"}
                      </button>
                      <button
                        className="scenario-read"
                        type="button"
                        onClick={() => setOpenScenarioId(scenario.id)}
                      >
                        Read the foresight pathway
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="pathway-contribution">
              <strong>Imagine another route to acceleration?</strong>
              Contribute a pathway, its milestones and the readiness channels it could advance.
            </p>
            {openScenario ? (
              <dialog
                className="scenario-drawer"
                data-annotation-container={`pathway:${openScenario.id}`}
                ref={scenarioDialogRef}
                aria-labelledby="scenario-drawer-title"
                onClose={() => setOpenScenarioId(null)}
                onClick={(event) => {
                  if (event.target === event.currentTarget) {
                    scenarioDialogRef.current?.close();
                  }
                }}
              >
                <div className="scenario-drawer-content">
                  <header>
                    <div>
                      <span className="step-label">Foresight accelerator · {openScenario.horizon}</span>
                      <h2 id="scenario-drawer-title">{openScenario.title}</h2>
                    </div>
                    <button
                      className="drawer-close"
                      type="button"
                      aria-label="Close foresight pathway"
                      autoFocus
                      onClick={() => scenarioDialogRef.current?.close()}
                    >
                      ×
                    </button>
                  </header>
                  <p className="drawer-summary">{openScenario.description}</p>
                  <figure className="scenario-illustration">
                    <img
                      src={openScenario.illustration}
                      alt={openScenario.illustrationAlt}
                      width="720"
                      height="720"
                      loading="lazy"
                      decoding="async"
                    />
                  </figure>
                  <section className="scenario-start">
                    <span>Starting point</span>
                    <p>{openScenario.startingPoint}</p>
                  </section>
                  <ol className="scenario-timeline">
                    {openScenario.timeline.map((step) => (
                      <li key={step.period}>
                        <time>{step.period}</time>
                        <strong>{step.title}</strong>
                        <p>{step.description}</p>
                      </li>
                    ))}
                  </ol>
                  <section className="scenario-outcome">
                    <span>Scenario outcome</span>
                    <p>{openScenario.outcome}</p>
                    <strong>
                      {Math.round(weightedScore(baselineScores, weights))} → {Math.round(openScenarioReading)}
                    </strong>
                  </section>
                  <section className="scenario-effects">
                    <h3>Why the model moves</h3>
                    <ul>
                      {Object.entries(openScenario.changes).map(([id, change]) => {
                        const channelId = id as ChannelId;
                        const channel = channels.find((item) => item.id === channelId);
                        return (
                          <li key={id}>
                            <strong>{channel?.label} +{change}</strong>
                            <p>{openScenario.effectRationale[channelId]}</p>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                  <section className="scenario-assumptions">
                    <h3>What has to be true</h3>
                    <ul>
                      {openScenario.assumptions.map((assumption) => (
                        <li key={assumption}>{assumption}</li>
                      ))}
                    </ul>
                  </section>
                  <nav className="scenario-sources" aria-label={`${openScenario.title} sources`}>
                    {openScenario.sources.map((source) => (
                      <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                        {source.label} <span aria-hidden="true">↗</span>
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ))}
                  </nav>
                  <button
                    className="drawer-run"
                    type="button"
                    onClick={() => toggleScenario(openScenario.id)}
                    aria-pressed={activeScenarios.includes(openScenario.id)}
                  >
                    {activeScenarios.includes(openScenario.id)
                      ? "Remove from scenario"
                      : "Run this scenario"}
                  </button>
                </div>
              </dialog>
            ) : null}
          </div>
        </section>

        <section className="baseline-section" id="baseline" aria-labelledby="baseline-title">
          <div className="section-heading light">
            <div>
              <p className="eyebrow">Methodology and baseline evidence</p>
              <h2 id="baseline-title">Why the starting point is 36</h2>
            </div>
            <p>
              A dated assessment of Europe’s current position against the strategic
              direction set out in the Draghi report. Public evidence documents strong
              assets and visible activity alongside fragmented road access, weak learning
              loops and limited scale-up pathways.
            </p>
          </div>
          <div className="benchmark-note">
            <div>
              <span className="step-label">Strategic benchmark</span>
              <h3>Draghi-aligned European scale</h3>
              <p>
                The target reflects the Draghi report’s call for competitive leadership
                in next-generation vehicles, common European projects for software-defined
                and autonomous vehicles, coherent rules for data and AI, stronger investment,
                skills and access to global markets.
              </p>
            </div>
            <a
              href="https://commission.europa.eu/topics/competitiveness/draghi-report_en"
              target="_blank"
              rel="noreferrer"
            >
              Read the Draghi report <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="readiness-scale" aria-label="Readiness scale">
            <span><b>0</b> No foundation</span>
            <span><b>2</b> Isolated foundations</span>
            <span><b>4</b> Emerging pathway</span>
            <span><b>6</b> Repeatable deployment</span>
            <span><b>8</b> European scale</span>
            <span><b>10</b> Draghi-aligned target</span>
          </div>
          <div className="baseline-calculation" aria-label="Baseline calculation summary">
            <div>
              <span>Headline index</span>
              <div className="weighted-formula">
                <small>Σ channel score × model weight × 10 =</small>
                <strong>{Math.round(baselineExact * 10)}</strong>
              </div>
            </div>
            <div>
              <span>Assessed channels</span>
              <strong>{channels.length}</strong>
            </div>
            <div>
              <span>Evidence cutoff</span>
              <strong>{evidenceMeta.cutoffDate}</strong>
            </div>
          </div>
          <div className="evidence-method">
            <div>
              <span className="step-label">How the baseline is formed</span>
              <p>
                CEPS conducted a desk review of dated, publicly accessible sources and
                mapped each record to one readiness channel. The channel readings are
                reasoned assessments against the 0–10 scale. Evidence signals provide the
                documented basis for CEPS to assign each score.
              </p>
            </div>
            <div>
              <span className="step-label">Signal direction</span>
              <p>
                An enabling signal supports progress. A constraining signal documents a
                barrier. A mixed signal contains both implications or describes potential
                whose observed outcome remains uncertain. Mixed signals remain part of the
                baseline evidence and carry a neutral direction.
              </p>
            </div>
            <div>
              <span className="step-label">Source types and weights</span>
              <p>
                Official sources cover laws, policy, guidance and institutional actions.
                Standards document technical practice. Independent research triangulates
                deployment evidence. The current weights are CEPS working judgements of
                each channel’s deployment leverage and system-wide importance. They remain
                open to Task Force review through the survey.
              </p>
            </div>
          </div>
          <div className="baseline-layout">
            <div className="channel-table">
              {channels.map((channel) => {
                const channelEvidence = evidenceEvents.filter(
                  (event) => event.channel === channel.id
                );
                const baselineEvidence = channelEvidence.filter(
                  (event) => event.status === "accepted_desk_review"
                );
                const enablingSignals = baselineEvidence.filter(
                  (event) => event.direction === "accelerator"
                ).length;
                const constrainingSignals = baselineEvidence.filter(
                  (event) => event.direction === "drag"
                ).length;
                const mixedSignals = baselineEvidence.filter(
                  (event) => event.direction === "mixed"
                ).length;
                const currentTier = [...channel.markers]
                  .reverse()
                  .find((marker) => channel.baseline >= marker.value);
                const nextMarker = channel.markers.find(
                  (marker) => channel.baseline < marker.value
                );

                return (
                  <details
                    data-annotation-container={`baseline-channel:${channel.id}`}
                    key={channel.id}
                    onToggle={(event) => {
                      if (event.currentTarget.open) setEvidenceFilter(channel.id);
                    }}
                  >
                    <summary>
                      <span>{channel.label}</span>
                      <span className="mini-bar" aria-hidden="true">
                        <i style={{ width: `${channel.baseline * 10}%` }} />
                      </span>
                      <strong>{channel.baseline}</strong>
                    </summary>
                    <div className="channel-assessment">
                      <div className="assessment-stats">
                        <div>
                          <span>Model weight</span>
                          <strong>{channel.weight}%</strong>
                        </div>
                        <div>
                          <span>Contribution</span>
                          <strong>{(channel.baseline * channel.weight / 100).toFixed(2)}</strong>
                        </div>
                        <div>
                          <span>Baseline evidence</span>
                          <strong>{baselineEvidence.length} records</strong>
                        </div>
                      </div>
                      <div className="assessment-copy">
                        <div>
                          <span>Evidence supports</span>
                          <p>{channel.evidenceSupports}</p>
                        </div>
                        <div>
                          <span>Current constraint</span>
                          <p>{channel.currentConstraint}</p>
                        </div>
                      </div>
                      <div className="tier-assessment">
                        <div>
                          <span>Current tier position</span>
                          <strong>
                            {currentTier
                              ? `${currentTier.value}: ${currentTier.label}`
                              : "Below the first bottleneck threshold"}
                          </strong>
                        </div>
                        {nextMarker ? (
                          <div>
                            <span>Next milestone</span>
                            <strong>{nextMarker.value}: {nextMarker.label}</strong>
                            <p>{channel.nextEvidence}</p>
                          </div>
                        ) : (
                          <div>
                            <span>Next review</span>
                            <strong>Maintain the scale-ready tier</strong>
                            <p>{channel.nextEvidence}</p>
                          </div>
                        )}
                      </div>
                      <p className="evidence-balance">
                        Evidence signals: {enablingSignals} enabling, {constrainingSignals} constraining,
                        {" "}{mixedSignals} mixed.
                      </p>
                      <small className="assessment-question">
                        Assessment question: {channel.rationale}
                      </small>
                    </div>
                  </details>
                );
              })}
            </div>
            <div className="evidence-ledger">
              <div className="ledger-heading">
                <div>
                  <span className="step-label">Baseline evidence ledger</span>
                  <strong>{visibleEvidence.length} records shown</strong>
                </div>
                <span>{evidenceMeta.baselineEvidence} evidence records</span>
              </div>
              <div className="evidence-filters" aria-label="Filter evidence by readiness channel">
                <button
                  type="button"
                  className={evidenceFilter === "all" ? "active" : ""}
                  onClick={() => setEvidenceFilter("all")}
                >
                  All
                </button>
                {channels.map((channel) => (
                  <button
                    type="button"
                    key={channel.id}
                    className={evidenceFilter === channel.id ? "active" : ""}
                    onClick={() => setEvidenceFilter(channel.id)}
                    title={channel.label}
                  >
                    {channel.shortLabel}
                  </button>
                ))}
              </div>
              <div
                className="evidence-list"
                tabIndex={0}
                aria-label="Scrollable baseline evidence list"
              >
              {visibleEvidence.map((event) => (
                <article data-annotation-container={`evidence:${event.id}`} key={event.id}>
                  <div>
                    <span className="event-variable">
                      {channels.find((channel) => channel.id === event.channel)?.shortLabel}
                    </span>
                    <span className={`direction ${event.direction}`}>
                      {event.direction === "accelerator"
                        ? "enabling"
                        : event.direction === "drag"
                          ? "constraining"
                          : "mixed"}
                    </span>
                  </div>
                  <h3>{event.title}</h3>
                  <p>{event.note}</p>
                  <footer>
                    <a href={event.sourceUrl} target="_blank" rel="noreferrer">
                      {event.sourceType} <span aria-hidden="true">↗</span>
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </footer>
                </article>
              ))}
              </div>
            </div>
          </div>
        </section>

        <section className="method-section" id="method" aria-labelledby="method-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Task Force participation</p>
              <h2 id="method-title">Contribute your assessment to the model</h2>
            </div>
            <p>
              Use the weighting tool to assess which readiness channels are most critical
              for Europe. Your normalized allocation can be shared with CEPS as a Task
              Force response.
            </p>
          </div>

          <div className="survey-card" id="survey">
            <div className="survey-intro">
              <span className="step-label">Your Task Force input</span>
              <h3>Which readiness channels are most critical for Europe to achieve competitive and sovereign autonomous mobility?</h3>
              <p>
                Adjust the relative importance of the seven readiness channels. The shares
                remain normalized to 100% and update the simulated reading.
              </p>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowWeights((value) => !value)}
                aria-expanded={showWeights}
              >
                {showWeights ? "Hide my priorities" : "Add my priorities"}
              </button>
            </div>
            <div className="survey-steps">
              <span><b>1</b> Seven readiness channels</span>
              <span><b>2</b> Normalized priority weights</span>
              <span><b>3</b> Evidence-backed baseline</span>
              <span><b>4</b> High-impact pathways</span>
            </div>
          </div>

          {showWeights ? (
            <div className="weights-panel">
              <div className="weights-heading">
                <div>
                  <span className="step-label">Your weighting lens</span>
                  <h3>Allocate relative importance</h3>
                </div>
              </div>
              <p className="helper">
                Move any slider to change relative importance. All displayed weights
                automatically rebalance to 100%.
              </p>
              <div className="weight-grid">
                {channels.map((channel) => (
                  <label data-annotation-container={`priority:${channel.id}`} key={channel.id}>
                    <span>{channel.label}<output>{weights[channel.id]}%</output></span>
                    <input
                      type="range"
                      min="0"
                      max="35"
                      value={weightInputs[channel.id]}
                      onChange={(event) =>
                        setWeightInputs((current) => ({
                          ...current,
                          [channel.id]: Number(event.target.value)
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="survey-actions">
                <button className="primary-button" type="button" onClick={copySurvey}>
                  {copied ? "Response copied ✓" : "Copy my Task Force response"}
                </button>
                <span>Share the copied response through the Task Force survey or with the CEPS team.</span>
              </div>
            </div>
          ) : null}

        </section>

      </main>

      <footer className="site-footer">
        <section className="disclosure-section" aria-labelledby="disclosure-title">
          <div>
            <p className="eyebrow">About this tool</p>
            <h2 id="disclosure-title">Privacy and responsible use</h2>
          </div>
          <div className="disclosure-copy">
            <p>
              The Speedometer is an interactive policy working model for Task Force
              deliberation. Slider choices, pathways and weights remain in your browser.
              When you sign in and submit an annotation, your email, display name,
              selected passage and comment are stored for moderation and authenticated
              discussion. CEPS administrators can approve, decline or remove submissions.
              Standard hosting and authentication logs support delivery and security.
            </p>
            <nav aria-label="Legal and policy links">
              <a href="https://www.ceps.eu/about-ceps/data-privacy-policy/" target="_blank" rel="noreferrer">
                CEPS data privacy policy <span aria-hidden="true">↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <a href="https://www.ceps.eu/about-ceps/disclaimer/" target="_blank" rel="noreferrer">
                CEPS disclaimer <span aria-hidden="true">↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </nav>
          </div>
        </section>

        <div className="site-footer-bar">
          <img src="./assets/ceps-logo.png" alt="CEPS" />
          <div>
            <strong>EU Autonomous Mobility Speedometer</strong>
            <span>Apply AI Task Force · Automotive, Transport & Mobility</span>
          </div>
        </div>
      </footer>
      {showAnnotations ? <Annotations /> : null}
    </div>
  );
}

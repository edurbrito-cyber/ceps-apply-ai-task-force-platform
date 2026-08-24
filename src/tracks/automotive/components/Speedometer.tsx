import { useId, useMemo } from "react";
import type { Zone } from "../types";

type Props = {
  reading: number;
  baseline: number;
  zones: Zone[];
  label?: string;
  showComparison?: boolean;
};

const zoneColors = ["#708197", "#317aa1", "#20a39e", "#8aab45", "#e9a93b"];
const center = { x: 180, y: 166 };
const radius = 136;

function polarPoint(value: number, distance = radius) {
  const angle = Math.PI + (Math.max(0, Math.min(value, 100)) / 100) * Math.PI;
  return {
    x: center.x + distance * Math.cos(angle),
    y: center.y + distance * Math.sin(angle)
  };
}

function arc(start: number, end: number) {
  const a = polarPoint(start);
  const b = polarPoint(end);
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 0 1 ${b.x} ${b.y}`;
}

export default function Speedometer({
  reading,
  baseline,
  zones,
  label = "Scenario reading",
  showComparison = true
}: Props) {
  const titleId = useId();
  const zone =
    [...zones].reverse().find((candidate) => reading >= candidate.min) ?? zones[0];
  const indexReading = reading * 10;
  const baselineIndex = baseline * 10;
  const needle = useMemo(() => polarPoint(indexReading, 102), [indexReading]);
  const baselinePoint = useMemo(() => polarPoint(baselineIndex, 116), [baselineIndex]);

  return (
    <section className="gauge-panel" aria-labelledby={titleId}>
      <div className="gauge-heading">
        <div>
          <p className="eyebrow">{label}</p>
          <h2 id={titleId}>{zone.label}</h2>
        </div>
        <div className="reading-lockup" aria-live="polite">
          <strong>{Math.round(indexReading)}</strong>
          <span>/100</span>
        </div>
      </div>

      <div
        className="gauge-wrap"
        role="img"
        aria-label={`${label}: ${Math.round(indexReading)} out of 100, ${zone.label}.${showComparison ? ` Current baseline: ${Math.round(baselineIndex)} out of 100.` : ""}`}
      >
        <svg viewBox="0 0 360 204" className="gauge-svg" aria-hidden="true">
          {zones.map((item, index) => {
            const start = item.min * 10;
            const end = (zones[index + 1]?.min ?? 10) * 10;
            return (
              <path
                key={item.label}
                d={arc(start + (index ? 0.8 : 0), end - (index === zones.length - 1 ? 0 : 0.8))}
                fill="none"
                stroke={zoneColors[index]}
                strokeWidth="18"
                strokeLinecap="butt"
              />
            );
          })}
          {showComparison ? (
            <line
              x1={center.x}
              y1={center.y}
              x2={baselinePoint.x}
              y2={baselinePoint.y}
              className="baseline-mark"
            />
          ) : null}
          <line
            x1={center.x}
            y1={center.y}
            x2={needle.x}
            y2={needle.y}
            className="needle"
          />
          <circle cx={center.x} cy={center.y} r="13" className="needle-hub" />
          <text x="35" y="193" className="gauge-end-label">0</text>
          <text x="310" y="193" className="gauge-end-label">100</text>
        </svg>
      </div>

      {showComparison ? (
        <div className="gauge-footer">
          <strong className={reading >= baseline ? "positive" : "negative"}>
            {reading >= baseline ? "+" : ""}{Math.round((reading - baseline) * 10)} points
          </strong>
        </div>
      ) : null}
    </section>
  );
}

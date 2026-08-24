export type ChannelId =
  | "regulation"
  | "deployment"
  | "data"
  | "technology"
  | "finance"
  | "publicValue"
  | "sovereignty";

export type Channel = {
  id: ChannelId;
  shortLabel: string;
  label: string;
  weight: number;
  baseline: number;
  rationale: string;
  evidenceSupports: string;
  currentConstraint: string;
  nextEvidence: string;
  markers: SliderMarker[];
};

export type SliderMarker = {
  value: number;
  label: string;
  description: string;
  kind: "threshold" | "operational" | "scale";
};

export type Zone = {
  label: string;
  range: string;
  description: string;
  min: number;
};

export type Scenario = {
  id: string;
  horizon: string;
  title: string;
  description: string;
  illustration: string;
  illustrationAlt: string;
  startingPoint: string;
  timeline: Array<{
    period: string;
    title: string;
    description: string;
  }>;
  outcome: string;
  effectRationale: Partial<Record<ChannelId, string>>;
  assumptions: string[];
  sources: Array<{
    label: string;
    url: string;
  }>;
  changes: Partial<Record<ChannelId, number>>;
};

export type EvidenceEvent = {
  id: string;
  date: string;
  title: string;
  channel: ChannelId;
  direction: "accelerator" | "drag" | "mixed";
  impact: number;
  adjustedEffect: number;
  sourceType: string;
  sourceUrl: string;
  status: "accepted_desk_review" | "context_only";
  note: string;
};

export type Scores = Record<ChannelId, number>;
export type Weights = Record<ChannelId, number>;

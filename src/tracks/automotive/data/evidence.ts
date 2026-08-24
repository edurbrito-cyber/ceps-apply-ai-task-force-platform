import ledgerCsv from "./session-01-ledger.csv?raw";
import type { ChannelId, EvidenceEvent } from "../types";

const variableMap: Record<string, ChannelId> = {
  "regulation and road access": "regulation",
  "deployment and scalability": "deployment",
  "data validation and safety assurance": "data",
  "technology and integration readiness": "technology",
  "investment procurement and business case": "finance",
  "public value workforce and trust": "publicValue",
  "European capability and competitiveness": "sovereignty"
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

const [headerLine, ...rows] = ledgerCsv.trim().split(/\r?\n/);
const headers = parseCsvLine(headerLine);

export const evidenceEvents: EvidenceEvent[] = rows.map((line) => {
  const values = parseCsvLine(line);
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  const channel = variableMap[row.variable];

  if (!channel) {
    throw new Error(`Unknown evidence variable: ${row.variable}`);
  }

  return {
    id: row.effect_id,
    date: row.as_of_date,
    title: row.title,
    channel,
    direction: row.direction as EvidenceEvent["direction"],
    impact: Number(row.impact),
    adjustedEffect: Number(row.adjusted_effect),
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    status: row.review_status as EvidenceEvent["status"],
    note: row.rationale
  };
});

export const evidenceMeta = {
  cutoffDate: "10 June 2026",
  baselineEvidence: evidenceEvents.filter(
    (event) => event.status === "accepted_desk_review"
  ).length
};

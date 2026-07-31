# `report.llm.json` Schema v3 (Health Report)

`report.llm.json` is the sole narrative input for health mode. `render` validates its fields before generating `report.md` and `report.html`.

## Required Structure
```json
{
  "schema_version": "3.0.0",
  "health_assessment": "string",
  "cross_metric_insights": ["string"],
  "behavioral_patterns": ["string"],
  "overview": "string",
  "key_findings": ["string"],
  "strengths": ["string"],
  "watchouts": ["string"],
  "actions_next_2_weeks": ["string"],
  "when_to_seek_care": ["string"],
  "questions_for_doctor": ["string"],
  "data_limitations": ["string"],
  "chart_callouts": [
    {
      "chart_id": "sleep | recovery | activity | bodyComposition | menstrualCycle",
      "title": "string",
      "summary": "string"
    }
  ],
  "disclaimer": "string"
}
```

## v3 Fields

### `health_assessment` (Recent Data Summary)
1 short paragraph written as a conservative consumer-data summary:
- Integrate personal trends, cross-metric signals, sample coverage, and missing-data boundaries
- Identify primary concerns (rather than listing data)
- Provide overall directional guidance
- Use one judgment, one priority, and one material uncertainty. Do not repeat
  values that are already obvious in the summary cards unless they support the
  priority.
- Do not invent an overall health score or interpret the legacy
  `crossMetric.compositeAssessment` fields; their score values are intentionally
  `null`

### `cross_metric_insights` (Cross-Metric Correlation Analysis)
2-4 items, each must correlate two or more metrics:
- Format: "Metric A + Metric B → observed association + specific data + sample boundary"
- Example: "Across 8 paired nights, nights with < 6 hours of sleep were followed by 12% lower average HRV than the comparison group; this is an association in the recorded data, not proof that short sleep caused the change."
- Source: `crossMetric` field in `insights.json`

### `behavioral_patterns` (Behavioral Pattern Recognition)
1-3 items describing detected behavioral patterns:
- Format: "Pattern name + data evidence + health impact + adjustment advice"
- Source: `crossMetric.patterns` in `insights.json`

### `questions_for_doctor` (Doctor Visit Preparation)
0-3 data-driven questions for the user's next appointment:
- Must be based on the user's actual data, not generic questions
- Include specific values, e.g., "My resting heart rate increased from 58 to 63 bpm — should I get further evaluation?"
- Help users communicate more efficiently with their doctor
- Source: `crossMetric`, `riskFlags`, `notableChanges` in `insights.json`

## Writing Requirements
- **Language**: Match the language specified by `narrativeContext.language` in `insights.json` (Chinese or English).
- `behavioral_patterns`, `strengths`, `watchouts`, `when_to_seek_care`, and
  `questions_for_doctor` may be empty when the structured data does not support
  them. Other arrays must contain at least one item.
- `chart_callouts` must cover existing chart IDs; do not use unknown IDs.
- You may reorder priorities but must not contradict structured facts in `summary.json` / `insights.json`.
- When explaining trends, prioritize combining `crossMetric` cross-metric analysis with `historicalContext` multi-time-window context.
- Professional health management interpretations are encouraged (recovery load, schedule stability, training-weight consistency), but do not cross into diagnosis.
- **`key_findings` must cite cross-metric evidence** — do not report single-metric changes in isolation.
- **`actions_next_2_weeks` must be concrete**: specify an observation window,
  frequency, or a small behavioral target when supported. Do not prescribe
  aggressive exercise, sleep, or medical targets from device data alone.
- Round narrative values to useful consumer precision: usually 0.1 hour,
  whole minutes, and one decimal for heart rate, HRV, body metrics, percentages,
  and load estimates. Do not copy two-decimal output when it adds no meaning.
- Avoid repeating the same fact across `health_assessment`, `overview`,
  `key_findings`, and `chart_callouts`. Each field has a separate job:
  assessment = judgment; overview = priority; findings = evidence; callouts =
  chart-specific interpretation.

## Recommended Style
- `health_assessment`: 60-90 English words or roughly 120-180 Chinese
  characters. One judgment + one priority + one uncertainty.
- `cross_metric_insights`: 2-4 items. Cross-metric associations with sample boundaries; do not claim causation.
- `behavioral_patterns`: 1-3 items. Pattern + impact + advice.
- `overview`: 1-2 sentences. State the current priority without replaying the assessment.
- `key_findings`: 2-3 items. Prioritize "recent vs. long-term" evidence and implications.
- `strengths`: 1-3 items. Trends that are improving.
- `watchouts`: 1-4 items. The most noteworthy risks and concerns.
- `actions_next_2_weeks`: 2-4 items. Specific, actionable, short-cycle recommendations.
- `when_to_seek_care`: 0-3 items. Leave empty when there is no actual
  risk, persistent change, or symptom-contingent follow-up supported by the data.
- `questions_for_doctor`: 0-3 items. Only include data-driven appointment questions when a medically relevant follow-up is supported.
- `data_limitations`: 1-4 items. Note sparse samples, unstable sources, limited coverage, etc.
- `disclaimer`: Standard boundary statement — "health management reference, not a medical diagnosis."

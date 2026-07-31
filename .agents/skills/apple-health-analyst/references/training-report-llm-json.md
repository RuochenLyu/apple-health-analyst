# `training.report.llm.json` Schema v2

`training.report.llm.json` is the sole narrative input for training mode. `render --type training` validates it before generating `training.report.md` and `training.report.html`.

## Required Structure

```json
{
  "schema_version": "2.0.0",
  "training_assessment": "string",
  "overall_findings": ["string"],
  "sport_sections": [
    {
      "sport_id": "string",
      "title": "string",
      "assessment": "string",
      "key_signals": ["string"],
      "recommendations": ["string"]
    }
  ],
  "watchouts": ["string"],
  "actions_next_2_weeks": ["string"],
  "questions_for_doctor": ["string"],
  "data_limitations": ["string"],
  "chart_callouts": [
    {
      "chart_id": "training_load | training_recovery | sport_<slug>_trend",
      "title": "string",
      "summary": "string"
    }
  ],
  "disclaimer": "string"
}
```

## Field Intent

### `training_assessment`

1 short paragraph that synthesizes:

- current `trainingState`
- `readiness`
- **MET-minute EWMA load snapshot** from `training.summary.trainingLoad` —
  prefer its relative 30/90-day changes over coarse "30 day vs 90 day"
  phrases when available. Express it as "42 日负荷基线 (CTL) / 7 日近期负荷
  (ATL) / 负荷差 (TSB)" in Chinese or "42-day load baseline (CTL) / 7-day
  recent load (ATL) / load balance (TSB)" in English. Do not call these
  fitness, fatigue, form, or readiness.
- whether recovery supports the recent load
- the main sport or the lack of a stable primary sport

### `overall_findings`

2-4 items covering the most important load, recovery, and consistency observations:

- lead with relative CTL direction and use TSB only to describe whether recent
  load is above or below the longer-term baseline; never apply an absolute TSB
  threshold or infer strain without recovery evidence
- cite the 30-day / 90-day CTL deltas in `training.summary.trainingLoad.ctlDelta30dPct`
  and `ctlDelta90dPct` rather than the legacy `loadTrend.recent30dEquivDurationMinutes`
- mention concrete values when possible
- prefer multi-signal reasoning over isolated facts
- if `trainingLoad` is `null` (e.g. < 28 days of coverage or < 6 workouts),
  fall back to the legacy 30d-vs-90d signals but say so explicitly

### `sport_sections`

One item per sport in `training.sports[]`. Do not invent sections for sports that are not present.

- `sport_id` must exactly match `training.sports[].id`
- `title` should be sport-specific and short
- `assessment` should summarize the current direction of that sport
- `key_signals` should cite actual structured evidence
- `recoveryAfterWorkout` deltas compare the day after that sport with other
  observed days in the same trailing 180-day window. They are not comparisons
  with "non-training days." Cite the post-sport and comparator sample counts,
  and do not interpret a delta when either group has fewer than five samples.
- `recommendations` should be specific, short-horizon training-management
  actions for recently active sports. Use an empty array when the sport has no
  workouts in the last 30 days; do not manufacture a restart plan.

### `chart_callouts`

- only reference chart IDs that already exist in `training.charts[]`
- summarize what the chart means, not what it visually looks like
- prefer long-term direction and load/recovery interaction over single-session commentary
- for `training_load` (CTL / ATL curve), describe relative direction and then
  corroborate any status with sleep/HRV/resting-heart-rate evidence; a negative
  TSB alone only means recent estimated load is above the 42-day baseline

## Writing Requirements

- Match the language declared in `training.narrativeContext.language`
- Use neutral wording inspired by public training-status concepts, not brand claims
- Do not infer hidden metrics; if a sport has no heart rate or distance output, do not describe those metrics
- Focus on training management, recovery monitoring, and health-awareness advice
- Keep advice specific and time-bounded
- `questions_for_doctor` should only appear when the data supports a medically relevant follow-up
- Do not prescribe a fixed number of sessions for a named sport unless the user
  explicitly requested a program. Prefer conditional changes that adjust only
  one of frequency or duration at a time.
- Round narrative values to useful consumer precision: whole workout minutes
  and energy, one decimal for CTL/ATL/TSB and physiological metrics.
- Avoid replaying the same values in `training_assessment`,
  `overall_findings`, chart callouts, and sport sections.

## Recommended Style

- `training_assessment`: 60-90 English words or roughly 120-180 Chinese
  characters; one judgment, one priority, and one uncertainty
- `overall_findings`: 2-3 items
- `sport_sections`: exactly one section per item in `training.sports[]` (up to the configured `--top-sports` limit)
- `watchouts`: 1-4 items
- `actions_next_2_weeks`: 2-4 items
- `questions_for_doctor`: 0-3 items
- `data_limitations`: 1-4 items
- `disclaimer`: standard boundary statement such as "training-management reference, not medical diagnosis"

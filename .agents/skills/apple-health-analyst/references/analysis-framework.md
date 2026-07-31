# Health Data Interpretation Framework

This framework guides conservative interpretation of consumer Apple Health data.
It supports health-management reflection, not diagnosis, screening, or treatment.

## 1. Start With the Personal Baseline

- Prefer a repeated within-person trend over a population cutoff or one reading.
- State the time window, source, sample count, and missing-data boundary.
- Treat Apple Watch sleep stages, SpO2, VO2 Max, HRV, and similar outputs as
  device estimates. They may be useful for trends but are not interchangeable
  with clinical measurements.
- A change is an association in the recorded data. Do not claim that sleep,
  training, stress, or another behavior caused it.
- Do not collapse heterogeneous consumer-device metrics into an overall health
  score. Fixed weights and cutoffs create false precision across different
  people, devices, recording habits, and missing-data patterns.

## 2. Sleep and Recovery

- Compare sleep duration and regularity with next-day HRV or resting heart rate
  only when paired samples exist.
- Describe direction and paired-sample count. Do not assign a universal HRV
  response percentage.
- Use sleep-stage proportions as secondary context. Device-estimated deep or
  REM sleep alone must not trigger a disease inference or a sleep-apnea prompt.
- When timing looks late or irregular, prioritize adequate total sleep and a
  sustainable wake-time anchor rather than prescribing one universal bedtime.

## 3. Resting Heart Rate and HRV

- Lower resting heart rate with higher HRV may be directionally consistent with
  stronger recent recovery signals; the inverse may be directionally consistent
  with strain or reduced recovery.
- These combinations do not identify a cause. Discuss plausible context only
  when the export contains supporting sleep or training evidence.
- HRV varies substantially between people, devices, and measurement conditions.
  Interpret it against the selected source's personal baseline.

## 4. Training Load and Recovery Support

- This project estimates load in MET-minutes. CTL is a 42-day EWMA personal load
  baseline, ATL is a 7-day EWMA recent load, and TSB is CTL minus ATL.
- These values are load proxies, not direct measures of fitness, fatigue, form,
  recovery, or readiness. Never import absolute TSB thresholds from a TSS-based
  system.
- Use relative load direction together with explicit recovery evidence and
  subjective context. If recovery data is missing, say that readiness is
  insufficient rather than inferring that it is good.
- A weekend-concentrated pattern describes distribution only. If total activity
  is similar, do not claim weaker cardiovascular benefit; the export also cannot
  establish injury risk.

## 5. Behavioral Patterns

Patterns such as weekend concentration, sleep catch-up, late timing, or several
high-load days are prompts for reflection, not diagnoses:

- Cite the exact dates or comparison window.
- Use "may be associated with" or "worth monitoring."
- Recommend reversible tracking or schedule experiments.
- Do not infer cognitive, metabolic, immune, hormonal, or disease outcomes from
  the pattern alone.

## 6. Composite Scores

The Sleep, Recovery, and Activity scores are transparent prioritization aids.
Use them to compare dimensions within the same report, not as validated clinical
scores or precise measures of health.

- Explain the underlying inputs when mentioning a score.
- Do not compare scores across people or devices.
- Do not let a score override a clear data gap or repeated concerning reading.

## 7. Escalation Boundaries

Use conservative medical follow-up language only for repeated or sustained
patterns, or when the user reports symptoms:

- resting heart rate repeatedly above the person's baseline or persistently
  above a common adult resting reference range;
- HRV and resting heart rate both worsening over a sustained period;
- average SpO2 across multiple recent device readings at or below 93%;
- a sustained, unexplained decline in exercise tolerance;
- rapid, unintentional weight change.

Consumer-device data does not establish a diagnosis. Recommend confirming
measurement quality and say "if this persists or occurs with symptoms, consult
a clinician." Urgent symptoms such as chest pain, severe shortness of breath,
fainting, or confusion require prompt medical care regardless of the report.

## 8. Source Notes

- Apple states that Blood Oxygen measurements are not intended for medical use.
- Apple describes sleep-stage results as estimates.
- Public-health activity recommendations describe weekly volume; they do not
  validate this project's MET-minute readiness model.

When guidance may have changed or a real medical decision depends on it, consult
current official clinical or public-health sources before answering.

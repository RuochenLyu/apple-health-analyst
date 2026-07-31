# Changelog

All notable changes to this project are documented here.

## [2.0.0] - 2026-07-31

### Added

- Cross-metric paired-sample analysis, per-metric recovery coverage, workout
  deduplication, strict date boundaries, and source-aware unit normalization.
- Deterministic, fully synthetic bilingual demo fixtures and a CI check that
  keeps the published sample reports aligned with the renderer.
- Node.js 22 and 24 CI, package smoke tests, privacy documentation, and an
  OIDC-based npm publishing workflow.

### Changed

- Redesigned the complementary health and multi-sport training reports in
  Chinese and English around one current assessment, priority actions,
  supporting evidence, domain details, explicit data boundaries, and offline
  cross-links.
- Added evidence gates and conservative relative-change labels to the existing
  CTL, ATL, and TSB context so MET-minute proxies are not presented as direct
  fitness, fatigue, or readiness measurements.
- Long-range charts now use one consistent granularity per series, real
  time-proportional spacing, density-aware markers, readable ticks, and gaps
  rather than compressing late records into one cluster.
- Historical or currently inactive sports are collapsed and no longer receive
  generated short-horizon recommendations.
- Public narrative contracts now require exact chart and sport coverage:
  health narrative schema `3.0.0`, training narrative schema `2.0.0`, and
  insight schema `3.0.0`.
- The supported runtime is now Node.js 22 or newer.

### Fixed

- Corrected the recent window to exactly 30 calendar days.
- Removed a decorative recovery sparkline that incorrectly connected latest,
  30-day, and 90-day summary values as if they formed a time series.
- Distinguished insufficient sport recovery evidence from a negative recovery
  signal and exposed sleep, HRV, and resting-heart-rate sample counts.
- Corrected English source labels, locale-specific punctuation, VO2 Max units,
  misleading training terminology, duplicate source names, mobile recovery
  table columns, keyboard focus, and print behavior.

### Privacy

- Public samples now contain programmatically generated data only and are
  labeled as synthetic in every report.
- Input paths are reduced to basenames in structured output. Raw exports and
  personal reports remain local and excluded from package and repository
  output.

### Breaking changes

- Existing narrative files must be regenerated for the new schema versions.
- Node.js versions older than 22 are no longer supported.
- `--top-sports` accepts values from 1 through 8.

[2.0.0]: https://github.com/RuochenLyu/apple-health-analyst/releases/tag/v2.0.0

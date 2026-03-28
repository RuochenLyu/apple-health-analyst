import type { RenderT } from "../i18n/zh/render.js";
import type {
  ChartSeries,
  InsightBundle,
  NarrativeReport,
  NumericComparison,
  SourceConfidence,
} from "../types.js";

import {
  renderBarChart,
  renderLineSparkline,
  renderMultiSeriesLineChart,
} from "./chartSvg.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeFmt(insufficientLabel: string) {
  return function fmt(value: number | null, suffix = ""): string {
    return value === null ? insufficientLabel : `${value}${suffix}`;
  };
}

function makeFmtCount(locale: string) {
  return function fmtCount(value: number): string {
    return value.toLocaleString(locale);
  };
}

function makeFmtDelta(dash: string) {
  return function fmtDelta(value: number | null, unit: string): string {
    if (value === null) {
      return dash;
    }
    const sign = value > 0 ? "+" : "";
    return `${sign}${value} ${unit}`.trim();
  };
}

function sectionCallout(
  narrative: NarrativeReport,
  chartId: InsightBundle["charts"][number]["id"],
  fallback: string,
): string {
  const callout = narrative.chart_callouts.find((item) => item.chart_id === chartId);
  return callout?.summary ?? fallback;
}

function makeConfidenceLabel(t: RenderT) {
  return function confidenceLabel(level: SourceConfidence["level"]): string {
    if (level === "high") return t.confidenceHigh;
    if (level === "medium") return t.confidenceMedium;
    return t.confidenceLow;
  };
}

function confidenceClass(level: SourceConfidence["level"]): string {
  if (level === "high") return "badge--ok";
  if (level === "medium") return "badge--warn";
  return "badge--low";
}

function moduleConfidence(
  insights: InsightBundle,
  module: SourceConfidence["module"],
): SourceConfidence | undefined {
  return insights.sourceConfidence.find((entry) => entry.module === module);
}

function renderLegend(items: Array<{ label: string; color: string }>): string {
  return `<div class="legend">${items
    .map(
      (item) =>
        `<span class="legend-item"><i style="background:${item.color}"></i>${escapeHtml(item.label)}</span>`,
    )
    .join("")}</div>`;
}

function renderMetricCard(label: string, value: string, accent: string, sub?: string): string {
  return `<div class="metric-card" style="border-top:3px solid ${accent}">
    <div class="metric-card__label">${escapeHtml(label)}</div>
    <div class="metric-card__value">${escapeHtml(value)}</div>
    ${sub ? `<div class="metric-card__sub">${escapeHtml(sub)}</div>` : ""}
  </div>`;
}

function renderRecoveryRow(
  label: string,
  metric: NumericComparison | undefined,
  color: string,
  t: RenderT,
  fmt: (value: number | null, suffix?: string) => string,
  fmtDelta: (value: number | null, unit: string) => string,
): string {
  if (!metric) {
    return `<tr class="ledger__row ledger__row--empty">
      <td class="ledger__name">${escapeHtml(label)}</td>
      <td colspan="4" class="ledger__empty">${escapeHtml(t.recentSamplesInsufficient)}</td>
      <td></td>
    </tr>`;
  }

  const sparkSeries: ChartSeries = {
    id: label,
    label,
    unit: metric.unit,
    visual: "line",
    points: [
      {
        start: metric.latest?.timestamp ?? new Date().toISOString(),
        end: metric.latest?.timestamp ?? new Date().toISOString(),
        granularity: "day",
        label: t.sparkBaseline,
        value: metric.baseline90d.average,
        sampleCount: metric.baseline90d.sampleCount,
      },
      {
        start: metric.latest?.timestamp ?? new Date().toISOString(),
        end: metric.latest?.timestamp ?? new Date().toISOString(),
        granularity: "day",
        label: t.sparkRecent,
        value: metric.recent30d.average,
        sampleCount: metric.recent30d.sampleCount,
      },
      {
        start: metric.latest?.timestamp ?? new Date().toISOString(),
        end: metric.latest?.timestamp ?? new Date().toISOString(),
        granularity: "day",
        label: t.sparkLatest,
        value: metric.latest?.value ?? null,
        sampleCount: metric.latest ? 1 : 0,
      },
    ],
  };

  const deltaClass =
    metric.delta !== null && metric.delta > 0
      ? "delta--up"
      : metric.delta !== null && metric.delta < 0
        ? "delta--down"
        : "";

  return `<tr class="ledger__row">
    <td class="ledger__name">
      <strong>${escapeHtml(label)}</strong>
      <small>${escapeHtml(t.coverageDays(metric.coverageDays))}</small>
    </td>
    <td class="ledger__val">${escapeHtml(fmt(metric.latest?.value ?? null, ` ${metric.unit}`))}</td>
    <td class="ledger__val">${escapeHtml(fmt(metric.recent30d.average, ` ${metric.unit}`))}</td>
    <td class="ledger__val">${escapeHtml(fmt(metric.baseline90d.average, ` ${metric.unit}`))}</td>
    <td class="ledger__val ${deltaClass}">${escapeHtml(fmtDelta(metric.delta, metric.unit))}</td>
    <td class="ledger__spark">${renderLineSparkline(sparkSeries, color, { width: 120, height: 36 }, t)}</td>
  </tr>`;
}

function renderBodyDetail(
  series: ChartSeries,
  color: string,
  fmt: (value: number | null, suffix?: string) => string,
  t?: RenderT,
): string {
  const latest = series.points.at(-1)?.value ?? null;
  return `<div class="body-card">
    <div class="body-card__head">
      <span class="body-card__label">${escapeHtml(series.label)}</span>
      <span class="body-card__value">${escapeHtml(fmt(latest, series.unit ? ` ${series.unit}` : ""))}</span>
    </div>
    <div class="body-card__chart">${renderMultiSeriesLineChart([series], [color], {
      width: 400,
      height: 140,
    }, t)}</div>
  </div>`;
}

export function renderReportHtml(insights: InsightBundle, narrative: NarrativeReport, t: RenderT): string {
  const fmt = makeFmt(t.insufficientData);
  const fmtCount = makeFmtCount(t.locale);
  const fmtDelta = makeFmtDelta(t.dash);
  const confidenceLabel = makeConfidenceLabel(t);
  const sleepChart = insights.charts.find((chart) => chart.id === "sleep");
  const recoveryChart = insights.charts.find((chart) => chart.id === "recovery");
  const activityChart = insights.charts.find((chart) => chart.id === "activity");
  const bodyChart = insights.charts.find((chart) => chart.id === "bodyComposition");
  const menstrualChart = insights.charts.find((chart) => chart.id === "menstrualCycle");

  const sleepConf = moduleConfidence(insights, "sleep");
  const recoveryConf = moduleConfidence(insights, "recovery");
  const activityConf = moduleConfidence(insights, "activity");
  const bodyConf = moduleConfidence(insights, "bodyComposition");
  const menstrualConf = menstrualChart ? moduleConfidence(insights, "menstrualCycle") : undefined;

  // Charts
  const sleepSvg = sleepChart
    ? renderMultiSeriesLineChart(sleepChart.series, ["#6366F1", "#818CF8", "#A78BFA"], {
        width: 700,
        height: 220,
      }, t)
    : "";

  const activityPrimarySeries =
    activityChart?.series.filter((s) => s.id !== "activity_workouts") ?? [];
  const activitySvg =
    activityPrimarySeries.length > 0
      ? renderMultiSeriesLineChart(activityPrimarySeries, ["#F97316", "#FB923C", "#10B981"], {
          width: 700,
          height: 220,
        }, t)
      : "";
  const workoutBars =
    activityChart?.series.find((s) => s.id === "activity_workouts")
      ? renderBarChart(
          activityChart.series.find((s) => s.id === "activity_workouts")!,
          "#F97316",
          { width: 700, height: 120 },
          t,
        )
      : "";

  // Callouts
  const sleepCallout = sectionCallout(
    narrative,
    "sleep",
    sleepChart?.subtitle ?? t.sleepCalloutFallback,
  );
  const recoveryCallout = sectionCallout(
    narrative,
    "recovery",
    recoveryChart?.subtitle ?? t.recoveryCalloutFallback,
  );
  const activityCallout = sectionCallout(
    narrative,
    "activity",
    activityChart?.subtitle ?? t.activityCalloutFallback,
  );
  const bodyCallout = sectionCallout(
    narrative,
    "bodyComposition",
    bodyChart?.subtitle ?? t.bodyCalloutFallback,
  );
  const menstrualCallout = menstrualChart
    ? sectionCallout(narrative, "menstrualCycle", menstrualChart.subtitle)
    : "";

  const menstrualCycleLengthSeries = menstrualChart?.series.find((s) => s.id === "cycle_length");
  const menstrualPeriodDurationSeries = menstrualChart?.series.find((s) => s.id === "period_duration");
  const menstrualCycleSvg = menstrualCycleLengthSeries
    ? renderMultiSeriesLineChart([menstrualCycleLengthSeries], ["#EC4899"], { width: 700, height: 180 }, t)
    : "";
  const menstrualPeriodBars = menstrualPeriodDurationSeries
    ? renderBarChart(menstrualPeriodDurationSeries, "#F472B6", { width: 700, height: 120 }, t)
    : "";

  // Cross-metric data
  const cm = insights.crossMetric;
  const sleepVal = fmt(insights.analysis.sleep.recent30d.avgSleepHours, "h");
  const hrVal = fmt(
    insights.analysis.recovery.metrics.restingHeartRate?.recent30d.average ?? null,
    " bpm",
  );
  const riskCount = insights.riskFlags.length;
  const gapCount = insights.dataGaps.length;

  return `<!doctype html>
<html lang="${t.htmlLang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(t.reportTitle)}</title>
    <meta property="og:title" content="${escapeHtml(t.reportTitle)}" />
    <meta property="og:description" content="${escapeHtml(t.footerTagline)}" />
    <meta property="og:type" content="article" />
    <meta name="description" content="${escapeHtml(t.footerTagline)}" />
    <style>
      :root {
        --bg: #F2F2F7;
        --surface: #FFFFFF;
        --ink: #1C1C1E;
        --ink-secondary: #3A3A3C;
        --muted: #8E8E93;
        --faint: #AEAEB2;
        --border: #E5E5EA;
        --border-light: #F2F2F7;
        --sleep: #6366F1;
        --sleep-bg: #EEF2FF;
        --recovery: #10B981;
        --recovery-bg: #ECFDF5;
        --activity: #F97316;
        --activity-bg: #FFF7ED;
        --body: #6B7280;
        --body-bg: #F3F4F6;
        --menstrual: #EC4899;
        --menstrual-bg: #FDF2F8;
        --risk: #EF4444;
        --risk-bg: #FEF2F2;
        --positive: #22C55E;
        --positive-bg: #F0FDF4;
        --fs-xs: 11px;
        --fs-sm: 13px;
        --fs-base: 15px;
        --fs-lg: 18px;
        --fs-xl: 22px;
        --fs-2xl: 28px;
        --radius: 10px;
        --radius-sm: 6px;
        --shadow: none;
        --shadow-md: none;
      }
      * { box-sizing: border-box; margin: 0; }
      html {
        scroll-behavior: smooth;
        background: var(--bg);
      }
      body {
        color: var(--ink);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: var(--fs-base);
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
      }

      /* ─── Topbar ─── */
      .topbar {
        position: sticky;
        top: 0;
        z-index: 100;
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--border);
        padding: 0 24px;
        display: flex;
        align-items: center;
        gap: 24px;
        height: 52px;
      }
      .topbar__title {
        font-weight: 600;
        font-size: var(--fs-base);
        white-space: nowrap;
      }
      .topbar__date {
        color: var(--muted);
        font-size: var(--fs-sm);
        white-space: nowrap;
      }
      .topbar__nav {
        display: flex;
        gap: 2px;
        margin-left: auto;
      }
      .topbar__nav a {
        display: inline-flex;
        align-items: center;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: var(--fs-sm);
        font-weight: 500;
        color: var(--muted);
        text-decoration: none;
        transition: background 0.15s, color 0.15s;
      }
      .topbar__nav a:hover {
        background: var(--border-light);
        color: var(--ink);
      }

      /* ─── Layout ─── */
      main {
        max-width: 1100px;
        margin: 0 auto;
        padding: 24px 20px 0;
      }
      section {
        scroll-margin-top: 64px;
      }

      /* ─── Summary Cards ─── */
      .summary-cards {
        display: flex;
        gap: 16px;
        margin-bottom: 28px;
      }
      .metric-card {
        flex: 1 1 0;
        min-width: 0;
        background: var(--surface);
        border-radius: var(--radius);
        padding: 20px 22px;
        box-shadow: var(--shadow);
      }
      .metric-card__label {
        font-size: var(--fs-sm);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--muted);
        margin-bottom: 6px;
      }
      .metric-card__value {
        font-size: var(--fs-2xl);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
      }
      .metric-card__sub {
        font-size: var(--fs-sm);
        color: var(--faint);
        margin-top: 4px;
      }

      /* ─── Overview ─── */
      .overview {
        background: var(--surface);
        border-radius: var(--radius);
        padding: 28px;
        margin-bottom: 28px;
      }
      .overview__title {
        font-size: var(--fs-lg);
        font-weight: 700;
        margin-bottom: 12px;
      }
      .overview__text {
        font-size: var(--fs-base);
        line-height: 1.75;
        color: var(--ink-secondary);
        max-width: 72ch;
      }
      .overview__findings {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid var(--border);
      }
      .overview__findings h3 {
        font-size: var(--fs-base);
        font-weight: 600;
        margin-bottom: 12px;
        color: var(--ink);
      }
      .overview__findings ol {
        padding-left: 20px;
        display: grid;
        gap: 8px;
      }
      .overview__findings li {
        font-size: var(--fs-base);
        line-height: 1.65;
        color: var(--ink-secondary);
      }
      .pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        padding: 5px 12px;
        border-radius: 999px;
        font-size: var(--fs-sm);
        font-weight: 500;
      }
      .pill--risk {
        background: var(--risk-bg);
        color: var(--risk);
      }
      .pill--info {
        background: var(--border-light);
        color: var(--muted);
      }

      /* ─── Module ─── */
      .module {
        background: var(--surface);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        margin-bottom: 36px;
        overflow: hidden;
      }
      .module__header {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 18px 24px;
        border-bottom: 1px solid var(--border);
      }
      .module__index {
        font-size: var(--fs-sm);
        font-weight: 700;
        color: var(--faint);
        min-width: 28px;
      }
      .module__title {
        font-size: var(--fs-lg);
        font-weight: 700;
      }
      .module__callout {
        margin-left: auto;
        font-size: var(--fs-sm);
        color: var(--muted);
        max-width: 40ch;
        text-align: right;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: var(--fs-xs);
        font-weight: 600;
        letter-spacing: 0.03em;
      }
      .badge--ok { background: var(--positive-bg); color: var(--positive); }
      .badge--warn { background: #FFF7ED; color: #D97706; }
      .badge--low { background: var(--risk-bg); color: var(--risk); }

      .module__body {
        display: grid;
        grid-template-columns: minmax(0, 1.3fr) minmax(260px, 0.7fr);
        gap: 0;
      }
      .module__chart {
        padding: 20px 24px;
        overflow: hidden;
        min-width: 0;
      }
      .module__aside {
        padding: 20px 24px;
        border-left: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .module--sleep { border-left: 4px solid var(--sleep); }
      .module--sleep .module__index { color: var(--sleep); }
      .module--recovery { border-left: 4px solid var(--recovery); }
      .module--recovery .module__index { color: var(--recovery); }
      .module--activity { border-left: 4px solid var(--activity); }
      .module--activity .module__index { color: var(--activity); }
      .module--body { border-left: 4px solid var(--body); }
      .module--body .module__index { color: var(--body); }
      .module--menstrual { border-left: 4px solid var(--menstrual); }
      .module--menstrual .module__index { color: var(--menstrual); }

      .chart-wrap {
        padding: 8px 0 4px;
      }
      .chart-wrap svg {
        width: 100%;
        height: auto;
      }

      /* ─── Legend ─── */
      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-top: 8px;
      }
      .legend-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: var(--fs-sm);
        color: var(--muted);
      }
      .legend-item i {
        display: inline-block;
        width: 14px;
        height: 3px;
        border-radius: 999px;
      }

      /* ─── Metric Rail ─── */
      .metric-rail {
        display: grid;
        gap: 14px;
      }
      .metric-rail__item {
        padding-top: 12px;
        border-top: 1px solid var(--border);
      }
      .metric-rail__label {
        font-size: var(--fs-sm);
        color: var(--muted);
        margin-bottom: 4px;
      }
      .metric-rail__value {
        font-size: var(--fs-xl);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
      }
      .metric-rail__note {
        font-size: var(--fs-xs);
        color: var(--faint);
        margin-top: 2px;
      }
      .metric-rail__item:first-child {
        border-top: none;
        padding-top: 0;
      }

      /* ─── Note Block ─── */
      .note-block {
        padding-top: 14px;
        border-top: 1px solid var(--border);
      }
      .note-block h4 {
        font-size: var(--fs-sm);
        font-weight: 600;
        margin-bottom: 6px;
      }
      .note-block p,
      .note-block li {
        font-size: var(--fs-sm);
        line-height: 1.65;
        color: var(--ink-secondary);
      }
      .note-block ul {
        list-style: none;
        padding: 0;
        display: grid;
        gap: 6px;
      }
      .note-block li::before {
        content: "\\2022\\00a0";
        color: var(--faint);
      }
      .module__aside > :first-child {
        border-top: none;
        padding-top: 0;
      }

      /* ─── Ledger (Recovery Table) ─── */
      .ledger {
        width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        font-size: var(--fs-sm);
      }
      .ledger th {
        text-align: left;
        font-size: var(--fs-xs);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--faint);
        padding: 0 8px 10px;
        white-space: nowrap;
      }
      .ledger__row td {
        padding: 12px 8px;
        border-top: 1px solid var(--border);
        vertical-align: middle;
      }
      .ledger__row--empty td {
        color: var(--faint);
      }
      .ledger__name {
        white-space: nowrap;
      }
      .ledger__name strong {
        display: block;
        font-size: var(--fs-base);
      }
      .ledger__name small {
        display: block;
        margin-top: 2px;
        color: var(--faint);
        font-size: var(--fs-xs);
      }
      .ledger__val {
        font-variant-numeric: tabular-nums;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ledger__empty {
        color: var(--faint);
        font-style: italic;
      }
      .delta--up { color: var(--activity); }
      .delta--down { color: var(--recovery); }
      .ledger__spark {
        width: 120px;
        max-width: 120px;
        overflow: hidden;
      }
      .ledger__spark svg {
        display: block;
        width: 100%;
        height: auto;
      }

      /* ─── Activity Summary ─── */
      .activity-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-top: 14px;
      }
      .activity-stats__item {
        padding-top: 10px;
        border-top: 1px solid var(--border);
      }
      .activity-stats__item span {
        font-size: var(--fs-sm);
        color: var(--muted);
      }
      .activity-stats__item strong {
        display: block;
        margin-top: 4px;
        font-size: var(--fs-xl);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      /* ─── Body Composition ─── */
      .body-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        padding: 20px 24px;
      }
      .body-card {
        border-top: 1px solid var(--border);
        padding-top: 14px;
      }
      .body-card__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 10px;
      }
      .body-card__label {
        font-size: var(--fs-sm);
        font-weight: 600;
        color: var(--muted);
      }
      .body-card__value {
        font-size: var(--fs-xl);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .body-card__chart {
        background: var(--bg);
        border-radius: var(--radius-sm);
        padding: 8px;
      }
      .body-card__chart svg {
        width: 100%;
        height: auto;
      }

      /* ─── Actions ─── */
      .actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 24px;
      }
      .actions__card {
        background: var(--surface);
        border-radius: var(--radius);
        padding: 24px;
        box-shadow: var(--shadow);
      }
      .actions__card h3 {
        font-size: var(--fs-base);
        font-weight: 700;
        margin-bottom: 14px;
      }
      .actions__card ol,
      .actions__card ul {
        padding-left: 18px;
        display: grid;
        gap: 8px;
      }
      .actions__card li {
        font-size: var(--fs-base);
        line-height: 1.65;
        color: var(--ink-secondary);
      }
      .actions__card--warn {
        border-left: 3px solid var(--risk);
      }

      /* ─── Appendix ─── */
      .appendix {
        background: var(--surface);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        padding: 28px;
        margin-bottom: 24px;
      }
      .appendix__grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 28px;
        margin-top: 20px;
      }
      .appendix h3 {
        font-size: var(--fs-base);
        font-weight: 700;
        margin-bottom: 12px;
      }
      .confidence-list {
        list-style: none;
        padding: 0;
        display: grid;
        gap: 10px;
      }
      .confidence-list li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-top: 1px solid var(--border);
      }
      .confidence-list li div {
        display: grid;
        gap: 2px;
      }
      .confidence-list li strong {
        font-size: var(--fs-base);
      }
      .confidence-list li small {
        font-size: var(--fs-sm);
        color: var(--muted);
      }

      .disclaimer {
        margin-top: 24px;
        font-size: var(--fs-sm);
        line-height: 1.65;
        color: var(--faint);
      }

      /* ─── Assessment ─── */
      .assessment {
        background: var(--surface);
        border-radius: var(--radius);
        box-shadow: var(--shadow-md);
        margin-bottom: 24px;
        display: grid;
        grid-template-columns: 1fr 200px;
      }
      .assessment__main {
        padding: 32px;
      }
      .assessment__main h1 {
        font-size: var(--fs-xl);
        font-weight: 700;
        margin-bottom: 16px;
      }
      .assessment__text {
        font-size: var(--fs-base);
        line-height: 1.8;
        color: var(--ink-secondary);
      }
      .assessment__aside {
        padding: 32px 28px;
        border-left: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
      }
      .scores {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
      }
      .score-ring {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 12px 0;
        border-top: 1px solid var(--border);
      }
      .score-ring:first-child {
        border-top: none;
        padding-top: 0;
      }
      .score-ring__value {
        font-size: var(--fs-2xl);
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        line-height: 1;
      }
      .score-ring__label {
        font-size: var(--fs-sm);
        font-weight: 500;
        color: var(--muted);
      }
      .readiness-badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 16px;
        border-radius: 999px;
        font-size: var(--fs-base);
        font-weight: 600;
      }
      .readiness--good { background: var(--positive-bg); color: var(--positive); }
      .readiness--moderate { background: #FFF7ED; color: #D97706; }
      .readiness--low { background: var(--risk-bg); color: var(--risk); }

      /* ─── Insights Section ─── */
      .insights-section {
        background: var(--surface);
        border-radius: var(--radius);
        padding: 28px;
        margin-bottom: 28px;
      }
      .insights-section h2 {
        font-size: var(--fs-lg);
        font-weight: 700;
        margin-bottom: 16px;
      }
      .insight-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }
      .insight-grid__title {
        font-size: var(--fs-base);
        font-weight: 600;
        margin-bottom: 12px;
      }
      .insight-card {
        padding: 14px 16px;
        background: var(--border-light);
        border-radius: var(--radius-sm);
        margin-bottom: 10px;
      }
      .insight-card:last-child {
        margin-bottom: 0;
      }
      .insight-card p {
        font-size: var(--fs-base);
        line-height: 1.7;
        color: var(--ink-secondary);
      }

      /* ─── Utility ─── */
      .section-intro {
        font-size: var(--fs-sm);
        line-height: 1.65;
        color: var(--ink-secondary);
        margin-bottom: 14px;
      }
      .actions--single {
        grid-template-columns: 1fr;
      }
      .appendix__title {
        font-size: var(--fs-lg);
        font-weight: 700;
      }
      .appendix__list {
        padding-left: 18px;
        display: grid;
        gap: 6px;
      }
      .appendix__list li {
        font-size: var(--fs-sm);
        line-height: 1.65;
        color: var(--ink-secondary);
      }
      /* ─── Site Footer ─── */
      .site-footer {
        margin-top: 0;
        padding: 24px 20px 32px;
        text-align: center;
        color: var(--muted);
        font-size: var(--fs-sm);
        line-height: 1.6;
      }
      .site-footer__brand {
        font-size: var(--fs-base);
        font-weight: 600;
        color: var(--ink-secondary);
        text-decoration: none;
      }
      .site-footer__brand:hover {
        color: var(--ink);
      }
      .site-footer__tagline {
        margin-top: 4px;
        color: var(--faint);
        font-size: var(--fs-xs);
      }
      .site-footer__links {
        display: inline-flex;
        align-items: center;
        gap: 20px;
        margin-top: 14px;
      }
      .site-footer__links a {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--muted);
        text-decoration: none;
        font-size: var(--fs-sm);
        transition: color 0.15s;
      }
      .site-footer__links a:hover {
        color: var(--ink);
      }
      .site-footer__links svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
        flex-shrink: 0;
      }

      /* ─── Responsive ─── */
      @media (max-width: 900px) {
        .summary-cards {
          flex-wrap: wrap;
        }
        .summary-cards .metric-card {
          flex: 1 1 calc(50% - 16px);
        }
        .assessment {
          grid-template-columns: 1fr;
        }
        .assessment__aside {
          border-left: 0;
          border-top: 1px solid var(--border);
          flex-direction: row;
          flex-wrap: wrap;
          justify-content: center;
        }
        .scores {
          flex-direction: row;
          justify-content: center;
        }
        .score-ring {
          border-top: none;
          padding-top: 0;
        }
        .module__body {
          grid-template-columns: 1fr;
        }
        .module__aside {
          border-left: 0;
          border-top: 1px solid var(--border);
        }
        .actions {
          grid-template-columns: 1fr;
        }
        .appendix__grid {
          grid-template-columns: 1fr;
        }
        .body-grid {
          grid-template-columns: 1fr;
        }
        .insight-grid {
          grid-template-columns: 1fr;
        }
        .topbar__nav {
          display: none;
        }
      }
      @media (max-width: 600px) {
        :root {
          --fs-2xl: 24px;
          --fs-xl: 18px;
        }
        .summary-cards .metric-card {
          flex: 1 1 calc(50% - 16px);
        }
        main {
          padding: 16px 12px 48px;
        }

        /* Topbar */
        .topbar {
          padding: 0 12px;
          height: 44px;
        }
        .topbar__title {
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .topbar__date {
          display: none;
        }

        /* Padding reduction */
        .assessment__main {
          padding: 20px 16px;
        }
        .assessment__aside {
          padding: 16px;
        }
        .module__header {
          padding: 14px 16px;
        }
        .module__chart,
        .module__aside {
          padding: 16px;
        }
        .overview,
        .insights-section,
        .appendix {
          padding: 20px 16px;
        }
        .actions__card {
          padding: 20px 16px;
        }
        .body-grid {
          padding: 16px;
        }

        /* Ledger: show name + latest + delta only */
        .ledger th:nth-child(n+3),
        .ledger__row td:nth-child(n+4) {
          display: none;
        }
        .ledger__spark {
          display: none;
        }

        .activity-stats {
          grid-template-columns: 1fr;
        }
      }

      /* ─── GitHub Link (topbar) ─── */
      .topbar__github {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 6px;
        border-radius: 50%;
        color: var(--muted);
        text-decoration: none;
        transition: background 0.15s, color 0.15s;
        flex-shrink: 0;
        margin-left: 6px;
      }
      .topbar__github:hover {
        background: var(--border-light);
        color: var(--ink);
      }
      .topbar__github svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
        display: block;
      }

      /* ─── Print ─── */
      @media print {
        .topbar, .site-footer { display: none; }
        main { padding: 0; max-width: none; }
        .module, .overview, .actions__card, .appendix, .metric-card {
          box-shadow: none;
          break-inside: avoid;
        }
        body { font-size: var(--fs-sm); }
        html { background: white; }
      }
    </style>
  </head>
  <body>
    <nav class="topbar">
      <span class="topbar__title">${escapeHtml(t.reportTitle)}</span>
      <span class="topbar__date">${escapeHtml(insights.coverage.windowStart ?? t.windowStart)} ~ ${escapeHtml(insights.coverage.windowEnd.slice(0, 10))}</span>
      <div class="topbar__nav">
        <a href="#assessment">${escapeHtml(t.navAssessment)}</a>
        <a href="#insights">${escapeHtml(t.navInsights)}</a>
        <a href="#sleep">${escapeHtml(t.navSleep)}</a>
        <a href="#recovery">${escapeHtml(t.navRecovery)}</a>
        <a href="#activity">${escapeHtml(t.navActivity)}</a>
        <a href="#body">${escapeHtml(t.navBody)}</a>
        ${menstrualChart ? `<a href="#menstrual">${escapeHtml(t.navMenstrual)}</a>` : ""}
        <a href="#appendix">${escapeHtml(t.navAppendix)}</a>
        <a href="https://github.com/RuochenLyu/apple-health-analyst" class="topbar__github" aria-label="GitHub" target="_blank" rel="noopener">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        </a>
      </div>
    </nav>

    <main>
      <!-- Summary Cards -->
      <section class="summary-cards">
        ${renderMetricCard(t.cardSleepAvg, sleepVal, "var(--sleep)", t.cardRecent30d)}
        ${renderMetricCard(t.cardRestingHr, hrVal, "var(--recovery)", t.cardRecent30d)}
        ${renderMetricCard(
          t.cardRiskSignals,
          `${riskCount}`,
          riskCount > 0 ? "var(--risk)" : "var(--positive)",
          riskCount > 0 ? t.cardRiskNeedsAttention : t.cardRiskNoAbnormal,
        )}
        ${renderMetricCard(
          t.cardDataGaps,
          `${gapCount}`,
          gapCount > 0 ? "#D97706" : "var(--positive)",
          gapCount > 0 ? t.cardDataGapsAffectsConfidence : t.cardDataGapsCoverageGood,
        )}
      </section>

      <!-- Assessment -->
      <section id="assessment" class="assessment">
        <div class="assessment__main">
          <h1>${escapeHtml(t.assessmentTitle)}</h1>
          <p class="assessment__text">${escapeHtml(narrative.health_assessment)}</p>
          ${
            insights.riskFlags.length > 0
              ? `<div class="pills" style="margin-top:16px">${insights.riskFlags
                  .map(
                    (flag) =>
                      `<span class="pill pill--risk">${escapeHtml(flag.title)}</span>`,
                  )
                  .join("")}</div>`
              : ""
          }
        </div>
        <aside class="assessment__aside">
          ${cm.compositeAssessment.overallReadiness ? `<span class="readiness-badge readiness--${cm.compositeAssessment.overallReadiness}">${escapeHtml(t.overallStatusLabel)}${cm.compositeAssessment.overallReadiness === "good" ? escapeHtml(t.readinessGood) : cm.compositeAssessment.overallReadiness === "moderate" ? escapeHtml(t.readinessModerate) : escapeHtml(t.readinessLow)}</span>` : ""}
          <div class="scores">
            ${cm.compositeAssessment.sleepScore !== null ? `<div class="score-ring"><span class="score-ring__value" style="color:var(--sleep)">${cm.compositeAssessment.sleepScore}</span><span class="score-ring__label">${escapeHtml(t.scoreSleep)}</span></div>` : ""}
            ${cm.compositeAssessment.recoveryScore !== null ? `<div class="score-ring"><span class="score-ring__value" style="color:var(--recovery)">${cm.compositeAssessment.recoveryScore}</span><span class="score-ring__label">${escapeHtml(t.scoreRecovery)}</span></div>` : ""}
            ${cm.compositeAssessment.activityScore !== null ? `<div class="score-ring"><span class="score-ring__value" style="color:var(--activity)">${cm.compositeAssessment.activityScore}</span><span class="score-ring__label">${escapeHtml(t.scoreActivity)}</span></div>` : ""}
          </div>
        </aside>
      </section>

      <!-- Cross-Metric Insights -->
      <section id="insights" class="insights-section">
        <h2>${escapeHtml(t.insightsSectionTitle)}</h2>
        <div class="insight-grid">
          <div>
            <h3 class="insight-grid__title">${escapeHtml(t.crossMetricTitle)}</h3>
            ${narrative.cross_metric_insights.map((item) => `<div class="insight-card"><p>${escapeHtml(item)}</p></div>`).join("")}
          </div>
          <div>
            <h3 class="insight-grid__title">${escapeHtml(t.behavioralPatternsTitle)}</h3>
            ${narrative.behavioral_patterns.map((item) => `<div class="insight-card"><p>${escapeHtml(item)}</p></div>`).join("")}
          </div>
        </div>
      </section>

      <!-- Findings & Actions -->
      <section class="overview">
        <h2 class="overview__title">${escapeHtml(t.overviewTitle)}</h2>
        <p class="overview__text">${escapeHtml(narrative.overview)}</p>
        <div class="overview__findings">
          <h3>${escapeHtml(t.keyFindings)}</h3>
          <ol>
            ${narrative.key_findings.slice(0, 5).map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
          </ol>
        </div>
        ${
          insights.dataGaps.length > 0
            ? `<div class="pills">${insights.dataGaps
                .slice(0, 3)
                .map(
                  (gap) =>
                    `<span class="pill pill--info">${escapeHtml(gap.summary)}</span>`,
                )
                .join("")}</div>`
            : ""
        }
      </section>

      <!-- 01 Sleep -->
      <section id="sleep" class="module module--sleep">
        <div class="module__header">
          <span class="module__index">01</span>
          <h2 class="module__title">${escapeHtml(sleepChart?.title ?? t.sleepModuleTitle)}</h2>
          ${sleepConf ? `<span class="badge ${confidenceClass(sleepConf.level)}">${escapeHtml(t.dataPrefix)}${confidenceLabel(sleepConf.level)}</span>` : ""}
        </div>
        <div class="module__body">
          <div class="module__chart">
            <p class="section-intro">${escapeHtml(insights.analysis.sleep.healthInsights.interpretation || sleepCallout)}</p>
            <div class="chart-wrap">
              ${sleepSvg}
              ${renderLegend([
                { label: t.legendSleepDuration, color: "#6366F1" },
                { label: t.legendDeepPct, color: "#818CF8" },
                { label: t.legendRemPct, color: "#A78BFA" },
              ])}
            </div>
            ${insights.analysis.sleep.healthInsights.normalRangeAssessment ? `
            <div class="note-block" style="margin:14px 0;background:var(--sleep-bg);border-radius:var(--radius-sm);padding:12px 16px">
              <h4 style="color:var(--sleep);margin-bottom:4px">${escapeHtml(t.normalRangeAssessment)}</h4>
              <p>${escapeHtml(insights.analysis.sleep.healthInsights.normalRangeAssessment)}</p>
            </div>` : ""}
          </div>
          <aside class="module__aside">
            <div class="metric-rail">
              <div class="metric-rail__item">
                <div class="metric-rail__label">${escapeHtml(t.sleepRecent30dLabel)}</div>
                <div class="metric-rail__value">${escapeHtml(fmt(insights.analysis.sleep.recent30d.avgSleepHours, t.unitHours))}</div>
                <div class="metric-rail__note">${escapeHtml(t.meanNote)}</div>
              </div>
              <div class="metric-rail__item">
                <div class="metric-rail__label">${escapeHtml(t.sleepRecent30dAwakeLabel)}</div>
                <div class="metric-rail__value">${escapeHtml(fmt(insights.analysis.sleep.recent30d.avgAwakeHours, t.unitHours))}</div>
                <div class="metric-rail__note">${escapeHtml(t.meanNote)}</div>
              </div>
              <div class="metric-rail__item">
                <div class="metric-rail__label">${escapeHtml(t.sleepBedtimeWakeLabel)}</div>
                <div class="metric-rail__value">${escapeHtml(`${insights.analysis.sleep.recent30d.medianBedtime ?? t.dash} / ${insights.analysis.sleep.recent30d.medianWakeTime ?? t.dash}`)}</div>
                <div class="metric-rail__note">${escapeHtml(t.sleepRecentNote)}</div>
              </div>
            </div>
            ${insights.analysis.sleep.healthInsights.actionableAdvice.length > 0 ? `
            <div class="note-block">
              <h4>${escapeHtml(t.healthAdvice)}</h4>
              <ul>${insights.analysis.sleep.healthInsights.actionableAdvice.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>
            </div>` : ""}
            ${insights.analysis.sleep.healthInsights.doctorTalkingPoints.length > 0 ? `
            <div class="note-block">
              <h4>${escapeHtml(t.doctorQuestions)}</h4>
              <ul>${insights.analysis.sleep.healthInsights.doctorTalkingPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
            </div>` : ""}
            ${sleepConf ? `<div class="note-block"><h4>${escapeHtml(t.sourceCoverage)}</h4><p>${escapeHtml(sleepConf.summary)}</p></div>` : ""}
          </aside>
        </div>
      </section>

      <!-- 02 Recovery -->
      <section id="recovery" class="module module--recovery">
        <div class="module__header">
          <span class="module__index">02</span>
          <h2 class="module__title">${escapeHtml(recoveryChart?.title ?? t.recoveryModuleTitle)}</h2>
          ${recoveryConf ? `<span class="badge ${confidenceClass(recoveryConf.level)}">${escapeHtml(t.dataPrefix)}${confidenceLabel(recoveryConf.level)}</span>` : ""}
        </div>
        <div class="module__body">
          <div class="module__chart">
            <p class="section-intro">${escapeHtml(insights.analysis.recovery.healthInsights.interpretation || recoveryCallout)}</p>
            <table class="ledger">
              <thead>
                <tr>
                  <th>${escapeHtml(t.thMetric)}</th>
                  <th>${escapeHtml(t.thLatest)}</th>
                  <th>${escapeHtml(t.thRecent30d)}</th>
                  <th>${escapeHtml(t.thBaseline)}</th>
                  <th>${escapeHtml(t.thDelta)}</th>
                  <th>${escapeHtml(t.thTrend)}</th>
                </tr>
              </thead>
              <tbody>
                ${renderRecoveryRow(t.rowRestingHr, insights.analysis.recovery.metrics.restingHeartRate, "#10B981", t, fmt, fmtDelta)}
                ${renderRecoveryRow(t.rowHrv, insights.analysis.recovery.metrics.hrv, "#059669", t, fmt, fmtDelta)}
                ${renderRecoveryRow(t.rowOxygen, insights.analysis.recovery.metrics.oxygenSaturation, "#0D9488", t, fmt, fmtDelta)}
                ${renderRecoveryRow(t.rowRespiratoryRate, insights.analysis.recovery.metrics.respiratoryRate, "#14B8A6", t, fmt, fmtDelta)}
                ${renderRecoveryRow(t.rowVo2Max, insights.analysis.recovery.metrics.vo2Max, "#6366F1", t, fmt, fmtDelta)}
              </tbody>
            </table>
            ${insights.analysis.recovery.healthInsights.normalRangeAssessment ? `
            <div class="note-block" style="margin:14px 0 0 0;background:var(--recovery-bg);border-radius:var(--radius-sm);padding:12px 16px">
              <h4 style="color:var(--recovery);margin-bottom:4px">${escapeHtml(t.normalRangeAssessment)}</h4>
              <p>${escapeHtml(insights.analysis.recovery.healthInsights.normalRangeAssessment)}</p>
            </div>` : ""}
          </div>
          <aside class="module__aside">
            ${insights.analysis.recovery.healthInsights.actionableAdvice.length > 0 ? `
            <div class="note-block">
              <h4>${escapeHtml(t.healthAdvice)}</h4>
              <ul>${insights.analysis.recovery.healthInsights.actionableAdvice.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>
            </div>` : ""}
            ${insights.analysis.recovery.healthInsights.doctorTalkingPoints.length > 0 ? `
            <div class="note-block">
              <h4>${escapeHtml(t.doctorQuestions)}</h4>
              <ul>${insights.analysis.recovery.healthInsights.doctorTalkingPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
            </div>` : ""}
            ${recoveryConf ? `<div class="note-block"><h4>${escapeHtml(t.sourceCoverage)}</h4><p>${escapeHtml(recoveryConf.summary)}</p></div>` : ""}
          </aside>
        </div>
      </section>

      <!-- 03 Activity -->
      <section id="activity" class="module module--activity">
        <div class="module__header">
          <span class="module__index">03</span>
          <h2 class="module__title">${escapeHtml(activityChart?.title ?? t.activityModuleTitle)}</h2>
          ${activityConf ? `<span class="badge ${confidenceClass(activityConf.level)}">${escapeHtml(t.dataPrefix)}${confidenceLabel(activityConf.level)}</span>` : ""}
        </div>
        <div class="module__body">
          <div class="module__chart">
            <p class="section-intro">${escapeHtml(insights.analysis.activity.healthInsights.interpretation || activityCallout)}</p>
            <div class="chart-wrap">
              ${activitySvg}
              ${renderLegend([
                { label: t.legendActivityEnergy, color: "#F97316" },
                { label: t.legendExerciseMin, color: "#FB923C" },
                { label: t.legendStandHours, color: "#10B981" },
              ])}
            </div>
            <div class="activity-stats">
              <div class="activity-stats__item">
                <span>${escapeHtml(t.activityEnergyRecent)}</span>
                <strong>${escapeHtml(fmt(insights.analysis.activity.recent30d.activeEnergyBurnedKcal, " kcal"))}</strong>
              </div>
              <div class="activity-stats__item">
                <span>${escapeHtml(t.activityExerciseRecent)}</span>
                <strong>${escapeHtml(fmt(insights.analysis.activity.recent30d.exerciseMinutes, t.unitMinutes))}</strong>
              </div>
              <div class="activity-stats__item">
                <span>${escapeHtml(t.activityStandRecent)}</span>
                <strong>${escapeHtml(fmt(insights.analysis.activity.recent30d.standHours, t.unitHours))}</strong>
              </div>
            </div>
            ${workoutBars ? `<div class="chart-wrap" style="margin-top:14px">${workoutBars}</div>` : ""}
            ${insights.analysis.activity.healthInsights.normalRangeAssessment ? `
            <div class="note-block" style="margin:14px 0 0 0;background:var(--activity-bg);border-radius:var(--radius-sm);padding:12px 16px">
              <h4 style="color:var(--activity);margin-bottom:4px">${escapeHtml(t.whoAssessment)}</h4>
              <p>${escapeHtml(insights.analysis.activity.healthInsights.normalRangeAssessment)}</p>
            </div>` : ""}
          </div>
          <aside class="module__aside">
            ${insights.analysis.activity.healthInsights.actionableAdvice.length > 0 ? `
            <div class="note-block">
              <h4>${escapeHtml(t.healthAdvice)}</h4>
              <ul>${insights.analysis.activity.healthInsights.actionableAdvice.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>
            </div>` : ""}
            ${insights.analysis.activity.healthInsights.doctorTalkingPoints.length > 0 ? `
            <div class="note-block">
              <h4>${escapeHtml(t.doctorQuestions)}</h4>
              <ul>${insights.analysis.activity.healthInsights.doctorTalkingPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
            </div>` : ""}
            ${activityConf ? `<div class="note-block"><h4>${escapeHtml(t.sourceCoverage)}</h4><p>${escapeHtml(activityConf.summary)}</p></div>` : ""}
          </aside>
        </div>
      </section>

      <!-- 04 Body Composition -->
      <section id="body" class="module module--body">
        <div class="module__header">
          <span class="module__index">04</span>
          <h2 class="module__title">${escapeHtml(bodyChart?.title ?? t.bodyModuleTitle)}</h2>
          ${bodyConf ? `<span class="badge ${confidenceClass(bodyConf.level)}">${escapeHtml(t.dataPrefix)}${confidenceLabel(bodyConf.level)}</span>` : ""}
        </div>
        <p class="section-intro" style="padding:16px 24px 0">${escapeHtml(bodyCallout)}</p>
        <div class="body-grid">
          ${bodyChart?.series
            .map((series, index) =>
              renderBodyDetail(series, index === 0 ? "#6B7280" : "#9CA3AF", fmt, t),
            )
            .join("") ?? `<p style='color:var(--faint);font-size:var(--fs-sm)'>${escapeHtml(t.bodyDataInsufficient)}</p>`}
        </div>
      </section>

      ${menstrualChart && insights.analysis.menstrualCycle ? (() => {
        const mc = insights.analysis.menstrualCycle;
        const hi = mc.healthInsights;
        const trendLabel = hi.cycleTrend === "lengthening" ? t.menstrualTrendLengthening : hi.cycleTrend === "shortening" ? t.menstrualTrendShortening : hi.cycleTrend === "stable" ? t.menstrualTrendStable : t.dash;
        return `
      <!-- 05 Menstrual Cycle -->
      <section id="menstrual" class="module module--menstrual">
        <div class="module__header">
          <span class="module__index">05</span>
          <h2 class="module__title">${escapeHtml(menstrualChart.title)}</h2>
          ${menstrualConf ? `<span class="badge ${confidenceClass(menstrualConf.level)}">${escapeHtml(t.dataPrefix)}${confidenceLabel(menstrualConf.level)}</span>` : ""}
        </div>
        <div class="module__body">
          <div class="module__chart">
            <p class="section-intro">${escapeHtml(hi.interpretation)}</p>
            <div class="chart-wrap">
              ${menstrualCycleSvg}
              ${renderLegend([{ label: t.legendCycleLength, color: "#EC4899" }])}
            </div>
            <div class="note-block" style="margin:14px 0;background:var(--menstrual-bg);border-radius:var(--radius-sm);padding:12px 16px">
              <h4 style="color:var(--menstrual);margin-bottom:4px">${escapeHtml(t.normalRangeAssessment)}</h4>
              <p>${escapeHtml(hi.normalRangeAssessment)}</p>
            </div>
            ${menstrualPeriodBars ? `<div class="chart-wrap" style="margin-top:14px">
              ${menstrualPeriodBars}
              ${renderLegend([{ label: t.legendPeriodDuration, color: "#F472B6" }])}
            </div>` : ""}
            <div class="note-block" style="margin:14px 0;background:var(--menstrual-bg);border-radius:var(--radius-sm);padding:12px 16px">
              <h4 style="color:var(--menstrual);margin-bottom:4px">${escapeHtml(t.menstrualBleedingPatternTitle)}</h4>
              <p>${escapeHtml(hi.flowPattern)}</p>
            </div>
          </div>
          <aside class="module__aside">
            <div class="metric-rail">
              <div class="metric-rail__item">
                <div class="metric-rail__label">${escapeHtml(t.menstrualAvgCycleLabel)}</div>
                <div class="metric-rail__value">${escapeHtml(fmt(mc.avgCycleLengthDays, t.unitDays))}</div>
                <div class="metric-rail__note">${escapeHtml(t.menstrualCycleCount(mc.totalPeriods))}</div>
              </div>
              <div class="metric-rail__item">
                <div class="metric-rail__label">${escapeHtml(t.menstrualAvgPeriodLabel)}</div>
                <div class="metric-rail__value">${escapeHtml(fmt(mc.avgPeriodDurationDays, t.unitDays))}</div>
                <div class="metric-rail__note">${escapeHtml(t.meanNote)}</div>
              </div>
              <div class="metric-rail__item">
                <div class="metric-rail__label">${escapeHtml(t.menstrualCycleTrendLabel)}</div>
                <div class="metric-rail__value">${escapeHtml(trendLabel)}</div>
                <div class="metric-rail__note">${hi.cycleTrendDelta !== null ? `${hi.cycleTrendDelta > 0 ? "+" : ""}${hi.cycleTrendDelta}${t.unitDays}` : t.dash}</div>
              </div>
            </div>
            <div class="note-block">
              <h4>${escapeHtml(t.healthAdvice)}</h4>
              <ul>${hi.actionableAdvice.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>
            </div>
            ${hi.doctorTalkingPoints.length > 0 ? `
            <div class="note-block">
              <h4>${escapeHtml(t.doctorQuestions)}</h4>
              <ul>${hi.doctorTalkingPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
            </div>` : ""}
            ${menstrualConf ? `<div class="note-block"><h4>${escapeHtml(t.sourceCoverage)}</h4><p>${escapeHtml(menstrualConf.summary)}</p></div>` : ""}
          </aside>
        </div>
      </section>`;
      })() : ""}

      <!-- Actions -->
      <div class="actions">
        <div class="actions__card">
          <h3>${escapeHtml(t.actionsNext2Weeks)}</h3>
          <ol>
            ${narrative.actions_next_2_weeks.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}
          </ol>
        </div>
        <div class="actions__card actions__card--warn">
          <h3>${escapeHtml(t.actionsSeekCare)}</h3>
          <ul>
            ${narrative.when_to_seek_care.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}
          </ul>
        </div>
      </div>

      <!-- Doctor Questions -->
      <div class="actions actions--single">
        <div class="actions__card">
          <h3>${escapeHtml(t.actionsDoctorQuestions)}</h3>
          <ol>
            ${narrative.questions_for_doctor.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}
          </ol>
        </div>
      </div>

      <!-- Appendix -->
      <section id="appendix" class="appendix">
        <h2 class="appendix__title">${escapeHtml(t.appendixTitle)}</h2>
        <div class="appendix__grid">
          <div>
            <h3>${escapeHtml(t.appendixDataLimitations)}</h3>
            <ul class="appendix__list">
              ${[...narrative.data_limitations].map((d) => `<li>${escapeHtml(d)}</li>`).join("")}
            </ul>
          </div>
          <div>
            <h3>${escapeHtml(t.appendixSourceConfidence)}</h3>
            <ul class="confidence-list">
              ${insights.sourceConfidence
                .map(
                  (entry) => `<li>
                    <div>
                      <strong>${escapeHtml(entry.module)}</strong>
                      <small>${escapeHtml(entry.summary)}</small>
                    </div>
                    <span class="badge ${confidenceClass(entry.level)}">${confidenceLabel(entry.level)}</span>
                  </li>`,
                )
                .join("")}
            </ul>
          </div>
        </div>
        <div class="disclaimer">${escapeHtml(narrative.disclaimer)}</div>
      </section>
    </main>

    <footer class="site-footer">
      <a href="https://github.com/RuochenLyu/apple-health-analyst" class="site-footer__brand" target="_blank" rel="noopener">apple-health-analyst</a>
      <div class="site-footer__tagline">${escapeHtml(t.footerTagline)}</div>
      <div class="site-footer__links">
        <a href="https://github.com/RuochenLyu/apple-health-analyst" target="_blank" rel="noopener">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          GitHub
        </a>
      </div>
    </footer>
  </body>
</html>
`;
}

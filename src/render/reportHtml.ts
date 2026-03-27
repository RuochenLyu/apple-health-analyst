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

function fmt(value: number | null, suffix = ""): string {
  return value === null ? "数据不足" : `${value}${suffix}`;
}

function fmtCount(value: number): string {
  return value.toLocaleString("zh-CN");
}

function fmtDelta(value: number | null, unit: string): string {
  if (value === null) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value} ${unit}`.trim();
}

function sectionCallout(
  narrative: NarrativeReport,
  chartId: InsightBundle["charts"][number]["id"],
  fallback: string,
): string {
  const callout = narrative.chart_callouts.find((item) => item.chart_id === chartId);
  return callout?.summary ?? fallback;
}

function confidenceLabel(level: SourceConfidence["level"]): string {
  if (level === "high") return "充足";
  if (level === "medium") return "中等";
  return "不足";
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
): string {
  if (!metric) {
    return `<tr class="ledger__row ledger__row--empty">
      <td class="ledger__name">${escapeHtml(label)}</td>
      <td colspan="4" class="ledger__empty">近期样本不足</td>
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
        label: "基线",
        value: metric.baseline90d.average,
        sampleCount: metric.baseline90d.sampleCount,
      },
      {
        start: metric.latest?.timestamp ?? new Date().toISOString(),
        end: metric.latest?.timestamp ?? new Date().toISOString(),
        granularity: "day",
        label: "近期",
        value: metric.recent30d.average,
        sampleCount: metric.recent30d.sampleCount,
      },
      {
        start: metric.latest?.timestamp ?? new Date().toISOString(),
        end: metric.latest?.timestamp ?? new Date().toISOString(),
        granularity: "day",
        label: "最新",
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
      <small>覆盖 ${metric.coverageDays} 天</small>
    </td>
    <td class="ledger__val">${escapeHtml(fmt(metric.latest?.value ?? null, ` ${metric.unit}`))}</td>
    <td class="ledger__val">${escapeHtml(fmt(metric.recent30d.average, ` ${metric.unit}`))}</td>
    <td class="ledger__val">${escapeHtml(fmt(metric.baseline90d.average, ` ${metric.unit}`))}</td>
    <td class="ledger__val ${deltaClass}">${escapeHtml(fmtDelta(metric.delta, metric.unit))}</td>
    <td class="ledger__spark">${renderLineSparkline(sparkSeries, color, { width: 120, height: 36 })}</td>
  </tr>`;
}

function renderBodyDetail(series: ChartSeries, color: string): string {
  const latest = series.points.at(-1)?.value ?? null;
  return `<div class="body-card">
    <div class="body-card__head">
      <span class="body-card__label">${escapeHtml(series.label)}</span>
      <span class="body-card__value">${escapeHtml(fmt(latest, series.unit ? ` ${series.unit}` : ""))}</span>
    </div>
    <div class="body-card__chart">${renderMultiSeriesLineChart([series], [color], {
      width: 400,
      height: 140,
    })}</div>
  </div>`;
}

export function renderReportHtml(insights: InsightBundle, narrative: NarrativeReport): string {
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
      })
    : "";

  const activityPrimarySeries =
    activityChart?.series.filter((s) => s.id !== "activity_workouts") ?? [];
  const activitySvg =
    activityPrimarySeries.length > 0
      ? renderMultiSeriesLineChart(activityPrimarySeries, ["#F97316", "#FB923C", "#10B981"], {
          width: 700,
          height: 220,
        })
      : "";
  const workoutBars =
    activityChart?.series.find((s) => s.id === "activity_workouts")
      ? renderBarChart(
          activityChart.series.find((s) => s.id === "activity_workouts")!,
          "#F97316",
          { width: 700, height: 120 },
        )
      : "";

  // Callouts
  const sleepCallout = sectionCallout(
    narrative,
    "sleep",
    sleepChart?.subtitle ?? "睡眠模块更适合看趋势方向和连续性。",
  );
  const recoveryCallout = sectionCallout(
    narrative,
    "recovery",
    recoveryChart?.subtitle ?? "恢复指标更适合成组观察。",
  );
  const activityCallout = sectionCallout(
    narrative,
    "activity",
    activityChart?.subtitle ?? "活动模块同时呈现日常活动和训练节奏。",
  );
  const bodyCallout = sectionCallout(
    narrative,
    "bodyComposition",
    bodyChart?.subtitle ?? "身体成分更适合看月度方向。",
  );
  const menstrualCallout = menstrualChart
    ? sectionCallout(narrative, "menstrualCycle", menstrualChart.subtitle)
    : "";

  const menstrualCycleLengthSeries = menstrualChart?.series.find((s) => s.id === "cycle_length");
  const menstrualPeriodDurationSeries = menstrualChart?.series.find((s) => s.id === "period_duration");
  const menstrualCycleSvg = menstrualCycleLengthSeries
    ? renderMultiSeriesLineChart([menstrualCycleLengthSeries], ["#EC4899"], { width: 700, height: 180 })
    : "";
  const menstrualPeriodBars = menstrualPeriodDurationSeries
    ? renderBarChart(menstrualPeriodDurationSeries, "#F472B6", { width: 700, height: 120 })
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
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Apple Health 健康报告</title>
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
        font-size: 15px;
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
        font-size: 15px;
        white-space: nowrap;
      }
      .topbar__date {
        color: var(--muted);
        font-size: 13px;
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
        font-size: 13px;
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
        padding: 24px 20px 64px;
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
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--muted);
        margin-bottom: 6px;
      }
      .metric-card__value {
        font-size: 28px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
      }
      .metric-card__sub {
        font-size: 12px;
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
      .overview__text {
        font-size: 15px;
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
        font-size: 14px;
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
        font-size: 14px;
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
        font-size: 12px;
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
        font-size: 13px;
        font-weight: 700;
        color: var(--faint);
        min-width: 28px;
      }
      .module__title {
        font-size: 18px;
        font-weight: 700;
      }
      .module__callout {
        margin-left: auto;
        font-size: 13px;
        color: var(--muted);
        max-width: 40ch;
        text-align: right;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 11px;
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
        font-size: 12px;
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
        font-size: 12px;
        color: var(--muted);
        margin-bottom: 4px;
      }
      .metric-rail__value {
        font-size: 22px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
      }
      .metric-rail__note {
        font-size: 11px;
        color: var(--faint);
        margin-top: 2px;
      }

      /* ─── Note Block ─── */
      .note-block {
        padding-top: 14px;
        border-top: 1px solid var(--border);
      }
      .note-block h4 {
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 6px;
      }
      .note-block p,
      .note-block li {
        font-size: 13px;
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

      /* ─── Ledger (Recovery Table) ─── */
      .ledger {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .ledger th {
        text-align: left;
        font-size: 11px;
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
      .ledger__name strong {
        display: block;
        font-size: 14px;
      }
      .ledger__name small {
        display: block;
        margin-top: 2px;
        color: var(--faint);
        font-size: 11px;
      }
      .ledger__val {
        font-variant-numeric: tabular-nums;
        font-weight: 500;
        white-space: nowrap;
      }
      .ledger__empty {
        color: var(--faint);
        font-style: italic;
      }
      .delta--up { color: var(--activity); }
      .delta--down { color: var(--recovery); }
      .ledger__spark {
        width: 120px;
      }
      .ledger__spark svg {
        display: block;
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
        font-size: 12px;
        color: var(--muted);
      }
      .activity-stats__item strong {
        display: block;
        margin-top: 4px;
        font-size: 20px;
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
        font-size: 13px;
        font-weight: 600;
        color: var(--muted);
      }
      .body-card__value {
        font-size: 24px;
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
        font-size: 15px;
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
        font-size: 14px;
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
        font-size: 15px;
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
        font-size: 14px;
      }
      .confidence-list li small {
        font-size: 12px;
        color: var(--muted);
      }

      .disclaimer {
        margin-top: 24px;
        font-size: 13px;
        line-height: 1.65;
        color: var(--faint);
      }

      /* ─── Responsive ─── */
      @media (max-width: 900px) {
        .summary-cards {
          flex-wrap: wrap;
        }
        .summary-cards .metric-card {
          flex: 1 1 calc(50% - 16px);
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
        .topbar__nav {
          display: none;
        }
        .insight-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 600px) {
        .summary-cards .metric-card {
          flex: 1 1 100%;
        }
        main {
          padding: 16px 12px 48px;
        }
        .topbar {
          padding: 0 12px;
        }
        .ledger th:nth-child(n+3),
        .ledger__row td:nth-child(n+4) {
          display: none;
        }
        .activity-stats {
          grid-template-columns: 1fr;
        }
      }

      /* ─── Assessment ─── */
      .assessment {
        background: var(--surface);
        border-radius: var(--radius);
        padding: 32px;
        box-shadow: var(--shadow-md);
        margin-bottom: 24px;
      }
      .assessment h1 {
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 16px;
      }
      .assessment__text {
        font-size: 15px;
        line-height: 1.8;
        color: var(--ink-secondary);
        max-width: 72ch;
        margin-bottom: 24px;
      }
      .scores {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
        margin-bottom: 20px;
      }
      .score-ring {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        min-width: 90px;
      }
      .score-ring__value {
        font-size: 32px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        line-height: 1;
      }
      .score-ring__label {
        font-size: 12px;
        font-weight: 500;
        color: var(--muted);
      }
      .readiness-badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 16px;
        border-radius: 999px;
        font-size: 14px;
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
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 16px;
      }
      .insight-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
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
        font-size: 14px;
        line-height: 1.7;
        color: var(--ink-secondary);
      }
      .insight-card h4 {
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 6px;
        color: var(--ink);
      }

      /* ─── Utility ─── */
      .section-intro {
        font-size: 13px;
        line-height: 1.65;
        color: var(--ink-secondary);
        margin-bottom: 14px;
      }
      .insight-grid__title {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 12px;
      }
      .actions--single {
        grid-template-columns: 1fr;
      }
      .appendix__title {
        font-size: 18px;
        font-weight: 700;
      }
      .appendix__list {
        padding-left: 18px;
        display: grid;
        gap: 6px;
      }
      .appendix__list li {
        font-size: 13px;
        line-height: 1.65;
        color: var(--ink-secondary);
      }
      .footer-link {
        margin-top: 12px;
        font-size: 12px;
      }
      .footer-link a {
        color: var(--muted);
      }

      /* ─── Print ─── */
      @media print {
        .topbar { display: none; }
        main { padding: 0; max-width: none; }
        .module, .overview, .actions__card, .appendix, .metric-card {
          box-shadow: none;
          break-inside: avoid;
        }
        body { font-size: 12px; }
        html { background: white; }
      }
    </style>
  </head>
  <body>
    <nav class="topbar">
      <span class="topbar__title">Apple Health 健康报告</span>
      <span class="topbar__date">${escapeHtml(insights.coverage.windowStart ?? "起始")} ~ ${escapeHtml(insights.coverage.windowEnd.slice(0, 10))}</span>
      <div class="topbar__nav">
        <a href="#assessment">评估</a>
        <a href="#insights">分析</a>
        <a href="#sleep">睡眠</a>
        <a href="#recovery">恢复</a>
        <a href="#activity">活动</a>
        <a href="#body">身体</a>
        ${menstrualChart ? '<a href="#menstrual">月经</a>' : ""}
        <a href="#appendix">附录</a>
      </div>
    </nav>

    <main>
      <!-- Summary Cards -->
      <section class="summary-cards">
        ${renderMetricCard("睡眠均值", sleepVal, "var(--sleep)", "近 30 天")}
        ${renderMetricCard("静息心率", hrVal, "var(--recovery)", "近 30 天")}
        ${renderMetricCard(
          "风险信号",
          `${riskCount}`,
          riskCount > 0 ? "var(--risk)" : "var(--positive)",
          riskCount > 0 ? "需要关注" : "当前无异常",
        )}
        ${renderMetricCard(
          "数据缺口",
          `${gapCount}`,
          gapCount > 0 ? "#D97706" : "var(--positive)",
          gapCount > 0 ? "影响置信度" : "覆盖良好",
        )}
      </section>

      <!-- Assessment -->
      <section id="assessment" class="assessment">
        <h1>综合健康评估</h1>
        <p class="assessment__text">${escapeHtml(narrative.health_assessment)}</p>
        <div class="scores">
          ${cm.compositeAssessment.sleepScore !== null ? `<div class="score-ring"><span class="score-ring__value" style="color:var(--sleep)">${cm.compositeAssessment.sleepScore}</span><span class="score-ring__label">睡眠</span></div>` : ""}
          ${cm.compositeAssessment.recoveryScore !== null ? `<div class="score-ring"><span class="score-ring__value" style="color:var(--recovery)">${cm.compositeAssessment.recoveryScore}</span><span class="score-ring__label">恢复</span></div>` : ""}
          ${cm.compositeAssessment.activityScore !== null ? `<div class="score-ring"><span class="score-ring__value" style="color:var(--activity)">${cm.compositeAssessment.activityScore}</span><span class="score-ring__label">活动</span></div>` : ""}
        </div>
        ${cm.compositeAssessment.overallReadiness ? `<span class="readiness-badge readiness--${cm.compositeAssessment.overallReadiness}">整体状态：${cm.compositeAssessment.overallReadiness === "good" ? "良好" : cm.compositeAssessment.overallReadiness === "moderate" ? "中等" : "偏低"}</span>` : ""}
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
      </section>

      <!-- Cross-Metric Insights -->
      <section id="insights" class="insights-section">
        <h2>关联分析</h2>
        <div class="insight-grid">
          <div>
            <h3 class="insight-grid__title">跨指标发现</h3>
            ${narrative.cross_metric_insights.map((item) => `<div class="insight-card"><p>${escapeHtml(item)}</p></div>`).join("")}
          </div>
          <div>
            <h3 class="insight-grid__title">行为模式</h3>
            ${narrative.behavioral_patterns.map((item) => `<div class="insight-card insight-card--pattern"><p>${escapeHtml(item)}</p></div>`).join("")}
          </div>
        </div>
      </section>

      <!-- Findings & Actions -->
      <section class="overview">
        <p class="overview__text">${escapeHtml(narrative.overview)}</p>
        <div class="overview__findings">
          <h3>关键发现</h3>
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
          <h2 class="module__title">${escapeHtml(sleepChart?.title ?? "睡眠")}</h2>
          ${sleepConf ? `<span class="badge ${confidenceClass(sleepConf.level)}">数据${confidenceLabel(sleepConf.level)}</span>` : ""}
        </div>
        <div class="module__body">
          <div class="module__chart">
            <p class="section-intro">${escapeHtml(sleepCallout)}</p>
            <div class="chart-wrap">
              ${sleepSvg}
              ${renderLegend([
                { label: "睡眠时长", color: "#6366F1" },
                { label: "深睡占比", color: "#818CF8" },
                { label: "REM 占比", color: "#A78BFA" },
              ])}
            </div>
          </div>
          <aside class="module__aside">
            <div class="metric-rail">
              <div class="metric-rail__item">
                <div class="metric-rail__label">近 30 天睡眠</div>
                <div class="metric-rail__value">${escapeHtml(fmt(insights.analysis.sleep.recent30d.avgSleepHours, " 小时"))}</div>
                <div class="metric-rail__note">均值</div>
              </div>
              <div class="metric-rail__item">
                <div class="metric-rail__label">近 30 天清醒</div>
                <div class="metric-rail__value">${escapeHtml(fmt(insights.analysis.sleep.recent30d.avgAwakeHours, " 小时"))}</div>
                <div class="metric-rail__note">均值</div>
              </div>
              <div class="metric-rail__item">
                <div class="metric-rail__label">中位入睡 / 起床</div>
                <div class="metric-rail__value">${escapeHtml(`${insights.analysis.sleep.recent30d.medianBedtime ?? "—"} / ${insights.analysis.sleep.recent30d.medianWakeTime ?? "—"}`)}</div>
                <div class="metric-rail__note">近期</div>
              </div>
            </div>
            ${sleepConf ? `<div class="note-block"><h4>来源与覆盖</h4><p>${escapeHtml(sleepConf.summary)}</p></div>` : ""}
          </aside>
        </div>
      </section>

      <!-- 02 Recovery -->
      <section id="recovery" class="module module--recovery">
        <div class="module__header">
          <span class="module__index">02</span>
          <h2 class="module__title">${escapeHtml(recoveryChart?.title ?? "恢复")}</h2>
          ${recoveryConf ? `<span class="badge ${confidenceClass(recoveryConf.level)}">数据${confidenceLabel(recoveryConf.level)}</span>` : ""}
        </div>
        <div class="module__body">
          <div class="module__chart">
            <p class="section-intro">${escapeHtml(recoveryCallout)}</p>
            <table class="ledger">
              <thead>
                <tr>
                  <th>指标</th>
                  <th>最新</th>
                  <th>近 30 天</th>
                  <th>基线</th>
                  <th>变化</th>
                  <th>趋势</th>
                </tr>
              </thead>
              <tbody>
                ${renderRecoveryRow("静息心率", insights.analysis.recovery.metrics.restingHeartRate, "#10B981")}
                ${renderRecoveryRow("HRV", insights.analysis.recovery.metrics.hrv, "#059669")}
                ${renderRecoveryRow("血氧", insights.analysis.recovery.metrics.oxygenSaturation, "#0D9488")}
                ${renderRecoveryRow("呼吸频率", insights.analysis.recovery.metrics.respiratoryRate, "#14B8A6")}
                ${renderRecoveryRow("最大摄氧量", insights.analysis.recovery.metrics.vo2Max, "#6366F1")}
              </tbody>
            </table>
          </div>
          <aside class="module__aside">
            ${recoveryConf ? `<div class="note-block"><h4>来源与覆盖</h4><p>${escapeHtml(recoveryConf.summary)}</p></div>` : ""}
            <div class="note-block">
              <h4>重点留意</h4>
              <ul>
                ${(narrative.watchouts.length > 0 ? narrative.watchouts.slice(0, 3) : ["当前未提供额外提醒。"]).map((w) => `<li>${escapeHtml(w)}</li>`).join("")}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <!-- 03 Activity -->
      <section id="activity" class="module module--activity">
        <div class="module__header">
          <span class="module__index">03</span>
          <h2 class="module__title">${escapeHtml(activityChart?.title ?? "活动与训练")}</h2>
          ${activityConf ? `<span class="badge ${confidenceClass(activityConf.level)}">数据${confidenceLabel(activityConf.level)}</span>` : ""}
        </div>
        <div class="module__body">
          <div class="module__chart">
            <p class="section-intro">${escapeHtml(activityCallout)}</p>
            <div class="chart-wrap">
              ${activitySvg}
              ${renderLegend([
                { label: "活动能量", color: "#F97316" },
                { label: "锻炼分钟", color: "#FB923C" },
                { label: "站立小时", color: "#10B981" },
              ])}
            </div>
            <div class="activity-stats">
              <div class="activity-stats__item">
                <span>近 30 天活动能量</span>
                <strong>${escapeHtml(fmt(insights.analysis.activity.recent30d.activeEnergyBurnedKcal, " kcal"))}</strong>
              </div>
              <div class="activity-stats__item">
                <span>近 30 天锻炼</span>
                <strong>${escapeHtml(fmt(insights.analysis.activity.recent30d.exerciseMinutes, " 分钟"))}</strong>
              </div>
              <div class="activity-stats__item">
                <span>近 30 天站立</span>
                <strong>${escapeHtml(fmt(insights.analysis.activity.recent30d.standHours, " 小时"))}</strong>
              </div>
            </div>
            ${workoutBars ? `<div class="chart-wrap" style="margin-top:14px">${workoutBars}</div>` : ""}
          </div>
          <aside class="module__aside">
            ${activityConf ? `<div class="note-block"><h4>来源与覆盖</h4><p>${escapeHtml(activityConf.summary)}</p></div>` : ""}
            <div class="note-block">
              <h4>接下来两周</h4>
              <ul>
                ${narrative.actions_next_2_weeks.slice(0, 4).map((a) => `<li>${escapeHtml(a)}</li>`).join("")}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <!-- 04 Body Composition -->
      <section id="body" class="module module--body">
        <div class="module__header">
          <span class="module__index">04</span>
          <h2 class="module__title">${escapeHtml(bodyChart?.title ?? "身体成分")}</h2>
          ${bodyConf ? `<span class="badge ${confidenceClass(bodyConf.level)}">数据${confidenceLabel(bodyConf.level)}</span>` : ""}
        </div>
        <p class="section-intro" style="padding:0 24px">${escapeHtml(bodyCallout)}</p>
        <div class="body-grid">
          ${bodyChart?.series
            .map((series, index) =>
              renderBodyDetail(series, index === 0 ? "#6B7280" : "#9CA3AF"),
            )
            .join("") ?? "<p style='color:var(--faint);font-size:13px'>身体成分数据不足。</p>"}
        </div>
      </section>

      ${menstrualChart && insights.analysis.menstrualCycle ? `
      <!-- 05 Menstrual Cycle -->
      <section id="menstrual" class="module module--menstrual">
        <div class="module__header">
          <span class="module__index">05</span>
          <h2 class="module__title">${escapeHtml(menstrualChart.title)}</h2>
          ${menstrualConf ? `<span class="badge ${confidenceClass(menstrualConf.level)}">数据${confidenceLabel(menstrualConf.level)}</span>` : ""}
        </div>
        <div class="module__body">
          <div class="module__chart">
            <p class="section-intro">${escapeHtml(menstrualCallout)}</p>
            <div class="chart-wrap">
              ${menstrualCycleSvg}
              ${renderLegend([{ label: "周期长度", color: "#EC4899" }])}
            </div>
            ${menstrualPeriodBars ? `<div class="chart-wrap" style="margin-top:14px">
              ${menstrualPeriodBars}
              ${renderLegend([{ label: "经期天数", color: "#F472B6" }])}
            </div>` : ""}
          </div>
          <aside class="module__aside">
            <div class="metric-rail">
              <div class="metric-rail__item">
                <div class="metric-rail__label">平均周期</div>
                <div class="metric-rail__value">${escapeHtml(fmt(insights.analysis.menstrualCycle.avgCycleLengthDays, " 天"))}</div>
                <div class="metric-rail__note">${insights.analysis.menstrualCycle.totalPeriods} 个周期</div>
              </div>
              <div class="metric-rail__item">
                <div class="metric-rail__label">平均经期</div>
                <div class="metric-rail__value">${escapeHtml(fmt(insights.analysis.menstrualCycle.avgPeriodDurationDays, " 天"))}</div>
                <div class="metric-rail__note">均值</div>
              </div>
              <div class="metric-rail__item">
                <div class="metric-rail__label">规律性</div>
                <div class="metric-rail__value">${escapeHtml(
                  insights.analysis.menstrualCycle.regularity === "regular" ? "规律"
                    : insights.analysis.menstrualCycle.regularity === "somewhat_irregular" ? "较规律"
                    : insights.analysis.menstrualCycle.regularity === "irregular" ? "不规律"
                    : "数据不足"
                )}</div>
                <div class="metric-rail__note">标准差 ${escapeHtml(fmt(insights.analysis.menstrualCycle.cycleLengthStdDays, " 天"))}</div>
              </div>
            </div>
            ${insights.analysis.menstrualCycle.intermenstrualBleedingCount > 0 ? `
            <div class="note-block">
              <h4>经间期出血</h4>
              <p>共 ${insights.analysis.menstrualCycle.intermenstrualBleedingCount} 次记录</p>
            </div>` : ""}
            ${menstrualConf ? `<div class="note-block"><h4>来源与覆盖</h4><p>${escapeHtml(menstrualConf.summary)}</p></div>` : ""}
            ${insights.analysis.menstrualCycle.notes.length > 0 ? `
            <div class="note-block">
              <h4>备注</h4>
              <ul>${insights.analysis.menstrualCycle.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
            </div>` : ""}
          </aside>
        </div>
      </section>` : ""}

      <!-- Actions -->
      <div class="actions">
        <div class="actions__card">
          <h3>接下来两周建议</h3>
          <ol>
            ${narrative.actions_next_2_weeks.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}
          </ol>
        </div>
        <div class="actions__card actions__card--warn">
          <h3>何时建议复查或就医</h3>
          <ul>
            ${narrative.when_to_seek_care.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}
          </ul>
        </div>
      </div>

      <!-- Doctor Questions -->
      <div class="actions actions--single">
        <div class="actions__card">
          <h3>下次看诊可以问医生的问题</h3>
          <ol>
            ${narrative.questions_for_doctor.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}
          </ol>
        </div>
      </div>

      <!-- Appendix -->
      <section id="appendix" class="appendix">
        <h2 class="appendix__title">数据边界与补充提示</h2>
        <div class="appendix__grid">
          <div>
            <h3>数据局限</h3>
            <ul class="appendix__list">
              ${[...narrative.data_limitations].map((d) => `<li>${escapeHtml(d)}</li>`).join("")}
            </ul>
          </div>
          <div>
            <h3>来源可信度</h3>
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
        <div class="disclaimer footer-link">Generated by <a href="https://github.com/RuochenLyu/apple-health-analyst">apple-health-analyst</a></div>
      </section>
    </main>
  </body>
</html>
`;
}

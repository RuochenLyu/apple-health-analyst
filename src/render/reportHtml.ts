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
  renderMultiSeriesLineChart,
} from "./chartSvg.js";
import { BASE_CSS, HEALTH_CSS } from "./reportStyles.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeFmt(insufficientLabel: string, locale: string) {
  return function fmt(value: number | null, suffix = ""): string {
    return value === null
      ? insufficientLabel
      : `${value.toLocaleString(locale, { maximumFractionDigits: 1 })}${suffix}`;
  };
}

function makeFmtCount(locale: string) {
  return function fmtCount(value: number): string {
    return value.toLocaleString(locale);
  };
}

function labeled(label: string, value: string, t: RenderT): string {
  return t.htmlLang === "zh-CN" ? `${label}：${value}` : `${label}: ${value}`;
}

function renderParagraphs(value: string, className: string): string {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p class="${className}">${escapeHtml(paragraph)}</p>`)
    .join("");
}

function makeFmtDelta(dash: string, locale: string) {
  return function fmtDelta(value: number | null, unit: string): string {
    if (value === null) {
      return dash;
    }
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toLocaleString(locale, { maximumFractionDigits: 1 })} ${unit}`.trim();
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

function moduleLabel(module: SourceConfidence["module"], t: RenderT): string {
  if (module === "sleep") return t.sleepModuleTitle;
  if (module === "recovery") return t.recoveryModuleTitle;
  if (module === "activity") return t.activityModuleTitle;
  if (module === "bodyComposition") return t.bodyModuleTitle;
  return t.navMenstrual;
}

function renderLegend(items: Array<{ label: string; color: string }>): string {
  return `<div class="legend">${items
    .map(
      (item) =>
        `<span class="legend-item"><i style="background:${item.color}"></i>${escapeHtml(item.label)}</span>`,
    )
    .join("")}</div>`;
}

function renderGranularityNote(
  series: ChartSeries[],
  t: RenderT,
  padded = false,
): string {
  if (!series.some((item) => item.points.length > 1)) {
    return "";
  }
  return `<p class="chart-scale-note${padded ? " chart-scale-note--padded" : ""}">${escapeHtml(t.chartGranularityNote)}</p>`;
}

function renderLinePanel(
  series: ChartSeries[],
  colors: string[],
  t: RenderT,
): string {
  if (series.length === 0) {
    return "";
  }
  const panelTitle = series
    .map((item) => `${item.label}${item.unit ? ` · ${item.unit}` : ""}`)
    .join(" / ");
  return `<div class="chart-panel">
    <h3 class="chart-panel__title">${escapeHtml(panelTitle)}</h3>
    <div class="chart-wrap">${renderMultiSeriesLineChart(series, colors, {
      width: 640,
      height: 190,
    }, t)}</div>
    ${series.length > 1 ? renderLegend(series.map((item, index) => ({
      label: `${item.label}${item.unit ? ` (${item.unit})` : ""}`,
      color: colors[index] ?? colors[0] ?? "#596579",
    }))) : ""}
  </div>`;
}

function renderBarPanel(
  series: ChartSeries | undefined,
  color: string,
  t: RenderT,
): string {
  if (!series) {
    return "";
  }
  const panelTitle = `${series.label}${series.unit ? ` · ${series.unit}` : ""}`;
  return `<div class="chart-panel">
    <h3 class="chart-panel__title">${escapeHtml(panelTitle)}</h3>
    <div class="chart-wrap">${renderBarChart(series, color, {
      width: 640,
      height: 170,
    }, t)}</div>
  </div>`;
}

function renderMetricCard(label: string, value: string, accent: string, sub?: string): string {
  return `<div class="metric-card" style="--metric-accent:${accent}">
    <div class="metric-card__label">${escapeHtml(label)}</div>
    <div class="metric-card__value">${escapeHtml(value)}</div>
    ${sub ? `<div class="metric-card__sub">${escapeHtml(sub)}</div>` : ""}
  </div>`;
}

function renderRecoveryRow(
  label: string,
  metric: NumericComparison | undefined,
  t: RenderT,
  fmt: (value: number | null, suffix?: string) => string,
  fmtDelta: (value: number | null, unit: string) => string,
): string {
  if (!metric) {
    return `<tr class="ledger__row ledger__row--empty">
      <th scope="row" class="ledger__name">${escapeHtml(label)}</th>
      <td colspan="4" class="ledger__empty">${escapeHtml(t.recentSamplesInsufficient)}</td>
    </tr>`;
  }

  const deltaClass =
    metric.delta !== null && metric.delta > 0
      ? "delta--up"
      : metric.delta !== null && metric.delta < 0
        ? "delta--down"
        : "";

  return `<tr class="ledger__row">
    <th scope="row" class="ledger__name">
      <strong>${escapeHtml(label)}</strong>
      <small>${escapeHtml(t.coverageDays(metric.coverageDays))}</small>
    </th>
    <td class="ledger__val">${escapeHtml(fmt(metric.latest?.value ?? null, ` ${metric.unit}`))}</td>
    <td class="ledger__val">${escapeHtml(fmt(metric.recent30d.average, ` ${metric.unit}`))}</td>
    <td class="ledger__val">${escapeHtml(fmt(metric.baseline90d.average, ` ${metric.unit}`))}</td>
    <td class="ledger__val ${deltaClass}">${escapeHtml(fmtDelta(metric.delta, metric.unit))}</td>
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

export interface RenderReportHtmlOptions {
  /**
   * When true, emits the topbar and footer cross-link that jumps to the
   * training report. The skill only sets this when the training report is
   * being rendered into the same output directory — skipping it prevents a
   * dead `./training.report.html` link on single-report runs.
  */
  includeCrossLink?: boolean;
  /**
   * Optional notice shown near the start of the report. Public demos use it
   * to make the synthetic-data boundary explicit.
   */
  sampleNotice?: string;
}

export function renderReportHtml(
  insights: InsightBundle,
  narrative: NarrativeReport,
  t: RenderT,
  options: RenderReportHtmlOptions = {},
): string {
  const includeCrossLink = options.includeCrossLink === true;
  const sampleNotice = options.sampleNotice?.trim();
  const fmt = makeFmt(t.insufficientData, t.locale);
  const fmtCount = makeFmtCount(t.locale);
  const fmtDelta = makeFmtDelta(t.dash, t.locale);
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
  const sleepDurationSeries =
    sleepChart?.series.filter((series) => series.unit !== "%") ?? [];
  const sleepStageSeries =
    sleepChart?.series.filter((series) => series.unit === "%") ?? [];
  const sleepPanels = [
    renderLinePanel(sleepDurationSeries, ["#4F46E5"], t),
    renderLinePanel(sleepStageSeries, ["#7C6EE6", "#A855B5"], t),
  ].join("");

  const activityPanels = (activityChart?.series ?? [])
    .map((series, index) => {
      const colors = ["#C2410C", "#B45309", "#047857", "#9A3412"];
      return series.visual === "bar"
        ? renderBarPanel(series, colors[index] ?? "#C2410C", t)
        : renderLinePanel([series], [colors[index] ?? "#C2410C"], t);
    })
    .join("");

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
    ? renderBarChart(menstrualPeriodDurationSeries, "#BE185D", { width: 700, height: 120 }, t)
    : "";

  // Summary data
  const sleepVal = fmt(insights.analysis.sleep.recent30d.avgSleepHours, "h");
  const hrVal = fmt(
    insights.analysis.recovery.metrics.restingHeartRate?.recent30d.average ?? null,
    " bpm",
  );
  const riskCount = insights.riskFlags.length;
  const gapCount = insights.dataGaps.length;
  const hasCareGuidance =
    narrative.when_to_seek_care.length > 0 || insights.riskFlags.length > 0;
  const rangeStart = (
    insights.coverage.windowStart ??
    insights.coverage.earliestSeen
  )?.slice(0, 10) ?? t.windowStart;
  const rangeEnd = insights.coverage.windowEnd.slice(0, 10);
  const actionBrief = `<section id="actions" class="action-brief">
    <div class="action-brief__heading">
      <span class="action-brief__eyebrow">${escapeHtml(t.navActions)}</span>
      <h2>${escapeHtml(t.actionsNext2Weeks)}</h2>
    </div>
    <div class="actions${hasCareGuidance ? "" : " actions--single"}">
      <div class="actions__card">
        <h3>${escapeHtml(t.actionsPriority)}</h3>
        <ol>
          ${narrative.actions_next_2_weeks.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}
        </ol>
      </div>
      ${hasCareGuidance ? `<div class="actions__card actions__card--warn">
        <h3>${escapeHtml(t.actionsSeekCare)}</h3>
        <ul>
          ${narrative.when_to_seek_care.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          ${insights.riskFlags.map((flag) => `<li><strong>${escapeHtml(labeled(flag.title, "", t))}</strong>${escapeHtml(flag.summary)}${flag.evidence.length > 0 ? ` <span>${escapeHtml(flag.evidence.join(" · "))}</span>` : ""}</li>`).join("")}
        </ul>
      </div>` : ""}
    </div>
    ${narrative.questions_for_doctor.length > 0 ? `<div class="actions actions--single">
      <div class="actions__card actions__card--quiet">
        <h3>${escapeHtml(t.actionsDoctorQuestions)}</h3>
        <ol>${narrative.questions_for_doctor.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ol>
      </div>
    </div>` : ""}
  </section>`;

  return `<!doctype html>
<html lang="${t.htmlLang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${escapeHtml(t.reportTitle)}</title>
    <meta property="og:title" content="${escapeHtml(t.reportTitle)}" />
    <meta property="og:description" content="${escapeHtml(t.footerTagline)}" />
    <meta property="og:type" content="article" />
    <meta name="description" content="${escapeHtml(t.footerTagline)}" />
    <style>
${BASE_CSS}

${HEALTH_CSS}
    </style>
  </head>
  <body>
    <a class="skip-link" href="#report-content">${escapeHtml(t.skipToContent)}</a>
    <nav class="topbar" aria-label="${escapeHtml(t.reportSectionsLabel)}">
      <span class="topbar__title">${escapeHtml(t.reportTitle)}</span>
      <span class="topbar__date">${escapeHtml(rangeStart)} ~ ${escapeHtml(rangeEnd)}</span>
      <div class="topbar__nav">
        <a href="#assessment">${escapeHtml(t.navAssessment)}</a>
        <a href="#insights">${escapeHtml(t.navInsights)}</a>
        <a href="#actions">${escapeHtml(t.navActions)}</a>
        <a href="#sleep">${escapeHtml(t.navSleep)}</a>
        <a href="#recovery">${escapeHtml(t.navRecovery)}</a>
        <a href="#activity">${escapeHtml(t.navActivity)}</a>
        <a href="#body">${escapeHtml(t.navBody)}</a>
        ${menstrualChart ? `<a href="#menstrual">${escapeHtml(t.navMenstrual)}</a>` : ""}
        <a href="#appendix">${escapeHtml(t.navAppendix)}</a>
      </div>
      ${includeCrossLink ? `<a href="./training.report.html" class="topbar__cross-link" aria-label="${escapeHtml(t.crossReportTraining)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 5l7 7-7 7M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ${escapeHtml(t.crossReportTraining)}
      </a>` : ""}
      <a href="https://github.com/RuochenLyu/apple-health-analyst" class="topbar__github" aria-label="GitHub" target="_blank" rel="noopener">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
      </a>
    </nav>

    <main id="report-content">
      <header class="print-header">
        <h1>${escapeHtml(t.reportTitle)}</h1>
        <p>${escapeHtml(rangeStart)} ~ ${escapeHtml(rangeEnd)}</p>
      </header>
      ${sampleNotice ? `<aside class="sample-notice" role="note">${escapeHtml(sampleNotice)}</aside>` : ""}
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
          ${renderParagraphs(narrative.health_assessment, "assessment__text")}
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
      </section>

      ${actionBrief}

      <!-- Findings -->
      <section class="overview">
        <h2 class="overview__title">${escapeHtml(t.overviewTitle)}</h2>
        <p class="overview__text">${escapeHtml(narrative.overview)}</p>
        <div class="overview__findings">
          <h3>${escapeHtml(t.keyFindings)}</h3>
          <ol>
            ${narrative.key_findings.slice(0, 5).map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
          </ol>
        </div>
        <div class="brief-columns">
          <div>
            <h3>${escapeHtml(t.strengthsTitle)}</h3>
            <ul>${narrative.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
          <div>
            <h3>${escapeHtml(t.watchoutsTitle)}</h3>
            <ul>${narrative.watchouts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
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

      <!-- Supporting Cross-Metric Evidence -->
      <details id="insights" class="insights-section evidence-details">
        <summary>${escapeHtml(t.evidenceDetailsTitle)}</summary>
        <div class="evidence-details__body">
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
        </div>
      </details>

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
            ${renderGranularityNote(sleepChart?.series ?? [], t)}
            <div class="chart-panel-grid">${sleepPanels}</div>
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
              <caption class="sr-only">${escapeHtml(t.recoveryTableCaption)}</caption>
              <thead>
                <tr>
                  <th scope="col">${escapeHtml(t.thMetric)}</th>
                  <th scope="col">${escapeHtml(t.thLatest)}</th>
                  <th scope="col">${escapeHtml(t.thRecent30d)}</th>
                  <th scope="col">${escapeHtml(t.thBaseline)}</th>
                  <th scope="col">${escapeHtml(t.thDelta)}</th>
                </tr>
              </thead>
              <tbody>
                ${renderRecoveryRow(t.rowRestingHr, insights.analysis.recovery.metrics.restingHeartRate, t, fmt, fmtDelta)}
                ${renderRecoveryRow(t.rowHrv, insights.analysis.recovery.metrics.hrv, t, fmt, fmtDelta)}
                ${renderRecoveryRow(t.rowOxygen, insights.analysis.recovery.metrics.oxygenSaturation, t, fmt, fmtDelta)}
                ${renderRecoveryRow(t.rowRespiratoryRate, insights.analysis.recovery.metrics.respiratoryRate, t, fmt, fmtDelta)}
                ${renderRecoveryRow(t.rowVo2Max, insights.analysis.recovery.metrics.vo2Max, t, fmt, fmtDelta)}
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
            ${renderGranularityNote(activityChart?.series ?? [], t)}
            <div class="chart-panel-grid">${activityPanels}</div>
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
        ${renderGranularityNote(bodyChart?.series ?? [], t, true)}
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
              ${renderLegend([{ label: t.legendPeriodDuration, color: "#BE185D" }])}
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
                      <strong>${escapeHtml(moduleLabel(entry.module, t))}</strong>
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
      <div class="site-footer__tagline">${escapeHtml(t.projectBoundary)}</div>
      <div class="site-footer__links">
        ${includeCrossLink ? `<a href="./training.report.html">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 5l7 7-7 7M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          ${escapeHtml(t.crossReportTraining)}
        </a>` : ""}
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

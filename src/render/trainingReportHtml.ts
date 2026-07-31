import type { TrainingRenderT } from "../i18n/zh/trainingRender.js";
import type {
  ChartGroup,
  InsightBundle,
  TrainingLoadDaily,
  TrainingLoadStatus,
  TrainingNarrativeReport,
  TrainingReadiness,
  TrainingSportInsight,
  TrainingState,
  WorkoutTypeWindowSummary,
} from "../types.js";

import {
  renderDualAxisChart,
  renderMultiSeriesLineChart,
  renderPmcChart,
} from "./chartSvg.js";
import { BASE_CSS, TRAINING_CSS } from "./reportStyles.js";
import { renderTrainingIcon } from "./trainingIcons.js";

type SportWindowId = "recent30d" | "baseline90d" | "trailing180d" | "trailing365d" | "allTime";
type MetricCard = { label: string; value: string; sub?: string };

const DISTANCE_WORKOUT_TYPES = new Set([
  "HKWorkoutActivityTypeRunning",
  "HKWorkoutActivityTypeWalking",
  "HKWorkoutActivityTypeCycling",
  "HKWorkoutActivityTypeHiking",
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Inline glossary marker. Renders a small (?) bubble that reveals the tip
 * on hover/focus via CSS alone (see `.term-hint` in reportStyles.ts).
 */
function termHint(tip: string): string {
  return `<span class="term-hint" tabindex="0" role="note" data-tip="${escapeHtml(tip)}" aria-label="${escapeHtml(tip)}">?</span>`;
}

function displayNumber(value: number, t: TrainingRenderT): string {
  return value.toLocaleString(t.locale, { maximumFractionDigits: 1 });
}

function fmt(value: number | null, suffix: string, t: TrainingRenderT): string {
  return value === null ? t.insufficientData : `${displayNumber(value, t)}${suffix}`;
}

function fmtCount(value: number, t: TrainingRenderT): string {
  return value.toLocaleString(t.locale);
}

function labeled(label: string, value: string, t: TrainingRenderT): string {
  return t.htmlLang === "zh-CN" ? `${label}：${value}` : `${label}: ${value}`;
}

function parenthetical(value: string, t: TrainingRenderT): string {
  return t.htmlLang === "zh-CN" ? `（${value}）` : `(${value})`;
}

function renderParagraphs(value: string, className: string): string {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p class="${className}">${escapeHtml(paragraph)}</p>`)
    .join("");
}

function stateLabel(state: TrainingState, t: TrainingRenderT): string {
  switch (state) {
    case "building":
      return t.stateBuilding;
    case "maintaining":
      return t.stateMaintaining;
    case "recovering":
      return t.stateRecovering;
    case "strained":
      return t.stateStrained;
    case "detraining":
      return t.stateDetraining;
    case "mixed":
      return t.stateMixed;
    default:
      return t.stateInsufficient;
  }
}

function readinessLabel(readiness: TrainingReadiness, t: TrainingRenderT): string {
  switch (readiness) {
    case "good":
      return t.readinessGood;
    case "moderate":
      return t.readinessModerate;
    case "low":
      return t.readinessLow;
    default:
      return t.readinessInsufficient;
  }
}

function trendLabel(value: TrainingSportInsight["consistency"]["frequencyTrend"], t: TrainingRenderT): string {
  if (value === "denser") return t.frequencyTrendDenser;
  if (value === "sparser") return t.frequencyTrendSparser;
  if (value === "stable") return t.frequencyTrendStable;
  return t.frequencyTrendUnknown;
}

function tagLabel(tag: TrainingSportInsight["statusTags"][number], t: TrainingRenderT): string {
  switch (tag) {
    case "load rising":
      return t.tagLoadRising;
    case "load stable":
      return t.tagLoadStable;
    case "load falling":
      return t.tagLoadFalling;
    case "recovery supported":
      return t.tagRecoverySupported;
    case "recovery mixed":
      return t.tagRecoveryMixed;
    case "recovery concern":
      return t.tagRecoveryConcern;
    case "recovery unknown":
      return t.tagRecoveryUnknown;
    case "consistency good":
      return t.tagConsistencyGood;
    default:
      return t.tagConsistencyUneven;
  }
}

/** Map a sport status tag to its semantic badge class. */
function tagBadgeClass(tag: TrainingSportInsight["statusTags"][number]): string {
  switch (tag) {
    case "recovery supported":
    case "consistency good":
      return "badge--ok";
    case "recovery concern":
      return "badge--low";
    case "recovery mixed":
      return "badge--warn";
    case "recovery unknown":
      return "badge--info";
    case "load rising":
    case "load falling":
    case "consistency uneven":
      return "badge--warn";
    default:
      return "badge--info";
  }
}

/** Map training readiness to a semantic CSS modifier for the hero stat. */
function readinessClass(readiness: TrainingReadiness): string {
  switch (readiness) {
    case "good":
      return "assessment-hero__readiness-good";
    case "moderate":
      return "assessment-hero__readiness-moderate";
    case "low":
      return "assessment-hero__readiness-low";
    default:
      return "";
  }
}

/** Format a signed percentage delta for display. */
function fmtSignedPct(value: number | null, insufficient: string): string {
  if (value === null) {
    return insufficient;
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

/** Format TSB as a relative comparison, without importing absolute thresholds. */
function tsbDisplay(tsb: number, t: TrainingRenderT): { value: string; label: string } {
  const sign = tsb > 0 ? "+" : "";
  const value = `${sign}${tsb}`;
  const label = tsb < 0 ? t.tsbBuilding : tsb > 0 ? t.tsbFresh : t.tsbNeutral;
  return { value, label };
}

function renderCtlHeroStat(load: TrainingLoadStatus | null, t: TrainingRenderT): string {
  if (!load) {
    return `<div class="assessment-hero__stat">
      <span class="assessment-hero__stat-label">${escapeHtml(t.cardCtl)}${termHint(t.hintCtl)}</span>
      <span class="assessment-hero__stat-value">${escapeHtml(t.insufficientData)}</span>
    </div>`;
  }
  const deltaText = fmtSignedPct(load.ctlDelta30dPct, t.insufficientData);
  return `<div class="assessment-hero__stat">
    <span class="assessment-hero__stat-label">${escapeHtml(t.cardCtl)}${termHint(t.hintCtl)}</span>
    <span class="assessment-hero__stat-value">${escapeHtml(`${displayNumber(load.ctl, t)} ${t.cardCtlUnit}`)}</span>
    <span class="assessment-hero__stat-label">${escapeHtml(`${t.ctlDelta30dLabel}: ${deltaText}`)}</span>
  </div>`;
}

/** 5-level color ramp for the calendar heatmap. */
const HEATMAP_PALETTE = ["#F2F2F7", "#FED7AA", "#FDBA74", "#FB923C", "#EA580C", "#C2410C"] as const;

/**
 * Render the last 12-months training-load calendar in GitHub-contribution
 * style. Each cell = one day, color shade = MET-minute load bucketed into
 * 5 quantile levels (load = 0 stays neutral gray). Returns empty string when
 * there isn't enough data to draw anything meaningful.
 */
function renderLoadHeatmap(
  daily: TrainingLoadDaily[],
  effectiveEnd: string,
  t: TrainingRenderT,
): string {
  if (daily.length < 14) {
    return "";
  }

  // Always visualise the last 52 weeks ending on the week that contains `effectiveEnd`.
  const endDate = new Date(`${effectiveEnd}T00:00:00Z`);
  // Align endDate to the Sunday of its week (display ends on a Sunday column).
  const endDayOfWeek = endDate.getUTCDay(); // 0 = Sun, 1 = Mon, ...
  const daysUntilSunday = (7 - endDayOfWeek) % 7;
  const lastCol = new Date(endDate.getTime() + daysUntilSunday * 86400000);
  const startCol = new Date(lastCol.getTime() - (52 * 7 - 1) * 86400000);

  // Index daily entries by ISO date.
  const loadByDate = new Map<string, number>();
  for (const entry of daily) {
    loadByDate.set(entry.date, entry.load);
  }

  // Quantile thresholds from positive loads only.
  const positiveLoads = daily.map((d) => d.load).filter((v) => v > 0).sort((a, b) => a - b);
  const quantile = (q: number): number => {
    if (positiveLoads.length === 0) return 0;
    const idx = Math.floor(q * (positiveLoads.length - 1));
    return positiveLoads[idx];
  };
  const thresholds = [quantile(0.2), quantile(0.5), quantile(0.75), quantile(0.9)];
  const pickBucket = (load: number): number => {
    if (load <= 0) return 0;
    if (load <= thresholds[0]) return 1;
    if (load <= thresholds[1]) return 2;
    if (load <= thresholds[2]) return 3;
    if (load <= thresholds[3]) return 4;
    return 5;
  };

  // Cell geometry. The SVG uses viewBox + width:100% so it scales with the
  // container. Cell size is tuned to give a clear, readable grid at full
  // width (~1020px at 52 weeks).
  const cell = 16;
  const gap = 3;
  const monthLabelHeight = 16;
  const rowLabelWidth = 32;
  const weeks = 52;
  const width = rowLabelWidth + weeks * (cell + gap);
  const height = monthLabelHeight + 7 * (cell + gap);

  // Draw day cells.
  const cells: string[] = [];
  const monthLabels: string[] = [];
  const displayedLoads: Array<{ date: string; load: number }> = [];
  let lastMonthLabelCol = -3;
  for (let col = 0; col < weeks; col += 1) {
    const colStartMs = startCol.getTime() + col * 7 * 86400000;
    for (let row = 0; row < 7; row += 1) {
      // `startCol` is a Monday, so rows run Monday through Sunday.
      const dayMs = colStartMs + row * 86400000;
      const day = new Date(dayMs);
      if (day > endDate) continue; // Future days: skip
      const iso = day.toISOString().slice(0, 10);
      const load = loadByDate.get(iso) ?? 0;
      displayedLoads.push({ date: iso, load });
      const bucket = pickBucket(load);
      const x = rowLabelWidth + col * (cell + gap);
      const y = monthLabelHeight + row * (cell + gap);
      const title =
        load > 0
          ? t.heatmapTooltipLoad(iso, Math.round(load))
          : t.heatmapTooltipRest(iso);
      cells.push(
        `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${HEATMAP_PALETTE[bucket]}" stroke="#E5E7EB" stroke-width="0.5"><title>${escapeHtml(title)}</title></rect>`,
      );
    }
    // Month label: mark first column of each month (once per month, spaced ≥ 3 cols apart).
    const firstDayOfCol = new Date(colStartMs);
    if (firstDayOfCol.getUTCDate() <= 7 && col - lastMonthLabelCol >= 3) {
      const monthIdx = firstDayOfCol.getUTCMonth();
      const monthAbbrZh = [
        "1月",
        "2月",
        "3月",
        "4月",
        "5月",
        "6月",
        "7月",
        "8月",
        "9月",
        "10月",
        "11月",
        "12月",
      ];
      const monthAbbrEn = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const label = t.locale.startsWith("zh") ? monthAbbrZh[monthIdx] : monthAbbrEn[monthIdx];
      monthLabels.push(
        `<text x="${rowLabelWidth + col * (cell + gap)}" y="${monthLabelHeight - 4}" font-size="12" fill="#64748B">${escapeHtml(label)}</text>`,
      );
      lastMonthLabelCol = col;
    }
  }

  // Day-of-week labels for the Monday-first rows.
  const weekdayLabels = [
    { row: 0, text: t.heatmapWeekdayLabelMon },
    { row: 2, text: t.heatmapWeekdayLabelWed },
    { row: 4, text: t.heatmapWeekdayLabelFri },
  ]
    .map(
      ({ row, text }) =>
        `<text x="0" y="${monthLabelHeight + row * (cell + gap) + cell - 2}" font-size="12" fill="#64748B">${escapeHtml(text)}</text>`,
    )
    .join("");

  const legendSwatches = HEATMAP_PALETTE.map(
    (color) => `<span class="heatmap-legend__swatch" style="background:${color}"></span>`,
  ).join("");
  const activeLoads = displayedLoads.filter((entry) => entry.load > 0);
  const heatmapSummary = t.heatmapAriaSummary(
    displayedLoads.length,
    activeLoads.length,
    displayedLoads[0]?.date ?? effectiveEnd,
    displayedLoads.at(-1)?.date ?? effectiveEnd,
    Math.round(activeLoads.reduce((sum, entry) => sum + entry.load, 0)),
    Math.round(activeLoads.length > 0 ? Math.max(...activeLoads.map((entry) => entry.load)) : 0),
  );

  return `<div class="module-card heatmap-card">
    <div class="heatmap-card__header">
      <h3>${escapeHtml(t.heatmapTitle)}</h3>
      <p>${escapeHtml(t.heatmapSubtitle)}</p>
    </div>
    <div class="heatmap-wrap">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" tabindex="0" aria-label="${escapeHtml(t.heatmapTitle)}" xmlns="http://www.w3.org/2000/svg">
        <desc>${escapeHtml(heatmapSummary)}</desc>
        ${monthLabels.join("")}
        ${weekdayLabels}
        ${cells.join("")}
      </svg>
    </div>
    <div class="heatmap-legend">
      <span>${escapeHtml(t.heatmapLegendLess)}</span>
      <span class="heatmap-legend__swatches">${legendSwatches}</span>
      <span>${escapeHtml(t.heatmapLegendMore)}</span>
    </div>
  </div>`;
}

function renderGlossaryCard(t: TrainingRenderT): string {
  const entries: Array<{ label: string; body: string }> = [
    { label: t.glossaryCtlLabel, body: t.glossaryCtlBody },
    { label: t.glossaryAtlLabel, body: t.glossaryAtlBody },
    { label: t.glossaryTsbLabel, body: t.glossaryTsbBody },
    { label: t.glossaryMetMinutesLabel, body: t.glossaryMetMinutesBody },
    { label: t.glossaryReadinessLabel, body: t.glossaryReadinessBody },
  ];
  return `<details class="glossary-card">
    <summary>${escapeHtml(t.glossaryTitle)}</summary>
    <dl class="glossary-card__body">
      ${entries
        .map(
          (entry) =>
            `<div><dt>${escapeHtml(entry.label)}</dt><dd>${escapeHtml(entry.body)}</dd></div>`,
        )
        .join("")}
    </dl>
  </details>`;
}

function renderTrainingLoadSummary(load: TrainingLoadStatus | null, t: TrainingRenderT): string {
  if (!load) {
    return `<li>${escapeHtml(labeled(t.cardCtl, t.insufficientData, t))}</li>`;
  }
  const tsb = tsbDisplay(load.tsb, t);
  const parts: string[] = [
    `<li>${escapeHtml(labeled(t.cardCtl, `${displayNumber(load.ctl, t)} ${t.cardCtlUnit}`, t))}</li>`,
    `<li>${escapeHtml(labeled(t.ctlDelta30dLabel, fmtSignedPct(load.ctlDelta30dPct, t.insufficientData), t))}</li>`,
    `<li>${escapeHtml(labeled(t.ctlDelta90dLabel, fmtSignedPct(load.ctlDelta90dPct, t.insufficientData), t))}</li>`,
    `<li>${escapeHtml(labeled(t.cardTsb, `${load.tsb > 0 ? "+" : ""}${displayNumber(load.tsb, t)} · ${tsb.label}`, t))}</li>`,
    `<li>${escapeHtml(labeled(t.cardAtl, `${displayNumber(load.atl, t)} ${t.cardCtlUnit}`, t))}</li>`,
  ];
  if (load.warmupDays < 42) {
    parts.push(`<li>${escapeHtml(t.ctlWarmupNote(load.warmupDays))}</li>`);
  }
  return parts.join("");
}

function renderTsbHeroStat(load: TrainingLoadStatus | null, t: TrainingRenderT): string {
  if (!load) {
    return `<div class="assessment-hero__stat">
      <span class="assessment-hero__stat-label">${escapeHtml(t.cardTsb)}${termHint(t.hintTsb)}</span>
      <span class="assessment-hero__stat-value">${escapeHtml(t.insufficientData)}</span>
    </div>`;
  }
  const display = tsbDisplay(load.tsb, t);
  return `<div class="assessment-hero__stat">
    <span class="assessment-hero__stat-label">${escapeHtml(t.cardTsb)}${termHint(t.hintTsb)}</span>
    <span class="assessment-hero__stat-value">${escapeHtml(
      `${load.tsb > 0 ? "+" : ""}${displayNumber(load.tsb, t)}`,
    )}</span>
    <span class="assessment-hero__stat-label">${escapeHtml(display.label)}</span>
  </div>`;
}

function windowLabel(id: SportWindowId, t: TrainingRenderT): string {
  switch (id) {
    case "recent30d":
      return t.recent30dLabel;
    case "baseline90d":
      return t.baseline90dLabel;
    case "trailing180d":
      return t.trailing180dLabel;
    case "trailing365d":
      return t.trailing365dLabel;
    default:
      return t.allTimeLabel;
  }
}

function chartCallout(narrative: TrainingNarrativeReport, chartId: string, fallback: string): string {
  return narrative.chart_callouts.find((item) => item.chart_id === chartId)?.summary ?? fallback;
}

function trainingWindowStart(insights: InsightBundle, t: TrainingRenderT): string {
  const sportStart = insights.training.sports
    .map((sport) => sport.allTime.firstWorkoutDate)
    .filter((value): value is string => Boolean(value))
    .sort()[0];
  return sportStart?.slice(0, 10) ?? insights.coverage.windowStart ?? insights.coverage.earliestSeen?.slice(0, 10) ?? t.dash;
}

function chartColors(count: number): string[] {
  return ["#9A3412", "#B91C1C", "#0369A1", "#15803D", "#4338CA"].slice(0, Math.max(count, 1));
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
  return `<div class="metric-card" style="--metric-accent:${accent}">
    <div class="metric-card__label">${escapeHtml(label)}</div>
    <div class="metric-card__value">${escapeHtml(value)}</div>
    ${sub ? `<div class="metric-card__sub">${escapeHtml(sub)}</div>` : ""}
  </div>`;
}

function getSportWindow(sport: TrainingSportInsight, id: SportWindowId): WorkoutTypeWindowSummary {
  if (id === "recent30d") return sport.recent30d;
  if (id === "baseline90d") return sport.baseline90d;
  if (id === "trailing180d") return sport.trailing180d;
  if (id === "trailing365d") return sport.trailing365d;
  return sport.allTime;
}

function focusWindowId(sport: TrainingSportInsight): SportWindowId {
  if (sport.recent30d.workouts >= 2 || (sport.recent30d.totalDurationMinutes ?? 0) >= 120) {
    return "recent30d";
  }
  if (sport.trailing180d.workouts >= 3 || (sport.trailing180d.totalDurationMinutes ?? 0) >= 180) {
    return "trailing180d";
  }
  if (sport.trailing365d.workouts >= 4 || sport.consistency.activeMonthsLast12 >= 2) {
    return "trailing365d";
  }
  return "allTime";
}

function metricWindowOrder(focusWindow: SportWindowId): SportWindowId[] {
  const order: SportWindowId[] = [];
  for (const windowId of [focusWindow, "recent30d", "baseline90d", "trailing180d", "trailing365d", "allTime"] as SportWindowId[]) {
    if (!order.includes(windowId)) {
      order.push(windowId);
    }
  }
  return order;
}

function pickMetricWindow(
  sport: TrainingSportInsight,
  focusWindow: SportWindowId,
  predicate: (summary: WorkoutTypeWindowSummary) => boolean,
): { windowId: SportWindowId; summary: WorkoutTypeWindowSummary } | null {
  for (const windowId of metricWindowOrder(focusWindow)) {
    const summary = getSportWindow(sport, windowId);
    if (predicate(summary)) {
      return { windowId, summary };
    }
  }
  return null;
}

function sportSupportsDistance(sport: TrainingSportInsight): boolean {
  return DISTANCE_WORKOUT_TYPES.has(sport.type);
}

function heartRateMetricCard(
  sport: TrainingSportInsight,
  focusWindow: SportWindowId,
  t: TrainingRenderT,
): MetricCard | null {
  const metric = pickMetricWindow(
    sport,
    focusWindow,
    (summary) =>
      summary.averageHeartRateBpm !== null &&
      (summary.heartRateCoveragePct ?? 0) >= 60 &&
      summary.workouts >= 3,
  );
  if (!metric) return null;
  return {
    label: t.avgHeartRateLabel,
    value: fmt(metric.summary.averageHeartRateBpm, t.unitBpm, t),
    sub: windowLabel(metric.windowId, t),
  };
}

function distanceMetricCard(
  sport: TrainingSportInsight,
  focusWindow: SportWindowId,
  t: TrainingRenderT,
): MetricCard | null {
  if (!sportSupportsDistance(sport)) {
    return null;
  }
  const metric = pickMetricWindow(
    sport,
    focusWindow,
    (summary) =>
      summary.totalDistanceKm !== null &&
      (summary.distanceCoveragePct ?? 0) >= 60 &&
      summary.workouts >= 1,
  );
  if (!metric) return null;
  return {
    label: t.distanceLabel,
    value: fmt(metric.summary.totalDistanceKm, t.unitKm, t),
    sub: windowLabel(metric.windowId, t),
  };
}

function metsMetricCard(
  sport: TrainingSportInsight,
  focusWindow: SportWindowId,
  t: TrainingRenderT,
): MetricCard | null {
  const metric = pickMetricWindow(
    sport,
    focusWindow,
    (summary) =>
      summary.averageMETs !== null &&
      (summary.metsCoveragePct ?? 0) >= 60 &&
      summary.workouts >= 1,
  );
  if (!metric) return null;
  return {
    label: t.avgMetsLabel,
    value: fmt(metric.summary.averageMETs, "", t),
    sub: windowLabel(metric.windowId, t),
  };
}

function buildSportMetricCards(sport: TrainingSportInsight, t: TrainingRenderT): MetricCard[] {
  const focusWindow = focusWindowId(sport);
  const focusSummary = getSportWindow(sport, focusWindow);
  const cards: MetricCard[] = [
    {
      label: windowLabel(focusWindow, t),
      value: t.workoutCountValue(fmtCount(focusSummary.workouts, t)),
      sub: fmt(focusSummary.totalDurationMinutes, t.unitMinutes, t),
    },
    {
      label: t.activeEnergyLabel,
      value: fmt(focusSummary.totalActiveEnergyBurnedKcal, t.unitKcal, t),
      sub: windowLabel(focusWindow, t),
    },
  ];

  const firstSpecialMetric =
    distanceMetricCard(sport, focusWindow, t) ??
    heartRateMetricCard(sport, focusWindow, t) ??
    metsMetricCard(sport, focusWindow, t);

  const secondSpecialMetric =
    !sportSupportsDistance(sport)
      ? heartRateMetricCard(sport, focusWindow, t) ?? metsMetricCard(sport, focusWindow, t)
      : heartRateMetricCard(sport, focusWindow, t) ?? metsMetricCard(sport, focusWindow, t);

  if (firstSpecialMetric) {
    cards.push(firstSpecialMetric);
  }

  if (secondSpecialMetric && cards.every((card) => card.label !== secondSpecialMetric.label)) {
    cards.push(secondSpecialMetric);
  }

  cards.push({
    label: t.activeMonthsLast12Label,
    value: fmtCount(sport.consistency.activeMonthsLast12, t),
    sub: labeled(t.longestGapLabel, fmt(sport.consistency.longestGapDays, t.unitDays, t), t),
  });

  return cards.slice(0, 4);
}

function renderChartGroup(chart: ChartGroup, narrative: TrainingNarrativeReport, t: TrainingRenderT): string {
  if (chart.series.length === 0) {
    return `<div class="module-card__note">${escapeHtml(t.noChartData)}</div>`;
  }

  // PMC hero chart: two EWMA lines (CTL/ATL) plus TSB area, all emitted by
  // buildTrainingLoadChart. Detected by the "area" visual on the third series.
  const isPmc =
    chart.id === "training_load" &&
    chart.series.length === 3 &&
    chart.series[2].visual === "area";

  if (isPmc) {
    const ctlColor = "#C35B12";
    const atlColor = "#176B87";
    const tsbPositive = "#18764A";
    const tsbNegative = "#C93636";
    return `<div class="module-card">
      <div class="module-card__header">
        <div>
          <h3>${escapeHtml(chart.title)}</h3>
          <p>${escapeHtml(chartCallout(narrative, chart.id, chart.subtitle || t.chartCalloutFallback))}</p>
        </div>
      </div>
      <div class="pmc-legend">
        <div class="pmc-legend__panel">
          <span class="pmc-legend__panel-title">${escapeHtml(t.pmcLegendUpperTitle)}</span>
          <span class="legend-item"><i style="background:${ctlColor}"></i>${escapeHtml(chart.series[0].label)}</span>
          <span class="legend-item"><i style="background:${atlColor}"></i>${escapeHtml(chart.series[1].label)}</span>
        </div>
        <div class="pmc-legend__panel">
          <span class="pmc-legend__panel-title">${escapeHtml(t.pmcLegendLowerTitle)}</span>
          <span class="legend-item"><i class="legend-item__swatch" style="background:${tsbPositive}"></i>${escapeHtml(t.pmcLegendTsbFresh)}</span>
          <span class="legend-item"><i class="legend-item__swatch" style="background:${tsbNegative}"></i>${escapeHtml(t.pmcLegendTsbFatigue)}</span>
        </div>
      </div>
      <div class="chart-wrap">${renderPmcChart(
        chart.series[0],
        chart.series[1],
        chart.series[2],
        { ctl: ctlColor, atl: atlColor, tsbPositive, tsbNegative },
        { width: 700, height: 280 },
        t,
      )}</div>
    </div>`;
  }

  // Sport trend chart: two orthogonal series (count + avg duration) drawn with
  // a dual y-axis. Detected by the "bar" + "line" visual combination.
  const isDualAxis =
    chart.series.length === 2 &&
    chart.series[0].visual === "bar" &&
    chart.series[1].visual === "line";

  if (isDualAxis) {
    const barColor = "#9A3412";
    const lineColor = "#B91C1C";
    return `<div class="module-card">
      <div class="module-card__header">
        <div>
          <h3>${escapeHtml(chart.title)}</h3>
          <p>${escapeHtml(chartCallout(narrative, chart.id, chart.subtitle || t.chartCalloutFallback))}</p>
        </div>
      </div>
      ${renderLegend([
        { label: chart.series[0].label, color: barColor },
        { label: chart.series[1].label, color: lineColor },
      ])}
      <div class="chart-wrap">${renderDualAxisChart(chart.series[0], chart.series[1], { bar: barColor, line: lineColor }, { width: 700, height: 240 }, t)}</div>
    </div>`;
  }

  const colors = chartColors(chart.series.length);
  return `<div class="module-card">
    <div class="module-card__header">
      <div>
        <h3>${escapeHtml(chart.title)}</h3>
        <p>${escapeHtml(chartCallout(narrative, chart.id, chart.subtitle || t.chartCalloutFallback))}</p>
      </div>
    </div>
    ${renderLegend(chart.series.map((series, index) => ({ label: series.label, color: colors[index] ?? "#9A3412" })))}
    <div class="chart-wrap">${renderMultiSeriesLineChart(chart.series, colors, { width: 700, height: 220 }, t)}</div>
  </div>`;
}

function renderWindowLine(
  sport: TrainingSportInsight,
  windowId: SportWindowId,
  t: TrainingRenderT,
): string {
  const summary = getSportWindow(sport, windowId);
  return `<li>${escapeHtml(
    labeled(
      windowLabel(windowId, t),
      `${t.workoutCountValue(fmtCount(summary.workouts, t))} / ${fmt(summary.totalDurationMinutes, t.unitMinutes, t)}`,
      t,
    ),
  )}</li>`;
}

function sportLoadWindowIds(sport: TrainingSportInsight): SportWindowId[] {
  const order: SportWindowId[] = [];
  for (const windowId of [
    focusWindowId(sport),
    "recent30d",
    "baseline90d",
    "trailing180d",
    "trailing365d",
    "allTime",
  ] as SportWindowId[]) {
    if (order.includes(windowId)) {
      continue;
    }
    const summary = getSportWindow(sport, windowId);
    if (windowId !== "allTime" && summary.workouts === 0 && summary.totalDurationMinutes === null) {
      continue;
    }
    order.push(windowId);
  }
  return order;
}

function renderSportSection(
  sport: TrainingSportInsight,
  narrative: TrainingNarrativeReport,
  charts: ChartGroup[],
  t: TrainingRenderT,
  index: number,
): string {
  const sectionNarrative = narrative.sport_sections.find((entry) => entry.sport_id === sport.id);
  const chart = charts.find((item) => item.id === `sport_${sport.id}_trend`);
  const accent = "#9A3412";
  const metricCards = buildSportMetricCards(sport, t);
  const loadWindows = sportLoadWindowIds(sport);
  const indexLabel = String(index).padStart(2, "0");
  const isDormant = sport.recent30d.workouts === 0;
  const assessment = sectionNarrative?.assessment ?? t.chartCalloutFallback;
  const signals = sectionNarrative?.key_signals ?? [];
  const recommendations = sectionNarrative?.recommendations ?? [];
  const narrativeCards = [
    signals.length > 0
      ? `<div class="module-card">
          <h3>${escapeHtml(t.sportSignalsTitle)}</h3>
          <ul class="plain-list">
            ${signals.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>`
      : "",
    recommendations.length > 0
      ? `<div class="module-card">
          <h3>${escapeHtml(t.sportRecommendationsTitle)}</h3>
          <ul class="plain-list">
            ${recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>`
      : "",
  ]
    .filter(Boolean)
    .join("");
  const header = `
      <div class="module__title-wrap">
        <span class="module__index">${escapeHtml(indexLabel)}</span>
        <span class="module__icon module__icon--emoji">${renderTrainingIcon(sport.icon)}</span>
        <div>
          <h2>${escapeHtml(sport.label)}</h2>
          <p>${escapeHtml(isDormant ? t.dormantSportHint : assessment)}</p>
        </div>
      </div>
      <div class="pills">${sport.statusTags
        .map(
          (tag) =>
            `<span class="badge ${tagBadgeClass(tag)}">${escapeHtml(tagLabel(tag, t))}</span>`,
        )
        .join("")}</div>`;
  const body = `
      ${isDormant ? `<p class="sport-disclosure__assessment">${escapeHtml(assessment)}</p>` : ""}
      <div class="summary-cards summary-cards--sport">
        ${metricCards
          .map((card) => renderMetricCard(card.label, card.value, accent, card.sub))
          .join("")}
      </div>
      <div class="module-card-grid">
        <div class="module-card">
          <h3>${escapeHtml(t.loadTrendTitle)}</h3>
          <ul class="plain-list">
            ${loadWindows.map((windowId) => renderWindowLine(sport, windowId, t)).join("")}
            <li>${escapeHtml(labeled(t.consistencyTrendLabel, trendLabel(sport.consistency.frequencyTrend, t), t))}</li>
          </ul>
        </div>
        <div class="module-card">
          <h3>${escapeHtml(t.recoverySupportTitle)}</h3>
          <ul class="plain-list">
            <li>${escapeHtml(labeled(t.recoverySampleCountLabel, `${sport.recoveryAfterWorkout.sampleCount}`, t))}</li>
            <li>${escapeHtml(labeled(t.recoveryComparisonLabel, t.recoveryComparisonValue, t))}</li>
            <li>${escapeHtml(labeled(`${t.nextDaySleepDeltaLabel} ${parenthetical(t.comparisonSampleCountNote(sport.recoveryAfterWorkout.sleepSampleCount, sport.recoveryAfterWorkout.sleepComparatorSampleCount), t)}`, fmt(sport.recoveryAfterWorkout.nextDaySleepHoursDelta, t.unitHours, t), t))}</li>
            <li>${escapeHtml(labeled(`${t.nextDayHrvDeltaLabel} ${parenthetical(t.comparisonSampleCountNote(sport.recoveryAfterWorkout.hrvSampleCount, sport.recoveryAfterWorkout.hrvComparatorSampleCount), t)}`, fmt(sport.recoveryAfterWorkout.nextDayHrvDelta, t.unitMilliseconds, t), t))}</li>
            <li>${escapeHtml(labeled(`${t.nextDayRestingHrDeltaLabel} ${parenthetical(t.comparisonSampleCountNote(sport.recoveryAfterWorkout.restingHeartRateSampleCount, sport.recoveryAfterWorkout.restingHeartRateComparatorSampleCount), t)}`, fmt(sport.recoveryAfterWorkout.nextDayRestingHeartRateDelta, t.unitBpm, t), t))}</li>
          </ul>
        </div>
      </div>
      ${chart ? renderChartGroup(chart, narrative, t) : ""}
      ${narrativeCards ? `<div class="module-card-grid">${narrativeCards}</div>` : ""}
  `;

  if (isDormant) {
    return `<details id="${escapeHtml(sport.id)}" class="module module--activity sport-module sport-disclosure">
      <summary class="module__header module__header--sport sport-disclosure__summary">${header}</summary>
      <div class="module__body">${body}</div>
    </details>`;
  }

  return `<section id="${escapeHtml(sport.id)}" class="module module--activity sport-module">
    <div class="module__header module__header--sport">${header}</div>
    <div class="module__body">${body}</div>
  </section>`;
}

export interface RenderTrainingReportHtmlOptions {
  /**
   * When true, emits the topbar and footer cross-link that jumps to the
   * health report. The skill only sets this when the health report is being
   * rendered into the same output directory — skipping it prevents a dead
   * `./report.html` link on single-report runs.
  */
  includeCrossLink?: boolean;
  /**
   * Optional notice shown near the start of the report. Public demos use it
   * to make the synthetic-data boundary explicit.
   */
  sampleNotice?: string;
}

export function renderTrainingReportHtml(
  insights: InsightBundle,
  narrative: TrainingNarrativeReport,
  t: TrainingRenderT,
  options: RenderTrainingReportHtmlOptions = {},
): string {
  const includeCrossLink = options.includeCrossLink === true;
  const sampleNotice = options.sampleNotice?.trim();
  const training = insights.training;
  const loadChart = training.charts.find((chart) => chart.id === "training_load");
  const recoveryChart = training.charts.find((chart) => chart.id === "training_recovery");
  const windowStart = trainingWindowStart(insights, t);
  const windowEnd = insights.coverage.windowEnd.slice(0, 10);
  const hasWatchouts = narrative.watchouts.length > 0;
  const actionBrief = `<section id="actions" class="action-brief">
    <div class="action-brief__heading">
      <span class="action-brief__eyebrow">${escapeHtml(t.navActions)}</span>
      <h2>${escapeHtml(t.actionsTitle)}</h2>
    </div>
    <div class="actions${hasWatchouts ? "" : " actions--single"}">
      <div class="actions__card">
        <h3>${escapeHtml(t.actionsPriorityTitle)}</h3>
        <ul class="plain-list">${narrative.actions_next_2_weeks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      ${hasWatchouts ? `<div class="actions__card actions__card--warn">
        <h3>${escapeHtml(t.watchoutsTitle)}</h3>
        <ul class="plain-list">${narrative.watchouts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>` : ""}
    </div>
    ${narrative.questions_for_doctor.length > 0 ? `<div class="actions actions--single">
      <div class="actions__card actions__card--quiet">
        <h3>${escapeHtml(t.doctorQuestionsTitle)}</h3>
        <ul class="plain-list">${narrative.questions_for_doctor.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
    </div>` : ""}
  </section>`;

  return `<!doctype html>
<html lang="${escapeHtml(t.htmlLang)}">
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

${TRAINING_CSS}
    </style>
  </head>
  <body>
    <a class="skip-link" href="#report-content">${escapeHtml(t.skipToContent)}</a>
    <div class="topbar">
      <div class="topbar__title">${escapeHtml(t.reportTitle)}</div>
      <span class="topbar__date">${escapeHtml(windowStart)} ~ ${escapeHtml(windowEnd)}</span>
      <nav class="topbar__nav" aria-label="${escapeHtml(t.reportSectionsLabel)}">
        <a href="#assessment">${escapeHtml(t.navAssessment)}</a>
        <a href="#load-recovery">${escapeHtml(t.navLoadRecovery)}</a>
        <a href="#sports">${escapeHtml(t.navSports)}</a>
        <a href="#actions">${escapeHtml(t.navActions)}</a>
        <a href="#appendix">${escapeHtml(t.navAppendix)}</a>
      </nav>
      ${includeCrossLink ? `<a href="./report.html" class="topbar__cross-link" aria-label="${escapeHtml(t.crossReportHealth)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5l-7 7 7 7M19 12H5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ${escapeHtml(t.crossReportHealth)}
      </a>` : ""}
      <a href="https://github.com/RuochenLyu/apple-health-analyst" class="topbar__github" aria-label="GitHub" target="_blank" rel="noopener">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
      </a>
    </div>
    <main id="report-content">
      <header class="print-header">
        <h1>${escapeHtml(t.reportTitle)}</h1>
        <p>${escapeHtml(windowStart)} ~ ${escapeHtml(windowEnd)}</p>
      </header>
      ${sampleNotice ? `<aside class="sample-notice" role="note">${escapeHtml(sampleNotice)}</aside>` : ""}
      <section id="assessment" class="assessment-hero">
        <div class="assessment-hero__main">
          <h1>${escapeHtml(t.assessmentTitle)}</h1>
          ${renderParagraphs(narrative.training_assessment, "assessment-hero__text")}
        </div>
        <aside class="assessment-hero__aside">
          <div class="assessment-hero__stat">
            <span class="assessment-hero__stat-label">${escapeHtml(t.cardTrainingState)}${termHint(t.hintTrainingState)}</span>
            <span class="assessment-hero__stat-value">${escapeHtml(stateLabel(training.summary.trainingState, t))}</span>
          </div>
          <div class="assessment-hero__stat">
            <span class="assessment-hero__stat-label">${escapeHtml(t.cardReadiness)}${termHint(t.hintReadiness)}</span>
            <span class="assessment-hero__stat-value ${readinessClass(training.summary.readiness)}">${escapeHtml(readinessLabel(training.summary.readiness, t))}</span>
          </div>
          ${renderCtlHeroStat(training.summary.trainingLoad, t)}
          ${renderTsbHeroStat(training.summary.trainingLoad, t)}
          <div class="assessment-hero__stat">
            <span class="assessment-hero__stat-label">${escapeHtml(t.cardPrimarySport)}${termHint(t.hintPrimarySport)}</span>
            <span class="assessment-hero__stat-value">${escapeHtml(training.summary.primarySportLabel ?? t.insufficientData)}</span>
          </div>
        </aside>
      </section>

      ${actionBrief}

      <section id="findings" class="overview">
        <h2 class="overview__title">${escapeHtml(t.overallFindingsTitle)}</h2>
        <ul class="plain-list">
          ${narrative.overall_findings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>

      <section id="load-recovery" class="module module--recovery-support">
        <div class="module__header">
          <span class="module__index">01</span>
          <div>
            <h2 class="module__title">${escapeHtml(t.loadRecoveryTitle)}</h2>
            <p class="module__callout">${escapeHtml(
              training.summary.recoverySupport.adequate === true
                ? t.supportAdequate
                : training.summary.recoverySupport.adequate === false
                  ? t.supportInadequate
                  : t.supportUnknown,
            )}</p>
          </div>
        </div>
        <div class="module__body">
          <div class="module-card-grid">
            <div class="module-card">
              <h3>${escapeHtml(t.loadTrendTitle)}</h3>
              <ul class="plain-list">
                ${renderTrainingLoadSummary(training.summary.trainingLoad, t)}
                <li>${escapeHtml(labeled(`${t.workoutsLabel} ${t.vsBaseline}`, fmt(training.summary.loadTrend.recentVsBaseline90d.workoutsPer30d, "", t), t))}</li>
                <li>${escapeHtml(labeled(`${t.durationLabel} ${t.vsBaseline}`, fmt(training.summary.loadTrend.recentVsBaseline90d.durationMinutesPer30d, t.unitMinutes, t), t))}</li>
                <li>${escapeHtml(labeled(t.varietyLabel, `${training.summary.loadTrend.recentWorkoutVariety} ${parenthetical(`${t.vsBaseline} ${training.summary.loadTrend.recentVsBaselineVariety > 0 ? "+" : ""}${training.summary.loadTrend.recentVsBaselineVariety}`, t)}`, t))}</li>
              </ul>
            </div>
            <div class="module-card">
              <h3>${escapeHtml(t.recoverySupportTitle)}</h3>
              <ul class="plain-list">
                <li>${escapeHtml(labeled(t.sleepVsBaselineLabel, fmt(training.summary.recoverySupport.sleepDeltaHours, t.unitHours, t), t))}</li>
                <li>${escapeHtml(labeled(t.hrvVsBaselineLabel, fmt(training.summary.recoverySupport.hrvDeltaPct, "%", t), t))}</li>
                <li>${escapeHtml(labeled(t.restingHeartRateVsBaselineLabel, fmt(training.summary.recoverySupport.restingHeartRateDeltaBpm, t.unitBpm, t), t))}</li>
              </ul>
            </div>
          </div>
          ${loadChart ? renderChartGroup(loadChart, narrative, t) : ""}
          ${renderLoadHeatmap(training.dailyLoad, insights.coverage.windowEnd.slice(0, 10), t)}
          ${recoveryChart ? renderChartGroup(recoveryChart, narrative, t) : ""}
          ${renderGlossaryCard(t)}
        </div>
      </section>

      <section id="sports">
        ${training.sports.length > 0
          ? training.sports
              .map((sport, sportIndex) =>
                renderSportSection(sport, narrative, training.charts, t, sportIndex + 2),
              )
              .join("")
          : `<div class="overview"><p class="overview__text">${escapeHtml(t.noSportData)}</p></div>`}
      </section>

      <section id="appendix" class="module">
        <div class="module__header">
          <div>
            <h2>${escapeHtml(t.appendixTitle)}</h2>
          </div>
        </div>
        <div class="module__body">
          <div class="module-card-grid">
            <div class="module-card">
              <h3>${escapeHtml(t.appendixTitle)}</h3>
              <ul class="plain-list">${narrative.data_limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
            <div class="module-card">
              <h3>${escapeHtml(t.disclaimerTitle)}</h3>
              <p>${escapeHtml(narrative.disclaimer)}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <a href="https://github.com/RuochenLyu/apple-health-analyst" class="site-footer__brand" target="_blank" rel="noopener">apple-health-analyst</a>
      <div class="site-footer__tagline">${escapeHtml(t.footerTagline)}</div>
      <div class="site-footer__tagline">${escapeHtml(t.projectBoundary)}</div>
      <div class="site-footer__links">
        ${includeCrossLink ? `<a href="./report.html">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5l-7 7 7 7M19 12H5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          ${escapeHtml(t.crossReportHealth)}
        </a>` : ""}
        <a href="https://github.com/RuochenLyu/apple-health-analyst" target="_blank" rel="noopener">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          GitHub
        </a>
      </div>
    </footer>
  </body>
</html>`;
}

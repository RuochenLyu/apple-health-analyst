import type { ChartPoint, ChartSeries } from "../types.js";

interface ChartSize {
  width: number;
  height: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_MARKER_GAP = 8;

/**
 * Minimal i18n surface the chart renderer depends on.
 * Both `RenderT` (health report) and `TrainingRenderT` (training report)
 * satisfy this shape structurally, so either may be passed in.
 */
export interface ChartLabelsT {
  sparklineAriaLabel: (label: string) => string;
  barChartAriaLabel: (label: string) => string;
  lineChartAriaLabel: string;
  chartSeriesAriaSummary: (
    label: string,
    count: number,
    firstLabel: string,
    firstValue: string,
    latestLabel: string,
    latestValue: string,
    minValue: string,
    maxValue: string,
  ) => string;
  chartNoDataAriaSummary: string;
}

/** Format a tooltip numeric value: trim trailing zeros, cap at 2 decimals. */
function formatTooltipValue(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  // Round to 2 decimals, then strip trailing zeros.
  const rounded = Math.round(value * 100) / 100;
  return rounded
    .toFixed(2)
    .replace(/\.?0+$/, "");
}

/**
 * Keep chart units as supplied, except for the one English plural that can
 * otherwise produce the visibly incorrect "1 sessions" in SVG tooltips.
 */
function formatUnitSuffix(unit: string, value: number): string {
  const normalized = unit.trim();
  if (!normalized) {
    return "";
  }
  return ` ${normalized === "sessions" && value === 1 ? "session" : normalized}`;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function chartSeriesSummary(
  series: ChartSeries,
  t?: ChartLabelsT,
): string | null {
  const points = series.points.filter(
    (point): point is ChartPoint & { value: number } =>
      typeof point.value === "number" && Number.isFinite(point.value),
  );
  if (points.length === 0) {
    return null;
  }

  const first = points[0];
  const latest = points[points.length - 1];
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const displayValue = (value: number): string =>
    `${formatTooltipValue(value)}${formatUnitSuffix(series.unit, value)}`;

  if (t) {
    return t.chartSeriesAriaSummary(
      series.label,
      points.length,
      first.label,
      displayValue(first.value),
      latest.label,
      displayValue(latest.value),
      displayValue(min),
      displayValue(max),
    );
  }

  const pointWord = points.length === 1 ? "data point" : "data points";
  return `${series.label}: ${points.length} ${pointWord}; first ${first.label}, ${displayValue(first.value)}; latest ${latest.label}, ${displayValue(latest.value)}; range ${displayValue(min)} to ${displayValue(max)}.`;
}

function chartAriaDescription(
  seriesList: ChartSeries[],
  t?: ChartLabelsT,
): string {
  const summaries = seriesList
    .map((series) => chartSeriesSummary(series, t))
    .filter((summary): summary is string => summary !== null);
  if (summaries.length > 0) {
    return summaries.join(" ");
  }
  return t?.chartNoDataAriaSummary ?? "No numeric data points.";
}

function numericPoints(series: ChartSeries): number[] {
  return series.points
    .map((point) => point.value)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function extent(values: number[]): { min: number; max: number } {
  if (values.length === 0) {
    return { min: 0, max: 1 };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }
  const padding = (max - min) * 0.1;
  return { min: min - padding, max: max + padding };
}

function xPosition(index: number, total: number, left: number, right: number): number {
  if (total <= 1) {
    return (left + right) / 2;
  }
  return left + (index / (total - 1)) * (right - left);
}

function pointTime(point: ChartPoint): number | null {
  const start = Date.parse(point.start);
  const end = Date.parse(point.end);
  if (!Number.isFinite(start)) {
    return null;
  }
  return Number.isFinite(end) ? start + (end - start) / 2 : start;
}

function timeExtent(seriesList: ChartSeries[]): { min: number; max: number } | null {
  const timestamps = seriesList.flatMap((series) =>
    series.points
      .map(pointTime)
      .filter((value): value is number => value !== null),
  );
  if (timestamps.length < 2) {
    return null;
  }
  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  return min === max ? null : { min, max };
}

function temporalXPosition(
  point: ChartPoint,
  fallbackIndex: number,
  fallbackTotal: number,
  left: number,
  right: number,
  timeRange: { min: number; max: number } | null,
): number {
  const timestamp = pointTime(point);
  if (timestamp === null || !timeRange) {
    return xPosition(fallbackIndex, fallbackTotal, left, right);
  }
  return left + ((timestamp - timeRange.min) / (timeRange.max - timeRange.min)) * (right - left);
}

function formatTemporalAxisLabel(timestamp: number, spanMs: number): string {
  const iso = new Date(timestamp).toISOString();
  if (spanMs >= 180 * DAY_MS) {
    return iso.slice(0, 7);
  }
  if (spanMs >= 2 * DAY_MS) {
    return iso.slice(5, 10);
  }
  return `${iso.slice(5, 10)} ${iso.slice(11, 16)}`;
}

function renderTemporalAxisLabels(
  timeRange: { min: number; max: number },
  maxLabels: number,
  left: number,
  right: number,
  y: number,
): string {
  const spanMs = timeRange.max - timeRange.min;
  const availableCalendarDays = Math.max(2, Math.floor(spanMs / DAY_MS) + 1);
  const count = Math.max(2, Math.min(maxLabels, availableCalendarDays));

  return Array.from({ length: count }, (_, index) => {
    const ratio = count === 1 ? 0 : index / (count - 1);
    const timestamp = timeRange.min + spanMs * ratio;
    const x = left + (right - left) * ratio;
    const anchor = index === 0 ? "start" : index === count - 1 ? "end" : "middle";
    return `<text data-axis="x" x="${x}" y="${y}" text-anchor="${anchor}" font-size="12" fill="#596579">${escapeAttribute(formatTemporalAxisLabel(timestamp, spanMs))}</text>`;
  }).join("");
}

function gapTolerance(point: ChartPoint): number {
  if (point.granularity === "day") return 3 * DAY_MS;
  if (point.granularity === "week") return 21 * DAY_MS;
  return 93 * DAY_MS;
}

function hasLargeTemporalGap(previous: ChartPoint, current: ChartPoint): boolean {
  const previousEnd = Date.parse(previous.end);
  const currentStart = Date.parse(current.start);
  if (!Number.isFinite(previousEnd) || !Number.isFinite(currentStart)) {
    return false;
  }
  return currentStart - previousEnd > Math.max(gapTolerance(previous), gapTolerance(current));
}

function visibleMarkerIndices(
  series: ChartSeries,
  left: number,
  right: number,
  timeRange: { min: number; max: number } | null,
): Set<number> {
  const candidates = series.points
    .map((point, index) => ({
      index,
      x: temporalXPosition(point, index, series.points.length, left, right, timeRange),
      value: point.value,
    }))
    .filter(
      (entry): entry is { index: number; x: number; value: number } =>
        typeof entry.value === "number" && Number.isFinite(entry.value),
    );

  if (candidates.length <= 1) {
    return new Set(candidates.map((entry) => entry.index));
  }

  const first = candidates[0];
  const last = candidates[candidates.length - 1];
  if (last.x - first.x < MIN_MARKER_GAP) {
    return new Set([last.index]);
  }

  const selected = new Set<number>([first.index]);
  let previousVisibleX = first.x;
  for (const candidate of candidates.slice(1, -1)) {
    if (
      candidate.x - previousVisibleX >= MIN_MARKER_GAP &&
      last.x - candidate.x >= MIN_MARKER_GAP
    ) {
      selected.add(candidate.index);
      previousVisibleX = candidate.x;
    }
  }
  selected.add(last.index);
  return selected;
}

function projectedBarWidth(
  point: ChartPoint,
  timeRange: { min: number; max: number } | null,
  plotWidth: number,
  fallbackWidth: number,
): number {
  if (!timeRange) {
    return fallbackWidth;
  }
  const start = Date.parse(point.start);
  const end = Date.parse(point.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return fallbackWidth;
  }
  const span = Math.max(timeRange.max - timeRange.min, DAY_MS);
  const duration = Math.max(end - start + 1, DAY_MS);
  return Math.max(0.08, Math.min(32, (duration / span) * plotWidth * 0.72));
}

function yPosition(value: number, min: number, max: number, top: number, bottom: number): number {
  const normalized = (value - min) / (max - min);
  return bottom - normalized * (bottom - top);
}

function formatAxisValue(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${Math.round(value)}`;
  }
  if (Math.abs(value) >= 100) {
    return `${Math.round(value)}`;
  }
  if (Number.isInteger(value)) {
    return `${value}`;
  }
  return value.toFixed(1);
}

/** Shorten a chart point label for X-axis display */
function shortenLabel(label: string): string {
  // "2026-03-15" → "03-15"
  const dateMatch = label.match(/^\d{4}-(\d{2}-\d{2})$/);
  if (dateMatch) {
    return dateMatch[1];
  }
  // "2026-03-10 ~ 2026-03-16" → "03-10~03-16"
  const rangeMatch = label.match(/^\d{4}-(\d{2}-\d{2}) ~ \d{4}-(\d{2}-\d{2})$/);
  if (rangeMatch) {
    return `${rangeMatch[1]}~${rangeMatch[2]}`;
  }
  // "2026-03" → "2026-03"
  return label;
}

/** Pick evenly-spaced indices for axis labels */
function pickLabelIndices(total: number, maxLabels: number): number[] {
  if (total <= maxLabels) {
    return Array.from({ length: total }, (_, i) => i);
  }
  const indices: number[] = [0];
  const step = (total - 1) / (maxLabels - 1);
  for (let i = 1; i < maxLabels - 1; i++) {
    indices.push(Math.round(step * i));
  }
  indices.push(total - 1);
  return [...new Set(indices)];
}

// ─── Sparkline (compact, no axes) ──────────────────────────────────

export function renderLineSparkline(
  series: ChartSeries,
  color: string,
  size: ChartSize = { width: 180, height: 56 },
  t?: ChartLabelsT,
): string {
  const values = numericPoints(series);
  const { min, max } = extent(values);
  const pad = 6;
  const points = series.points
    .map((point, index) => {
      if (point.value === null) {
        return null;
      }
      return `${xPosition(index, series.points.length, pad, size.width - pad)},${yPosition(
        point.value,
        min,
        max,
        pad,
        size.height - pad,
      )}`;
    })
    .filter((point): point is string => Boolean(point));

  const polyline = points.length > 0 ? points.join(" ") : `${pad},${size.height / 2}`;

  const ariaLabel = t ? t.sparklineAriaLabel(series.label) : `${series.label} sparkline`;
  const ariaDescription = chartAriaDescription([series], t);

  return `<svg viewBox="0 0 ${size.width} ${size.height}" role="img" tabindex="0" aria-label="${escapeAttribute(
    ariaLabel,
  )}" xmlns="http://www.w3.org/2000/svg">
  <desc>${escapeAttribute(ariaDescription)}</desc>
  <polyline fill="none" stroke="${escapeAttribute(color)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${polyline}" />
</svg>`;
}

// ─── Bar Chart ─────────────────────────────────────────────────────

export function renderBarChart(
  series: ChartSeries,
  color: string,
  size: ChartSize = { width: 640, height: 180 },
  t?: ChartLabelsT,
): string {
  const values = numericPoints(series);
  const { max } = extent(values);
  const margin = { top: 24, right: 18, bottom: 36, left: 18 };
  const plotW = size.width - margin.left - margin.right;
  const plotH = size.height - margin.top - margin.bottom;
  const fallbackBarWidth = Math.max(
    6,
    Math.min(32, (plotW / Math.max(series.points.length, 1)) * 0.58),
  );
  const xTimeRange = timeExtent([series]);
  const chartLeft = margin.left + 16;
  const chartRight = size.width - margin.right - 16;
  const chartWidth = chartRight - chartLeft;

  const bars = series.points
    .map((point, index) => {
      if (point.value === null) {
        return "";
      }
      const barWidth = projectedBarWidth(
        point,
        xTimeRange,
        chartWidth,
        fallbackBarWidth,
      );
      const height = (point.value / max) * plotH;
      const xCenter = temporalXPosition(
        point,
        index,
        series.points.length,
        chartLeft,
        chartRight,
        xTimeRange,
      );
      const x = xCenter - barWidth / 2;
      const y = margin.top + plotH - height;
      const unitSuffix = formatUnitSuffix(series.unit, point.value);
      const title = `${point.label}: ${formatTooltipValue(point.value)}${unitSuffix}`;
      const valueLabel = barWidth >= 18
        ? `<text x="${xCenter}" y="${y - 5}" text-anchor="middle" font-size="12" fill="#596579">${Math.round(point.value)}</text>`
        : "";
      return `<g><title>${escapeAttribute(title)}</title><rect data-chart-bar="true" x="${x}" y="${y}" width="${barWidth}" height="${Math.max(
        height,
        1,
      )}" rx="${Math.min(4, barWidth / 2)}" fill="${escapeAttribute(color)}" opacity="0.85" />${valueLabel}</g>`;
    })
    .join("");

  // X-axis labels
  const axisY = margin.top + plotH + 16;
  const xLabels = xTimeRange
    ? renderTemporalAxisLabels(xTimeRange, 6, chartLeft, chartRight, axisY)
    : pickLabelIndices(series.points.length, 6)
        .map((index, position, indices) => {
          const point = series.points[index];
          if (!point) return "";
          const x = xPosition(index, series.points.length, chartLeft, chartRight);
          const anchor = position === 0 ? "start" : position === indices.length - 1 ? "end" : "middle";
          return `<text data-axis="x" x="${x}" y="${axisY}" text-anchor="${anchor}" font-size="12" fill="#596579">${escapeAttribute(shortenLabel(point.label))}</text>`;
        })
        .join("");

  const ariaLabel = t ? t.barChartAriaLabel(series.label) : `${series.label} bar chart`;
  const ariaDescription = chartAriaDescription([series], t);

  return `<svg viewBox="0 0 ${size.width} ${size.height}" role="img" tabindex="0" aria-label="${escapeAttribute(
    ariaLabel,
  )}" xmlns="http://www.w3.org/2000/svg" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <desc>${escapeAttribute(ariaDescription)}</desc>
  ${bars}
  ${xLabels}
</svg>`;
}

// ─── Multi-Series Line Chart ───────────────────────────────────────

export function renderMultiSeriesLineChart(
  seriesList: ChartSeries[],
  colors: string[],
  size: ChartSize = { width: 720, height: 220 },
  t?: ChartLabelsT,
): string {
  if (seriesList.length === 0) {
    const ariaLabel = t ? t.lineChartAriaLabel : "Trend chart";
    const ariaDescription = chartAriaDescription([], t);
    return `<svg viewBox="0 0 ${size.width} ${size.height}" role="img" tabindex="0" aria-label="${escapeAttribute(ariaLabel)}" xmlns="http://www.w3.org/2000/svg"><desc>${escapeAttribute(ariaDescription)}</desc></svg>`;
  }
  const values = seriesList.flatMap((series) => numericPoints(series));
  const { min, max } = extent(values);
  const xTimeRange = timeExtent(seriesList);

  const margin = { top: 16, right: 16, bottom: 36, left: 48 };
  const plotLeft = margin.left;
  const plotRight = size.width - margin.right;
  const plotTop = margin.top;
  const plotBottom = size.height - margin.bottom;

  // Y-axis grid lines & labels (5 lines)
  const ySteps = [0, 0.25, 0.5, 0.75, 1];
  const gridLines = ySteps
    .map((step) => {
      const yVal = max - step * (max - min);
      const y = plotTop + step * (plotBottom - plotTop);
      return `<line x1="${plotLeft}" y1="${y}" x2="${plotRight}" y2="${y}" stroke="#D7DEE7" stroke-width="1" stroke-dasharray="4,3" /><text x="${plotLeft - 6}" y="${y + 4}" text-anchor="end" font-size="12" fill="#596579">${escapeAttribute(formatAxisValue(yVal))}</text>`;
    })
    .join("");

  // X-axis labels follow the actual time domain, not point-array indices.
  const longestSeries = seriesList.reduce(
    (best, series) => (series.points.length > best.points.length ? series : best),
    seriesList[0],
  );
  const maxXLabels = Math.max(2, Math.min(7, Math.floor((plotRight - plotLeft) / 70)));
  const xLabels = xTimeRange
    ? renderTemporalAxisLabels(
        xTimeRange,
        maxXLabels,
        plotLeft,
        plotRight,
        plotBottom + 18,
      )
    : pickLabelIndices(longestSeries.points.length, maxXLabels)
        .map((index, position, indices) => {
          const point = longestSeries.points[index];
          if (!point) return "";
          const x = xPosition(index, longestSeries.points.length, plotLeft, plotRight);
          const anchor = position === 0 ? "start" : position === indices.length - 1 ? "end" : "middle";
          return `<text data-axis="x" x="${x}" y="${plotBottom + 18}" text-anchor="${anchor}" font-size="12" fill="#596579">${escapeAttribute(shortenLabel(point.label))}</text>`;
        })
        .join("");

  // Data paths + dots + hover titles
  const paths = seriesList
    .map((series, seriesIndex) => {
      const color = colors[seriesIndex % colors.length];
      const segments: string[] = [];
      let current = "";
      const dots: string[] = [];
      const visibleMarkers = visibleMarkerIndices(
        series,
        plotLeft,
        plotRight,
        xTimeRange,
      );
      let previousPoint: ChartPoint | null = null;

      series.points.forEach((point, pointIndex) => {
        if (point.value === null || !Number.isFinite(point.value)) {
          if (current) {
            segments.push(current);
            current = "";
          }
          previousPoint = null;
          return;
        }
        if (previousPoint && hasLargeTemporalGap(previousPoint, point) && current) {
          segments.push(current);
          current = "";
        }
        const x = temporalXPosition(
          point,
          pointIndex,
          series.points.length,
          plotLeft,
          plotRight,
          xTimeRange,
        );
        const y = yPosition(point.value, min, max, plotTop, plotBottom);
        current += `${current ? " L" : "M"} ${x} ${y}`;

        const unitSuffix = formatUnitSuffix(series.unit, point.value);
        const title = `${series.label} ${point.label}: ${formatTooltipValue(point.value)}${unitSuffix}`;
        dots.push(visibleMarkers.has(pointIndex)
          ? `<circle data-marker="visible" cx="${x}" cy="${y}" r="2.6" fill="${escapeAttribute(color)}" stroke="#fff" stroke-width="1.25"><title>${escapeAttribute(title)}</title></circle>`
          : `<circle data-marker="hit" cx="${x}" cy="${y}" r="4" fill="transparent" stroke="none"><title>${escapeAttribute(title)}</title></circle>`);
        previousPoint = point;
      });
      if (current) {
        segments.push(current);
      }

      const pathEls = segments
        .map(
          (segment) =>
            `<path d="${segment}" fill="none" stroke="${escapeAttribute(
              color,
            )}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />`,
        )
        .join("");

      return pathEls + dots.join("");
    })
    .join("");

  const seriesNames = seriesList.map((series) => series.label).join(", ");
  const ariaLabel = `${seriesNames}: ${t ? t.lineChartAriaLabel : "Trend chart"}`;
  const ariaDescription = chartAriaDescription(seriesList, t);

  return `<svg viewBox="0 0 ${size.width} ${size.height}" role="img" tabindex="0" aria-label="${escapeAttribute(ariaLabel)}" xmlns="http://www.w3.org/2000/svg" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <desc>${escapeAttribute(ariaDescription)}</desc>
  ${gridLines}
  ${xLabels}
  ${paths}
</svg>`;
}

// ─── PMC Chart (CTL + ATL lines + TSB area) ────────────────────────

/**
 * Robust upper bound for an axis that should clip long-tail outliers without
 * hiding meaningful peaks. Uses the 97.5th percentile plus a 15% headroom,
 * falling back to the raw max for small samples. Always returns a strictly
 * positive value so downstream `yPosition` math never divides by zero
 * (a zero-load or empty series would otherwise yield `NaN` coordinates).
 */
function clipAxisMax(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  if (sorted.length === 0) return 1;
  const max = sorted[sorted.length - 1];
  if (max <= 0) return 1;
  if (sorted.length < 8) return max * 1.1;
  const idx = Math.floor(sorted.length * 0.975);
  const p975 = sorted[idx];
  // If the true max is only mildly above p975, keep the true max to avoid
  // clipping a legitimate peak. Otherwise clip to p975 + headroom.
  const computed = max <= p975 * 1.25 ? max * 1.05 : p975 * 1.15;
  return computed > 0 ? computed : 1;
}

/**
 * Symmetric TSB axis bound using the 97.5th percentile of |TSB|.
 */
function clipSymmetricMax(values: number[]): number {
  const abs = values.map(Math.abs);
  return Math.max(1, clipAxisMax(abs));
}

/**
 * Performance-Management-Chart rendered as two stacked panels sharing one
 * x-axis:
 *
 *   • Top panel (~65% of the plot area): CTL (thick orange) + ATL (thin blue)
 *     on a single linear y-axis, 0-rooted so the relative magnitudes are
 *     immediately comparable.
 *   • Bottom panel (~30%): load-balance area with a zero baseline — positive
 *     means recent load is below the 42-day baseline, negative means above.
 *
 * Extreme ATL or TSB spikes are clipped to the 97.5th percentile so a single
 * outlier session can't flatten the rest of the curve.
 */
export function renderPmcChart(
  ctl: ChartSeries,
  atl: ChartSeries,
  tsb: ChartSeries,
  colors: { ctl: string; atl: string; tsbPositive: string; tsbNegative: string },
  size: ChartSize = { width: 720, height: 280 },
  t?: ChartLabelsT,
): string {
  const margin = { top: 18, right: 16, bottom: 30, left: 52 };
  const plotLeft = margin.left;
  const plotRight = size.width - margin.right;
  const plotTop = margin.top;
  const plotBottom = size.height - margin.bottom;

  const pointCount = Math.max(ctl.points.length, atl.points.length, tsb.points.length);
  const xTimeRange = timeExtent([ctl, atl, tsb]);
  const seriesNames = [ctl.label, atl.label, tsb.label].join(", ");
  const ariaLabel = `${seriesNames}: ${t ? t.lineChartAriaLabel : "Trend chart"}`;
  const ariaDescription = chartAriaDescription([ctl, atl, tsb], t);
  if (pointCount === 0) {
    return `<svg viewBox="0 0 ${size.width} ${size.height}" role="img" tabindex="0" aria-label="${escapeAttribute(ariaLabel)}" xmlns="http://www.w3.org/2000/svg"><desc>${escapeAttribute(ariaDescription)}</desc></svg>`;
  }

  // Split the plot area vertically: top panel for CTL/ATL, bottom for TSB.
  const totalPlotHeight = plotBottom - plotTop;
  const gapBetweenPanels = 14;
  const topPanelRatio = 0.66;
  const topPlotTop = plotTop;
  const topPlotBottom = plotTop + totalPlotHeight * topPanelRatio - gapBetweenPanels / 2;
  const bottomPlotTop = plotTop + totalPlotHeight * topPanelRatio + gapBetweenPanels / 2;
  const bottomPlotBottom = plotBottom;

  // ── Top panel: CTL/ATL ────────────────────────────────────────────
  const ctlAtlValues = [...numericPoints(ctl), ...numericPoints(atl)];
  const topMin = 0;
  const topMax = clipAxisMax(ctlAtlValues);

  const topGridSteps = [0, 0.5, 1];
  const topGrid = topGridSteps
    .map((step) => {
      const val = topMax - step * (topMax - topMin);
      const y = topPlotTop + step * (topPlotBottom - topPlotTop);
      return (
        `<line x1="${plotLeft}" y1="${y}" x2="${plotRight}" y2="${y}" stroke="#D7DEE7" stroke-width="1" stroke-dasharray="4,3" />` +
        `<text x="${plotLeft - 6}" y="${y + 4}" text-anchor="end" font-size="12" fill="#596579">${escapeAttribute(formatAxisValue(val))}</text>`
      );
    })
    .join("");

  // ── Bottom panel: TSB area ────────────────────────────────────────
  const tsbValues = numericPoints(tsb);
  const tsbAbsMax = clipSymmetricMax(tsbValues);
  const tsbAxisMin = -tsbAbsMax;
  const tsbAxisMax = tsbAbsMax;
  const tsbZeroY =
    bottomPlotTop + ((tsbAxisMax - 0) / (tsbAxisMax - tsbAxisMin)) * (bottomPlotBottom - bottomPlotTop);

  // Axis labels for the bottom panel (top / zero / bottom).
  const tsbGridSteps = [0, 0.5, 1];
  const tsbGrid = tsbGridSteps
    .map((step) => {
      const val = tsbAxisMax - step * (tsbAxisMax - tsbAxisMin);
      const y = bottomPlotTop + step * (bottomPlotBottom - bottomPlotTop);
      return (
        `<line x1="${plotLeft}" y1="${y}" x2="${plotRight}" y2="${y}" stroke="#D7DEE7" stroke-width="1" stroke-dasharray="4,3" />` +
        `<text x="${plotLeft - 6}" y="${y + 4}" text-anchor="end" font-size="12" fill="#596579">${escapeAttribute((val > 0 ? "+" : "") + formatAxisValue(val))}</text>`
      );
    })
    .join("");

  // Vertical separator line between the two panels.
  const separator = `<line x1="${plotLeft}" y1="${topPlotBottom + gapBetweenPanels / 2}" x2="${plotRight}" y2="${topPlotBottom + gapBetweenPanels / 2}" stroke="#E5E7EB" stroke-width="1" />`;

  // ── X-axis labels (shared) ────────────────────────────────────────
  const longest =
    ctl.points.length >= atl.points.length && ctl.points.length >= tsb.points.length
      ? ctl
      : atl.points.length >= tsb.points.length
        ? atl
        : tsb;
  const maxXLabels = Math.max(2, Math.min(8, Math.floor((plotRight - plotLeft) / 80)));
  const xLabels = xTimeRange
    ? renderTemporalAxisLabels(
        xTimeRange,
        maxXLabels,
        plotLeft,
        plotRight,
        plotBottom + 18,
      )
    : pickLabelIndices(longest.points.length, maxXLabels)
        .map((index, position, indices) => {
          const point = longest.points[index];
          if (!point) return "";
          const x = xPosition(index, longest.points.length, plotLeft, plotRight);
          const anchor = position === 0 ? "start" : position === indices.length - 1 ? "end" : "middle";
          return `<text data-axis="x" x="${x}" y="${plotBottom + 18}" text-anchor="${anchor}" font-size="12" fill="#596579">${escapeAttribute(shortenLabel(point.label))}</text>`;
        })
        .join("");

  // ── Top-panel line helpers ────────────────────────────────────────
  const drawClippedLine = (series: ChartSeries, color: string, strokeWidth: number): string => {
    const segments: string[] = [];
    let current = "";
    const dots: string[] = [];
    const visibleMarkers = visibleMarkerIndices(series, plotLeft, plotRight, xTimeRange);
    let previousPoint: ChartPoint | null = null;
    series.points.forEach((point, index) => {
      if (point.value === null || !Number.isFinite(point.value)) {
        if (current) {
          segments.push(current);
          current = "";
        }
        previousPoint = null;
        return;
      }
      if (previousPoint && hasLargeTemporalGap(previousPoint, point) && current) {
        segments.push(current);
        current = "";
      }
      const clipped = Math.min(point.value, topMax);
      const x = temporalXPosition(
        point,
        index,
        series.points.length,
        plotLeft,
        plotRight,
        xTimeRange,
      );
      const y = yPosition(clipped, topMin, topMax, topPlotTop, topPlotBottom);
      current += `${current ? " L" : "M"} ${x} ${y}`;
      const unit = formatUnitSuffix(series.unit, point.value);
      // Show the *real* (un-clipped) value in the tooltip.
      const title = `${series.label} ${point.label}: ${formatTooltipValue(point.value)}${unit}`;
      dots.push(visibleMarkers.has(index)
        ? `<circle data-marker="visible" cx="${x}" cy="${y}" r="2.5" fill="${escapeAttribute(color)}" stroke="#fff" stroke-width="1"><title>${escapeAttribute(title)}</title></circle>`
        : `<circle data-marker="hit" cx="${x}" cy="${y}" r="4" fill="transparent" stroke="none"><title>${escapeAttribute(title)}</title></circle>`);
      previousPoint = point;
    });
    if (current) segments.push(current);
    const paths = segments
      .map(
        (d) =>
          `<path d="${d}" fill="none" stroke="${escapeAttribute(color)}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`,
      )
      .join("");
    return paths + dots.join("");
  };
  const ctlLayer = drawClippedLine(ctl, colors.ctl, 2.8);
  const atlLayer = drawClippedLine(atl, colors.atl, 1.6);

  // ── Bottom-panel TSB area ─────────────────────────────────────────
  const tsbAreaPaths: string[] = [];
  let segment: Array<{ x: number; y: number; value: number }> = [];
  let segmentSign: 1 | -1 | 0 = 0;
  let previousTsbPoint: ChartPoint | null = null;
  const flushSegment = () => {
    if (segment.length === 0) return;
    const color = segmentSign >= 0 ? colors.tsbPositive : colors.tsbNegative;
    const startX = segment[0].x;
    const endX = segment[segment.length - 1].x;
    const curve = segment.map((p) => `${p.x} ${p.y}`).join(" L ");
    const d = `M ${startX} ${tsbZeroY} L ${curve} L ${endX} ${tsbZeroY} Z`;
    tsbAreaPaths.push(
      `<path d="${d}" fill="${escapeAttribute(color)}" fill-opacity="0.35" stroke="none" />`,
    );
    segment = [];
    segmentSign = 0;
  };
  tsb.points.forEach((point, index) => {
    if (point.value === null || !Number.isFinite(point.value)) {
      flushSegment();
      previousTsbPoint = null;
      return;
    }
    if (previousTsbPoint && hasLargeTemporalGap(previousTsbPoint, point)) {
      flushSegment();
    }
    const clipped = Math.max(Math.min(point.value, tsbAxisMax), tsbAxisMin);
    const x = temporalXPosition(
      point,
      index,
      tsb.points.length,
      plotLeft,
      plotRight,
      xTimeRange,
    );
    const y = yPosition(clipped, tsbAxisMin, tsbAxisMax, bottomPlotTop, bottomPlotBottom);
    const sign: 1 | -1 = point.value >= 0 ? 1 : -1;
    if (segment.length > 0 && sign !== segmentSign) {
      const prev = segment[segment.length - 1];
      const denom = point.value - prev.value;
      const t0 = denom === 0 ? 0 : Math.max(0, Math.min(1, (0 - prev.value) / denom));
      const crossX = prev.x + (x - prev.x) * t0;
      segment.push({ x: crossX, y: tsbZeroY, value: 0 });
      flushSegment();
      segment.push({ x: crossX, y: tsbZeroY, value: 0 });
    }
    segment.push({ x, y, value: point.value });
    segmentSign = sign;
    previousTsbPoint = point;
  });
  flushSegment();

  // TSB outline + invisible tooltip targets.
  const tsbStrokeSegments: string[] = [];
  let cur = "";
  const tsbDots: string[] = [];
  let previousTsbStrokePoint: ChartPoint | null = null;
  tsb.points.forEach((point, index) => {
    if (point.value === null || !Number.isFinite(point.value)) {
      if (cur) {
        tsbStrokeSegments.push(cur);
        cur = "";
      }
      previousTsbStrokePoint = null;
      return;
    }
    if (
      previousTsbStrokePoint &&
      hasLargeTemporalGap(previousTsbStrokePoint, point) &&
      cur
    ) {
      tsbStrokeSegments.push(cur);
      cur = "";
    }
    const clipped = Math.max(Math.min(point.value, tsbAxisMax), tsbAxisMin);
    const x = temporalXPosition(
      point,
      index,
      tsb.points.length,
      plotLeft,
      plotRight,
      xTimeRange,
    );
    const y = yPosition(clipped, tsbAxisMin, tsbAxisMax, bottomPlotTop, bottomPlotBottom);
    cur += `${cur ? " L" : "M"} ${x} ${y}`;
    const unit = formatUnitSuffix(tsb.unit, point.value);
    const title = `${tsb.label} ${point.label}: ${formatTooltipValue(point.value)}${unit}`;
    tsbDots.push(
      `<circle data-marker="hit" cx="${x}" cy="${y}" r="3" fill="transparent" stroke="none"><title>${escapeAttribute(title)}</title></circle>`,
    );
    previousTsbStrokePoint = point;
  });
  if (cur) tsbStrokeSegments.push(cur);
  const tsbStroke = tsbStrokeSegments
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="#6B7280" stroke-opacity="0.45" stroke-width="1" stroke-linejoin="round" />`,
    )
    .join("");

  return `<svg viewBox="0 0 ${size.width} ${size.height}" role="img" tabindex="0" aria-label="${escapeAttribute(ariaLabel)}" xmlns="http://www.w3.org/2000/svg" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <desc>${escapeAttribute(ariaDescription)}</desc>
  ${topGrid}
  ${tsbGrid}
  ${separator}
  ${xLabels}
  ${atlLayer}
  ${ctlLayer}
  ${tsbAreaPaths.join("")}
  ${tsbStroke}
  ${tsbDots.join("")}
</svg>`;
}

// ─── Dual-Axis Chart: bar series + overlay line ────────────────────

/**
 * Renders a bar series against a left y-axis plus a line series against an
 * independent right y-axis. Used for sport trend charts where "frequency"
 * (count of workouts) and "avg duration per workout" share an x-axis but
 * different magnitudes. Both series are drawn in the same color family so
 * they read as two angles on the same sport.
 */
export function renderDualAxisChart(
  bars: ChartSeries,
  line: ChartSeries,
  colors: { bar: string; line: string },
  size: ChartSize = { width: 720, height: 240 },
  t?: ChartLabelsT,
): string {
  const margin = { top: 20, right: 52, bottom: 36, left: 52 };
  const plotLeft = margin.left;
  const plotRight = size.width - margin.right;
  const plotTop = margin.top;
  const plotBottom = size.height - margin.bottom;

  const barValues = numericPoints(bars);
  const lineValues = numericPoints(line);
  const barMax = barValues.length > 0 ? Math.max(...barValues) : 1;
  const lineRange = extent(lineValues);

  // Ensure bar axis has a sensible minimum of 0.
  const barAxisTop = barMax > 0 ? barMax * 1.15 : 1;
  // Line axis always has ≥10% headroom.
  const lineAxisMin = lineRange.min;
  const lineAxisMax = lineRange.max;

  // Left axis grid + labels (bar scale, 5 ticks).
  const ySteps = [0, 0.25, 0.5, 0.75, 1];
  const gridAndLeftLabels = ySteps
    .map((step) => {
      const barVal = barAxisTop * (1 - step);
      const lineVal = lineAxisMax - step * (lineAxisMax - lineAxisMin);
      const y = plotTop + step * (plotBottom - plotTop);
      return `<line x1="${plotLeft}" y1="${y}" x2="${plotRight}" y2="${y}" stroke="#D7DEE7" stroke-width="1" stroke-dasharray="4,3" />`
        + `<text x="${plotLeft - 6}" y="${y + 4}" text-anchor="end" font-size="12" fill="${escapeAttribute(colors.bar)}">${escapeAttribute(formatAxisValue(barVal))}</text>`
        + `<text x="${plotRight + 6}" y="${y + 4}" text-anchor="start" font-size="12" fill="${escapeAttribute(colors.line)}">${escapeAttribute(formatAxisValue(lineVal))}</text>`;
    })
    .join("");

  const pointCount = Math.max(bars.points.length, line.points.length);
  const seriesNames = [bars.label, line.label].join(", ");
  const ariaLabel = `${seriesNames}: ${t ? t.lineChartAriaLabel : "Trend chart"}`;
  const ariaDescription = chartAriaDescription([bars, line], t);
  if (pointCount === 0) {
    return `<svg viewBox="0 0 ${size.width} ${size.height}" role="img" tabindex="0" aria-label="${escapeAttribute(ariaLabel)}" xmlns="http://www.w3.org/2000/svg"><desc>${escapeAttribute(ariaDescription)}</desc></svg>`;
  }

  // Bar width & inner padding: keep first/last bars from overflowing the Y-axis label columns.
  const fallbackBarWidth = Math.max(
    6,
    Math.min(32, ((plotRight - plotLeft) / pointCount) * 0.55),
  );
  const barXPadding = Math.min(16, fallbackBarWidth / 2) + 4;
  const chartLeft = plotLeft + barXPadding;
  const chartRight = plotRight - barXPadding;
  const chartWidth = chartRight - chartLeft;
  const xTimeRange = timeExtent([bars, line]);

  // X-axis labels use the shared time domain, so missing months stay aligned.
  const longest = bars.points.length >= line.points.length ? bars : line;
  const maxXLabels = Math.min(7, Math.max(2, Math.floor((chartRight - chartLeft) / 70)));
  const xLabels = xTimeRange
    ? renderTemporalAxisLabels(
        xTimeRange,
        maxXLabels,
        chartLeft,
        chartRight,
        plotBottom + 18,
      )
    : pickLabelIndices(longest.points.length, maxXLabels)
        .map((index, position, indices) => {
          const point = longest.points[index];
          if (!point) return "";
          const x = xPosition(index, longest.points.length, chartLeft, chartRight);
          const anchor = position === 0 ? "start" : position === indices.length - 1 ? "end" : "middle";
          return `<text data-axis="x" x="${x}" y="${plotBottom + 18}" text-anchor="${anchor}" font-size="12" fill="#596579">${escapeAttribute(shortenLabel(point.label))}</text>`;
        })
        .join("");

  // Bars: scale to bar-axis (zero baseline).
  const barElements = bars.points
    .map((point, index) => {
      if (point.value === null) {
        return "";
      }
      const barWidth = projectedBarWidth(
        point,
        xTimeRange,
        chartWidth,
        fallbackBarWidth,
      );
      const xCenter = temporalXPosition(
        point,
        index,
        bars.points.length,
        chartLeft,
        chartRight,
        xTimeRange,
      );
      const x = xCenter - barWidth / 2;
      const heightRatio = barAxisTop > 0 ? point.value / barAxisTop : 0;
      const height = Math.max(heightRatio * (plotBottom - plotTop), 0.5);
      const y = plotBottom - height;
      const unitSuffix = formatUnitSuffix(bars.unit, point.value);
      const title = `${bars.label} ${point.label}: ${formatTooltipValue(point.value)}${unitSuffix}`;
      return `<g><title>${escapeAttribute(title)}</title><rect data-chart-bar="true" x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="${Math.min(3, barWidth / 2)}" fill="${escapeAttribute(colors.bar)}" opacity="0.75" /></g>`;
    })
    .join("");

  // Line: scale to line-axis.
  const segments: string[] = [];
  let current = "";
  const dots: string[] = [];
  const visibleMarkers = visibleMarkerIndices(line, chartLeft, chartRight, xTimeRange);
  let previousPoint: ChartPoint | null = null;
  line.points.forEach((point, index) => {
    if (point.value === null || !Number.isFinite(point.value)) {
      if (current) {
        segments.push(current);
        current = "";
      }
      previousPoint = null;
      return;
    }
    if (previousPoint && hasLargeTemporalGap(previousPoint, point) && current) {
      segments.push(current);
      current = "";
    }
    const x = temporalXPosition(
      point,
      index,
      line.points.length,
      chartLeft,
      chartRight,
      xTimeRange,
    );
    const y = yPosition(point.value, lineAxisMin, lineAxisMax, plotTop, plotBottom);
    current += `${current ? " L" : "M"} ${x} ${y}`;
    const unitSuffix = formatUnitSuffix(line.unit, point.value);
    const title = `${line.label} ${point.label}: ${formatTooltipValue(point.value)}${unitSuffix}`;
    dots.push(visibleMarkers.has(index)
      ? `<circle data-marker="visible" cx="${x}" cy="${y}" r="2.6" fill="${escapeAttribute(colors.line)}" stroke="#fff" stroke-width="1.25"><title>${escapeAttribute(title)}</title></circle>`
      : `<circle data-marker="hit" cx="${x}" cy="${y}" r="4" fill="transparent" stroke="none"><title>${escapeAttribute(title)}</title></circle>`);
    previousPoint = point;
  });
  if (current) segments.push(current);
  const linePath = segments
    .map(
      (segment) =>
        `<path d="${segment}" fill="none" stroke="${escapeAttribute(colors.line)}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" />`,
    )
    .join("");

  return `<svg viewBox="0 0 ${size.width} ${size.height}" role="img" tabindex="0" aria-label="${escapeAttribute(ariaLabel)}" xmlns="http://www.w3.org/2000/svg" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <desc>${escapeAttribute(ariaDescription)}</desc>
  ${gridAndLeftLabels}
  ${xLabels}
  ${barElements}
  ${linePath}${dots.join("")}
</svg>`;
}

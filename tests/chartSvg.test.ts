import { describe, expect, it } from "vitest";

import {
  renderBarChart,
  renderMultiSeriesLineChart,
  renderPmcChart,
} from "../src/render/chartSvg.js";
import { enTranslations } from "../src/i18n/en/index.js";
import type { ChartSeries } from "../src/types.js";

function zeroSeries(id: string, label: string, unit: string): ChartSeries {
  // 52 weekly points, all at 0 — the legitimate shape for an export with no
  // workouts in window.
  return {
    id,
    label,
    unit,
    visual: "line",
    points: Array.from({ length: 52 }, (_, i) => ({
      start: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
      end: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
      granularity: "week" as const,
      label: `2026-W${String(i + 1).padStart(2, "0")}`,
      value: 0,
      sampleCount: 0,
    })),
  };
}

function mixedGranularitySeries(visual: "line" | "bar" = "line"): ChartSeries {
  const points: ChartSeries["points"] = [
    ["2025-03-01", "2025-03-31", "month"],
    ["2025-06-01", "2025-06-30", "month"],
    ["2025-09-01", "2025-09-30", "month"],
    ["2025-12-01", "2025-12-31", "month"],
    ["2026-01-26", "2026-02-01", "week"],
    ["2026-03-30", "2026-04-05", "week"],
    ["2026-06-08", "2026-06-14", "week"],
    ...Array.from({ length: 30 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 6, index + 1)).toISOString().slice(0, 10);
      return [date, date, "day"] as const;
    }),
  ].map(([start, end, granularity], index) => ({
    start: `${start}T00:00:00.000Z`,
    end: `${end}T23:59:59.999Z`,
    granularity,
    label: granularity === "month" ? start.slice(0, 7) : start,
    value: (index % 7) + 1,
    sampleCount: 1,
  }));

  return {
    id: "mixed",
    label: "Mixed history",
    unit: "unit",
    visual,
    points,
  };
}

describe("renderPmcChart", () => {
  it("emits a finite SVG when CTL/ATL/TSB are all zero", () => {
    // Regression: clipAxisMax used to return 0 for a zero-load history,
    // which propagated `NaN` through yPosition and produced an invalid path.
    const ctl = zeroSeries("training_load_ctl", "Fitness (CTL)", "MET·min");
    const atl = zeroSeries("training_load_atl", "Fatigue (ATL)", "MET·min");
    const tsb = { ...zeroSeries("training_load_tsb", "Form (TSB)", "MET·min"), visual: "area" as const };

    const svg = renderPmcChart(ctl, atl, tsb, {
      ctl: "#F97316",
      atl: "#0EA5E9",
      tsbPositive: "#22C55E",
      tsbNegative: "#EF4444",
    });

    expect(svg).toContain("<svg");
    expect(svg).not.toContain("NaN");
    // Axis labels should render numeric values, never "NaN".
    expect(svg).toMatch(/<text[^>]*>[-+\d.]+<\/text>/);
  });

  it("emits an empty but valid SVG when all series are empty", () => {
    const empty: ChartSeries = {
      id: "x",
      label: "x",
      unit: "",
      visual: "line",
      points: [],
    };
    const svg = renderPmcChart(empty, empty, { ...empty, visual: "area" }, {
      ctl: "#F97316",
      atl: "#0EA5E9",
      tsbPositive: "#22C55E",
      tsbNegative: "#EF4444",
    });
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("NaN");
  });
});

describe("time-based chart rendering", () => {
  it("exposes one focusable chart summary without adding per-point tab stops", () => {
    const series: ChartSeries = {
      id: "sessions",
      label: "Sessions",
      unit: "sessions",
      visual: "bar",
      points: [
        {
          start: "2026-01-01",
          end: "2026-01-01",
          granularity: "day",
          label: "2026-01-01",
          value: 1,
          sampleCount: 1,
        },
        {
          start: "2026-01-02",
          end: "2026-01-02",
          granularity: "day",
          label: "2026-01-02",
          value: 2,
          sampleCount: 1,
        },
      ],
    };

    const svg = renderBarChart(
      series,
      "#4338CA",
      { width: 320, height: 140 },
      enTranslations.render,
    );

    expect(svg.match(/tabindex="0"/g)).toHaveLength(1);
    expect(svg).toContain("<desc>Sessions: 2 data points;");
    expect(svg).toContain("first 2026-01-01, 1 session;");
    expect(svg).toContain("latest 2026-01-02, 2 sessions;");
    expect(svg).toContain("range 1 session to 2 sessions.");
    expect(svg).toContain("<title>2026-01-01: 1 session</title>");
    expect(svg).not.toContain("1 sessions");
    expect(svg).not.toMatch(/<(?:rect|circle)[^>]*tabindex=/);
  });

  it("spaces axis labels by time and thins dense visible markers", () => {
    const series = mixedGranularitySeries();
    const svg = renderMultiSeriesLineChart([series], ["#4F46E5"], {
      width: 640,
      height: 190,
    });

    const labels = [...svg.matchAll(/<text data-axis="x" x="([^"]+)"[^>]*>([^<]+)<\/text>/g)]
      .map((match) => ({ x: Number(match[1]), label: match[2] }));
    expect(labels).toHaveLength(7);
    expect(labels.every((entry) => /^\d{4}-\d{2}$/.test(entry.label))).toBe(true);
    for (let index = 1; index < labels.length; index += 1) {
      expect(labels[index].x - labels[index - 1].x).toBeGreaterThan(80);
    }

    const visibleMarkers = svg.match(/data-marker="visible"/g) ?? [];
    const hitTargets = svg.match(/data-marker="hit"/g) ?? [];
    expect(visibleMarkers.length).toBeLessThan(series.points.length);
    expect(visibleMarkers.length + hitTargets.length).toBe(series.points.length);
  });

  it("uses time-proportional non-overlapping bars without dense value labels", () => {
    const series = mixedGranularitySeries("bar");
    const svg = renderBarChart(series, "#4F46E5", { width: 640, height: 170 });
    const bars = [...svg.matchAll(/<rect data-chart-bar="true" x="([^"]+)"[^>]*width="([^"]+)"/g)]
      .map((match) => ({ x: Number(match[1]), width: Number(match[2]) }));

    expect(bars).toHaveLength(series.points.length);
    expect(Math.min(...bars.map((bar) => bar.width))).toBeLessThan(2);
    for (let index = 1; index < bars.length; index += 1) {
      expect(bars[index - 1].x + bars[index - 1].width).toBeLessThanOrEqual(
        bars[index].x + 0.001,
      );
    }
  });

  it("breaks the line across long periods with no data", () => {
    const series = mixedGranularitySeries();
    series.points = [series.points[0], series.points.at(-1)!];
    const svg = renderMultiSeriesLineChart([series], ["#4F46E5"]);

    expect(svg.match(/<path d="/g)).toHaveLength(2);
  });
});

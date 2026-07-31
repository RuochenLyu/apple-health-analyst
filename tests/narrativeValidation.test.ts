import { describe, expect, it } from "vitest";

import { validateNarrativeReport } from "../src/narrative/validateNarrativeReport.js";
import { validateTrainingNarrativeReport } from "../src/narrative/validateTrainingNarrativeReport.js";

function healthNarrative() {
  return {
    schema_version: "3.0.0",
    health_assessment: "Assessment",
    cross_metric_insights: ["Insight"],
    behavioral_patterns: ["Pattern"],
    overview: "Overview",
    key_findings: ["Finding"],
    strengths: ["Strength"],
    watchouts: ["Watchout"],
    actions_next_2_weeks: ["Action"],
    when_to_seek_care: ["Seek care"],
    questions_for_doctor: ["Question"],
    data_limitations: ["Limitation"],
    chart_callouts: [
      { chart_id: "sleep", title: "Sleep", summary: "Sleep summary" },
    ],
    disclaimer: "Disclaimer",
  };
}

function trainingNarrative() {
  return {
    schema_version: "2.0.0",
    training_assessment: "Assessment",
    overall_findings: ["Finding"],
    sport_sections: [
      {
        sport_id: "running",
        title: "Running",
        assessment: "Assessment",
        key_signals: ["Signal"],
        recommendations: ["Recommendation"],
      },
    ],
    watchouts: ["Watchout"],
    actions_next_2_weeks: ["Action"],
    questions_for_doctor: [],
    data_limitations: ["Limitation"],
    chart_callouts: [
      { chart_id: "training_load", title: "Load", summary: "Load summary" },
    ],
    disclaimer: "Disclaimer",
  };
}

describe("narrative contract validation", () => {
  it("rejects empty required health arrays", () => {
    const value = healthNarrative();
    value.key_findings = [];

    expect(() => validateNarrativeReport(value, ["sleep"])).toThrow(
      /key_findings must contain at least one item/,
    );
  });

  it("requires every health chart exactly once", () => {
    const value = healthNarrative();

    expect(() => validateNarrativeReport(value, ["sleep", "activity"])).toThrow(
      /missing required IDs: activity/,
    );

    value.chart_callouts.push(value.chart_callouts[0]);
    expect(() => validateNarrativeReport(value, ["sleep"])).toThrow(
      /duplicate IDs: sleep/,
    );
  });

  it("allows health narratives to omit unsupported patterns and doctor questions", () => {
    const value = healthNarrative();
    value.behavioral_patterns = [];
    value.strengths = [];
    value.watchouts = [];
    value.questions_for_doctor = [];

    expect(validateNarrativeReport(value, ["sleep"]).questions_for_doctor).toEqual([]);
  });

  it("requires every training sport and chart exactly once", () => {
    const value = trainingNarrative();

    expect(() =>
      validateTrainingNarrativeReport(
        value,
        ["training_load", "training_recovery"],
        ["running"],
      ),
    ).toThrow(/missing required IDs: training_recovery/);

    expect(() =>
      validateTrainingNarrativeReport(
        value,
        ["training_load"],
        ["running", "cycling"],
      ),
    ).toThrow(/missing required IDs: cycling/);
  });

  it("allows no doctor question when the training data has no medical signal", () => {
    expect(
      validateTrainingNarrativeReport(
        trainingNarrative(),
        ["training_load"],
        ["running"],
      ).questions_for_doctor,
    ).toEqual([]);
  });
});

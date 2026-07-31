import { describe, expect, it } from "vitest";

import { findMainXml } from "../src/io/findMainXml.js";
import { readZip } from "../src/io/readZip.js";
import { parseHealthExport } from "../src/io/streamHealthXml.js";
import { buildTimeWindow } from "../src/normalize/buildTimeWindow.js";
import { selectPrimarySources } from "../src/normalize/selectPrimarySources.js";

function fixturePath(name: string): string {
  return new URL(`../fixtures/${name}/export.zip`, import.meta.url).pathname;
}

describe("primary source selection", () => {
  it("selects staged sleep, wearable recovery, and the most stable body composition source", async () => {
    const zipPath = fixturePath("multi-source-export");
    const zip = await readZip(zipPath);
    const mainXml = await findMainXml(zip.files);
    const parsed = await parseHealthExport(zipPath, zip.files, mainXml);
    const window = buildTimeWindow(undefined, undefined, parsed.exportDate ?? new Date());
    const selected = selectPrimarySources(parsed, window);

    expect(selected.sleep?.displayName).toBe("Withings");
    expect(selected.sleep?.staged).toBe(true);
    expect(selected.recovery.restingHeartRate?.canonicalName).toBe(selected.recovery.hrv?.canonicalName);
    expect(selected.recovery.restingHeartRate?.displayName).toBe("Riley’s Watch");
    expect(
      new Set(
        Object.values(selected.recovery).map((source) => source?.displayName),
      ),
    ).toEqual(new Set(["Riley’s Watch"]));
    expect(selected.bodyComposition.bodyMass?.displayName).toBe("Withings Body Scale");
    expect(selected.bodyComposition.bodyFatPercentage?.displayName).toBe("Withings Body Scale");
  });
});

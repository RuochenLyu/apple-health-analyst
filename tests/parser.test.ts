import { Readable } from "node:stream";

import { describe, expect, it } from "vitest";

import { findMainXml } from "../src/io/findMainXml.js";
import { readZip } from "../src/io/readZip.js";
import { parseHealthExport } from "../src/io/streamHealthXml.js";

function fixturePath(name: string): string {
  return new URL(`../fixtures/${name}/export.zip`, import.meta.url).pathname;
}

function mockXmlEntry(path: string, xml: string) {
  return {
    path,
    type: "File" as const,
    stream: () => Readable.from([xml]),
  };
}

describe("parser", () => {
  it("selects HealthData XML with an English filename", async () => {
    const mainXml = await findMainXml([
      mockXmlEntry(
        "apple_health_export/export.xml",
        '<?xml version="1.0" encoding="UTF-8"?><HealthData locale="en_US"></HealthData>',
      ),
    ]);

    expect(mainXml.path).toBe("apple_health_export/export.xml");
  });

  it("selects HealthData XML with a localized filename", async () => {
    const mainXml = await findMainXml([
      mockXmlEntry(
        "apple_health_export/导出.xml",
        '<?xml version="1.0" encoding="UTF-8"?><HealthData locale="zh_CN"></HealthData>',
      ),
      mockXmlEntry(
        "apple_health_export/export_cda.xml",
        '<?xml version="1.0" encoding="UTF-8"?><ClinicalDocument xmlns="urn:hl7-org:v3"></ClinicalDocument>',
      ),
    ]);

    expect(mainXml.path).toBe("apple_health_export/导出.xml");
  });

  it("skips malformed auxiliary XML and still selects HealthData", async () => {
    const mainXml = await findMainXml([
      mockXmlEntry("apple_health_export/broken.xml", "<broken"),
      mockXmlEntry(
        "apple_health_export/导出.xml",
        '<?xml version="1.0" encoding="UTF-8"?><HealthData locale="zh_CN"></HealthData>',
      ),
    ]);

    expect(mainXml.path).toBe("apple_health_export/导出.xml");
  });

  it("prefers HealthData XML when the ZIP also contains ClinicalDocument XML", async () => {
    const zip = await readZip(fixturePath("multi-source-export"));
    const mainXml = await findMainXml(zip.files);

    expect(mainXml.path).toContain(".xml");
    expect(mainXml.path).not.toMatch(/export_cda\.xml$/);
  });

  it("finds the main XML even when the filename is mojibake", async () => {
    const zip = await readZip(fixturePath("minimal-export"));
    const mainXml = await findMainXml(zip.files);

    expect(mainXml.path).toContain(".xml");
    expect(mainXml.path).not.toMatch(/export_cda\.xml$/);
    expect(mainXml.path).toContain("σ");
  });

  it("throws a helpful error when the ZIP only contains ClinicalDocument XML", async () => {
    await expect(
      findMainXml([
        mockXmlEntry(
          "apple_health_export/export_cda.xml",
          '<?xml version="1.0" encoding="UTF-8"?><ClinicalDocument xmlns="urn:hl7-org:v3"></ClinicalDocument>',
        ),
      ]),
    ).rejects.toThrow(/HealthData|ClinicalDocument|导出\.xml/);
  });

  it("parses the minimal export fixture", async () => {
    const zipPath = fixturePath("minimal-export");
    const zip = await readZip(zipPath);
    const mainXml = await findMainXml(zip.files);
    const parsed = await parseHealthExport(zipPath, zip.files, mainXml);

    expect(parsed.mainXmlEntry).toContain("σ");
    expect(parsed.recordCount).toBe(1);
    expect(parsed.records.bodyMass).toHaveLength(1);
    expect(parsed.locale).toBe("en_US");
  });
});

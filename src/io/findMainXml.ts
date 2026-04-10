import { StringDecoder } from "node:string_decoder";
import { SaxesParser } from "saxes";

interface ZipEntryLike {
  path: string;
  type?: string;
  stream: () => NodeJS.ReadableStream;
}

interface XmlRootInfo {
  entry: ZipEntryLike;
  rootName: string | null;
  parseError: string | null;
}

const ROOT_FOUND = Symbol("ROOT_FOUND");

function isXmlEntry(entry: ZipEntryLike): boolean {
  return entry.type !== "Directory" && entry.path.toLowerCase().endsWith(".xml");
}

function localName(name: string): string {
  const separator = name.indexOf(":");
  return separator === -1 ? name : name.slice(separator + 1);
}

async function readXmlRootName(entry: ZipEntryLike): Promise<string | null> {
  const decoder = new StringDecoder("utf8");
  const parser = new SaxesParser({ xmlns: false });
  const stream = entry.stream();
  let rootName: string | null = null;

  parser.on("opentag", (tag) => {
    rootName = localName(tag.name);
    throw ROOT_FOUND;
  });

  try {
    for await (const chunk of stream) {
      if (Buffer.isBuffer(chunk)) {
        const text = decoder.write(chunk);
        if (text) {
          parser.write(text);
        }
        continue;
      }

      parser.write(String(chunk));
    }
    const tail = decoder.end();
    if (tail) {
      parser.write(tail);
    }
    parser.close();
  } catch (error) {
    if (error !== ROOT_FOUND) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`无法解析 ZIP 中的 XML 文件根节点：${entry.path}。${reason}`);
    }
  } finally {
    if ("destroy" in stream && typeof stream.destroy === "function") {
      stream.destroy();
    }
  }

  return rootName;
}

async function inspectXmlEntries(entries: ZipEntryLike[]): Promise<XmlRootInfo[]> {
  const inspected: XmlRootInfo[] = [];

  for (const entry of entries) {
    if (!isXmlEntry(entry)) {
      continue;
    }
    inspected.push({
      entry,
      rootName: null,
      parseError: null,
    });
    try {
      inspected[inspected.length - 1].rootName = await readXmlRootName(entry);
    } catch (error) {
      inspected[inspected.length - 1].parseError =
        error instanceof Error ? error.message : String(error);
    }
  }

  return inspected;
}

export async function findMainXml(entries: ZipEntryLike[]): Promise<ZipEntryLike> {
  const inspected = await inspectXmlEntries(entries);
  const mainXml = inspected.find((candidate) => candidate.rootName === "HealthData");

  if (mainXml) {
    return mainXml.entry;
  }

  const detectedRoots = [...new Set(inspected.map((candidate) => candidate.rootName).filter(Boolean))];
  const parseFailures = inspected.filter((candidate) => candidate.parseError);
  const details = [
    "未找到根节点为 `HealthData` 的主 XML。",
    "官方 Apple Health 导出的主 XML 不一定叫 `export.xml`；中文系统中可能叫 `导出.xml`，部分 ZIP 工具里也可能显示为乱码文件名，这通常是 ZIP 文件名编码导致，不代表文件损坏。",
    inspected.some((candidate) => candidate.rootName === "ClinicalDocument")
      ? "检测到根节点为 `ClinicalDocument` 的 XML；该文件属于 CDA 辅助导出，不作为主分析输入。"
      : "请确认 ZIP 中至少包含一个根节点为 `HealthData` 的 XML。",
  ];

  if (detectedRoots.length > 0) {
    details.push(`当前检测到的 XML 根节点：${detectedRoots.join(", ")}。`);
  }

  if (parseFailures.length > 0) {
    details.push(`另外有 ${parseFailures.length} 个 XML 无法解析根节点，已跳过。`);
  }

  throw new Error(details.join(" "));
}

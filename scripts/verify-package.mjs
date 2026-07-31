import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

const packResult = JSON.parse(
  execFileSync(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  ),
);

const packedFiles = new Set(
  (packResult[0]?.files ?? []).map((entry) => entry.path),
);
const requiredFiles = [
  "dist/cli.js",
  "dist/types.js",
  ".agents/skills/apple-health-analyst/SKILL.md",
  "README.md",
  "README.zh-CN.md",
  "CONTRIBUTING.md",
  "PRIVACY.md",
  "SECURITY.md",
];

const missingFiles = requiredFiles.filter((file) => !packedFiles.has(file));
if (missingFiles.length > 0) {
  throw new Error(
    `Package is missing required files: ${missingFiles.join(", ")}`,
  );
}

const builtTypes = await import(
  new URL(`../dist/types.js?verify=${Date.now()}`, import.meta.url)
);
if (builtTypes.PACKAGE_VERSION !== packageJson.version) {
  throw new Error(
    `Built version ${builtTypes.PACKAGE_VERSION} does not match package.json ${packageJson.version}.`,
  );
}

const cliHelp = execFileSync(
  process.execPath,
  ["dist/cli.js", "render", "--help"],
  { cwd: projectRoot, encoding: "utf8" },
);
for (const option of ["--type", "--with-cross-link"]) {
  if (!cliHelp.includes(option)) {
    throw new Error(`Packed CLI help is missing ${option}.`);
  }
}

console.log(
  `Package contract verified (${packedFiles.size} files, version ${packageJson.version}).`,
);

// NestEgg — household budget site, make.fun entrypoint.
//
// Run by the grader as `node main.ts` (Node 22). Copies the static site
// from this repository into the output directory and writes dossier.json
// describing it. No dependencies, only Node built-ins.

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// The repository root is derived from this script's own location, never
// from process.cwd(): the grader launches us from a different working
// directory, so the current directory cannot be trusted to be the repo.
const repoRoot: string = path.dirname(fileURLToPath(import.meta.url));

// Output directory from the environment, falling back to ./out relative
// to the directory the program was launched from.
const outputDir: string =
  process.env.MAKEFUN_OUTPUT_DIR ?? path.join(process.cwd(), "out");

interface SiteFile {
  src: string;
  dest: string;
  role: string;
}

const siteFiles: SiteFile[] = [
  {
    src: "index.html",
    dest: "index.html",
    role: "Page markup for the household budget site.",
  },
  {
    src: "app.js",
    dest: "app.js",
    role: "Application logic for transactions, budgets, bills, savings goals and charts.",
  },
  {
    src: "styles.css",
    dest: "styles.css",
    role: "Styling for the household budget site.",
  },
];

const screenshotDir = "screenshots";

function main(): void {
  fs.mkdirSync(outputDir, { recursive: true });

  // Copy the three site files into the output directory.
  for (const file of siteFiles) {
    fs.copyFileSync(path.join(repoRoot, file.src), path.join(outputDir, file.dest));
  }

  // Copy the whole screenshots directory (desktop and mobile PNGs).
  const srcShots: string = path.join(repoRoot, screenshotDir);
  const destShots: string = path.join(outputDir, screenshotDir);
  fs.mkdirSync(destShots, { recursive: true });
  const shotNames: string[] = fs
    .readdirSync(srcShots)
    .filter((name: string) => name.toLowerCase().endsWith(".png"))
    .sort();
  for (const name of shotNames) {
    fs.copyFileSync(path.join(srcShots, name), path.join(destShots, name));
  }

  // Verify every required file actually landed in the output directory
  // before writing the dossier.
  const required: string[] = [
    ...siteFiles.map((f: SiteFile) => f.dest),
    ...shotNames.map((n: string) => path.join(screenshotDir, n)),
  ];
  const missing: string[] = required.filter(
    (rel: string) => !fs.existsSync(path.join(outputDir, rel)),
  );
  if (missing.length > 0) {
    console.error(
      `NestEgg: missing output file(s) in ${outputDir}: ${missing.join(", ")} (repo root: ${repoRoot})`,
    );
    process.exit(1);
  }

  const dossier = {
    name: "NestEgg",
    description:
      "NestEgg helps a household plan a month, track its transactions, set a budget for each spending category, keep on top of recurring bills, watch its savings goals, and draw simple charts, with all data stored locally in the browser.",
    entry: "index.html",
    screenshots: shotNames.map((n: string) => path.join(screenshotDir, n)),
    files: [
      ...siteFiles.map((f: SiteFile) => ({ path: f.dest, role: f.role })),
      ...shotNames.map((n: string) => ({
        path: path.join(screenshotDir, n),
        role: n.toLowerCase().includes("mobile")
          ? "Mobile screenshot of the household budget site."
          : "Desktop screenshot of the household budget site.",
      })),
    ],
  };

  fs.writeFileSync(
    path.join(outputDir, "dossier.json"),
    JSON.stringify(dossier, null, 2) + "\n",
    "utf8",
  );

  console.log(`NestEgg: site copied to ${outputDir}`);
  console.log(`NestEgg: dossier.json written (${required.length} site files)`);
}

main();

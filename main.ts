// NestEgg — household budget site entrypoint (make.fun program/v1 harness).
//
// Run with: node main.ts
// The grader runs this file with Node 22. It copies the static site into the
// output directory and writes a dossier.json describing the entry.
//
// Behaviour:
//   - Output directory comes from MAKEFUN_OUTPUT_DIR, falling back to ./out.
//   - Only reads files from the repository; only writes into the output dir,
//     so it works when the repository itself is read-only and the output
//     directory lives somewhere else entirely.
//   - Zero dependencies, plain TypeScript using only erasable syntax.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = process.cwd();
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "./out");

const siteFiles = ["index.html", "app.js", "styles.css"];
const screenshotDir = "screenshots";

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function main(): void {
  for (const file of siteFiles) {
    const source = join(repoRoot, file);
    if (!existsSync(source)) fail(`missing required site file: ${file}`);
  }
  const screenshotsSource = join(repoRoot, screenshotDir);
  if (!existsSync(screenshotsSource) || !statSync(screenshotsSource).isDirectory()) {
    fail(`missing required screenshots directory: ${screenshotDir}/`);
  }

  mkdirSync(outputDir, { recursive: true });

  for (const file of siteFiles) {
    cpSync(join(repoRoot, file), join(outputDir, file));
  }
  cpSync(screenshotsSource, join(outputDir, screenshotDir), { recursive: true });

  // Sanity-check the copy before writing the dossier: the grader must be
  // able to open the entry file from the output directory.
  for (const file of [...siteFiles, ...readdirSync(join(outputDir, screenshotDir)).map((n) => `${screenshotDir}/${n}`)]) {
    if (!existsSync(join(outputDir, file))) fail(`copy failed, missing in output: ${file}`);
  }

  const screenshotFiles = readdirSync(join(outputDir, screenshotDir))
    .filter((name) => statSync(join(outputDir, screenshotDir, name)).isFile())
    .sort()
    .map((name) => `${screenshotDir}/${name}`);

  const dossier = {
    name: "NestEgg",
    description:
      "NestEgg is a household budget site that helps a family plan a month, track every transaction, and see where the money actually goes: it shows a monthly income-versus-spending summary, lets you set a budget per category and watch it fill up, records transactions and recurring bills, tracks savings goals, and draws simple hand-rolled charts of spending over time, all in the browser with data kept locally.",
    entry: "index.html",
    screenshots: screenshotFiles,
    files: [
      { path: "index.html", role: "Page markup: the budget dashboard layout, forms and containers the app fills in." },
      { path: "app.js", role: "Application logic: monthly summary, category budgets, transactions, bills, savings goals, charts and localStorage persistence." },
      { path: "styles.css", role: "Styling for the whole site: layout, cards, forms and responsive rules." },
      { path: "screenshots/desktop.png", role: "Desktop screenshot of the site." },
      { path: "screenshots/mobile.png", role: "Mobile screenshot of the site." },
    ],
  };

  writeFileSync(join(outputDir, "dossier.json"), JSON.stringify(dossier, null, 2) + "\n", "utf8");

  console.log(`NestEgg: copied ${siteFiles.length} files and ${screenshotFiles.length} screenshot(s) to ${outputDir}`);
  console.log("NestEgg: wrote dossier.json");
}

main();

import { appendFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const OUTPUT_ROOT = path.resolve(process.cwd(), "dist");
const PAGEFIND_ROOT = path.join(OUTPUT_ROOT, "pagefind");
const PAGEFIND_ENTRY = path.join(PAGEFIND_ROOT, "pagefind.js");
const DEFAULT_SIZE_BUDGET_MIB = 850;

const configuredBudget = Number(
  process.env.PUBLISHED_SIZE_BUDGET_MIB ?? DEFAULT_SIZE_BUDGET_MIB,
);
if (!Number.isFinite(configuredBudget) || configuredBudget <= 0) {
  throw new Error(
    `PUBLISHED_SIZE_BUDGET_MIB must be a positive number, received ${String(process.env.PUBLISHED_SIZE_BUDGET_MIB)}`,
  );
}

const sizeBudgetBytes = Math.floor(configuredBudget * 1024 * 1024);

async function* walkFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walkFiles(entryPath);
    else if (entry.isFile() || entry.isSymbolicLink()) yield entryPath;
  }
}

function formatMib(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

await stat(PAGEFIND_ENTRY).catch(() => {
  throw new Error(`Missing Pagefind entry point: ${PAGEFIND_ENTRY}`);
});

let fileCount = 0;
let htmlPageCount = 0;
let publishedBytes = 0;
let pagefindBytes = 0;

for await (const filePath of walkFiles(OUTPUT_ROOT)) {
  const fileStats = await stat(filePath);
  fileCount += 1;
  publishedBytes += fileStats.size;
  if (filePath.endsWith(".html")) htmlPageCount += 1;
  if (filePath.startsWith(`${PAGEFIND_ROOT}${path.sep}`)) {
    pagefindBytes += fileStats.size;
  }
}

const summary = [
  "### Build output",
  "",
  `- Files: ${fileCount}`,
  `- HTML pages: ${htmlPageCount}`,
  `- Published files: ${formatMib(publishedBytes)}`,
  `- Pagefind: ${formatMib(pagefindBytes)}`,
  `- Size budget: ${formatMib(sizeBudgetBytes)}`,
  "",
].join("\n");

console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
}

if (publishedBytes > sizeBudgetBytes) {
  throw new Error(
    `Published site is ${formatMib(publishedBytes)}; the budget is ${formatMib(sizeBudgetBytes)}`,
  );
}

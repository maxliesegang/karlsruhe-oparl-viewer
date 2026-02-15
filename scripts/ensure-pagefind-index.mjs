import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const pagefindBundlePath = resolve(process.cwd(), "dist/pagefind/pagefind.js");
const distIndexPath = resolve(process.cwd(), "dist/index.html");

const skipPagefind = ["1", "true", "yes"].includes(
  String(process.env.SKIP_PAGEFIND ?? "")
    .trim()
    .toLowerCase(),
);

if (skipPagefind || existsSync(pagefindBundlePath)) {
  process.exit(0);
}

function commandBinary(command) {
  return process.platform === "win32" ? `${command}.cmd` : command;
}

function run(command, args, description) {
  console.log(`[dev] ${description}`);
  const result = spawnSync(commandBinary(command), args, {
    stdio: "inherit",
    env: process.env,
  });
  return result.status === 0;
}

if (!existsSync(distIndexPath)) {
  const built = run(
    "npm",
    ["run", "build:quick"],
    "No dist output found. Running build:quick first...",
  );

  if (!built) {
    console.warn(
      "[dev] build:quick failed. Continuing without a local Pagefind index.",
    );
    process.exit(0);
  }
}

const indexed = run(
  "npx",
  ["pagefind", "--site", "dist", "--output-subdir", "pagefind"],
  "Generating local Pagefind index...",
);

if (!indexed) {
  console.warn(
    "[dev] Pagefind indexing failed. Search will remain unavailable until it succeeds.",
  );
}

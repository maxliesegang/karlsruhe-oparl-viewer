import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repositoryUrl =
  "https://github.com/maxliesegang/karlsruhe-oparl-syndication.git";
const checkoutDirectory = resolve(process.cwd(), "syndication-data");
const dataDirectory = resolve(checkoutDirectory, "docs");

if (existsSync(dataDirectory)) {
  console.log(`Local syndication data already exists at ${dataDirectory}`);
  process.exit(0);
}

if (existsSync(checkoutDirectory)) {
  console.error(
    `${checkoutDirectory} exists but does not contain a docs directory. Move or remove it, then retry.`,
  );
  process.exit(1);
}

console.log(`Cloning syndication data into ${checkoutDirectory}...`);
const result = spawnSync(
  "git",
  ["clone", "--depth", "1", repositoryUrl, checkoutDirectory],
  { stdio: "inherit" },
);

if (result.error) {
  console.error(`Could not start git: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0 || !existsSync(dataDirectory)) {
  console.error("The syndication data checkout could not be prepared.");
  process.exit(result.status ?? 1);
}

console.log("Local syndication data is ready.");

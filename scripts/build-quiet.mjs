import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

// `astro build` prints one line per generated page. This project generates
// ~30k pages, so a plain build emits ~30k lines (~1.5 MB) of which only a
// handful carry information. That is unreadable in a terminal and blows up the
// context window of any agent that runs the build. Drop the per-page lines and
// report how many were suppressed; everything else passes through untouched.
const PER_PAGE_LINE = /├─/;

const child = spawn("astro", ["build", ...process.argv.slice(2)], {
  stdio: ["inherit", "pipe", "inherit"],
  shell: process.platform === "win32",
});

let suppressed = 0;

createInterface({ input: child.stdout }).on("line", (line) => {
  if (PER_PAGE_LINE.test(line)) {
    suppressed += 1;
    return;
  }
  console.log(line);
});

child.on("error", (error) => {
  console.error(`Could not start astro: ${error.message}`);
  process.exit(1);
});

child.on("close", (code, signal) => {
  if (suppressed > 0) {
    console.log(`(${suppressed} per-page route lines suppressed)`);
  }
  process.exit(signal ? 1 : (code ?? 1));
});

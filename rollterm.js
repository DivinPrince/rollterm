#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const entry = join(dirname(fileURLToPath(import.meta.url)), "index.ts");
const result = spawnSync("bun", [entry, ...process.argv.slice(2)], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);

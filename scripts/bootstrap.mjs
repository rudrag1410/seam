import { copyFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const ENV_FILES = [
  ["apps/backend/.env.example", "apps/backend/.env"],
  ["apps/frontend/.env.example", "apps/frontend/.env.local"],
];

for (const [from, to] of ENV_FILES) {
  if (existsSync(to)) {
    console.log(`kept ${to}`);
  } else {
    copyFileSync(from, to);
    console.log(`created ${to}`);
  }
}

const sync = spawnSync("uv", ["sync", "--directory", "apps/backend"], { stdio: "inherit" });
if (sync.error) {
  console.error("uv is required for the API. Install it from https://docs.astral.sh/uv/");
  process.exit(1);
}
process.exit(sync.status ?? 0);

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const envPath = process.env.RAILWAY_ENV_FILE
  ? path.resolve(process.cwd(), process.env.RAILWAY_ENV_FILE)
  : path.resolve(process.cwd(), ".env");

if (!fs.existsSync(envPath)) {
  console.error(`[railway-sync-env] Missing env file: ${envPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(envPath, "utf8");
const entries = [];
const keys = [];

for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;

  const normalized = trimmed.startsWith("export ")
    ? trimmed.slice("export ".length)
    : trimmed;

  const eqIndex = normalized.indexOf("=");
  if (eqIndex <= 0) continue;

  const key = normalized.slice(0, eqIndex).trim();
  let value = normalized.slice(eqIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  entries.push(`${key}=${value}`);
  keys.push(key);
}

if (entries.length === 0) {
  console.error("[railway-sync-env] No variables found to sync.");
  process.exit(1);
}

const args = ["variables", "set"];

if (process.env.RAILWAY_SERVICE_ID) {
  args.push("--service", process.env.RAILWAY_SERVICE_ID);
}
if (process.env.RAILWAY_ENVIRONMENT_ID) {
  args.push("--environment", process.env.RAILWAY_ENVIRONMENT_ID);
}
if (process.env.RAILWAY_SKIP_DEPLOYS === "true") {
  args.push("--skip-deploys");
}

args.push(...entries);

console.log(`[railway-sync-env] Syncing ${entries.length} variables from ${path.basename(envPath)}`);
console.log(`[railway-sync-env] Keys: ${keys.join(", ")}`);

const result = spawnSync("railway", args, { stdio: "inherit" });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envPath = path.join(cwd, ".env");
const examplePath = path.join(cwd, ".env.example");

if (fs.existsSync(envPath)) {
  process.exit(0);
}

if (!fs.existsSync(examplePath)) {
  console.warn("[ensure-env] .env.example not found; skipping .env creation.");
  process.exit(0);
}

fs.copyFileSync(examplePath, envPath);
console.log("[ensure-env] Created .env from .env.example");

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const port = portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || "3000";
const python =
  process.env.FINSIGHT_PYTHON ||
  (existsSync(".venv/bin/python") ? ".venv/bin/python" : "python3");
const api = spawn(
  python,
  [
    "-m",
    "uvicorn",
    "backend.main:app",
    "--host",
    "127.0.0.1",
    "--port",
    "8000",
  ],
  // Keyless API access is allowed only for this local launcher, and only when no API key is configured.
  { stdio: "inherit", env: { ...process.env, ...(process.env.FINSIGHT_API_KEY ? {} : { FINSIGHT_INSECURE_DEV: "1" }) } },
);
const web = spawn(
  "npm",
  ["run", "start", "--prefix", "frontend", "--", "--port", port],
  { stdio: "inherit" },
);
const stop = () => {
  api.kill("SIGTERM");
  web.kill("SIGTERM");
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
api.on("error", (e) => {
  console.error("API launch failed:", e.message);
  web.kill();
  process.exitCode = 1;
});
web.on("error", (e) => {
  console.error("Frontend launch failed:", e.message);
  api.kill();
  process.exitCode = 1;
});
api.on("exit", (code) => {
  if (code) {
    web.kill();
    process.exitCode = code;
  }
});
web.on("exit", (code) => {
  api.kill();
  process.exitCode = code || 0;
});

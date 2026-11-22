import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureLocalRunnerConfig } from "../lib/local-runner-config";

const dir = mkdtempSync(join(tmpdir(), "local-runner-config-"));
const path = join(dir, "config.json");
assert.equal(
  ensureLocalRunnerConfig(path, {
    NEON_FUNCTION_INGEST_BASE_URL: "https://function.example/",
    FACTORY_INGEST_SECRET: "secret-value",
  }),
  true,
);
assert.equal(existsSync(path), true);
assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), {
  ingestUrl: "https://function.example/ingest",
  secret: "secret-value",
  factory: { maxInFlight: 1, tickSeconds: 30, repos: [] },
});
assert.equal(ensureLocalRunnerConfig(path, {}), false, "an existing config is preserved without requiring env again");
assert.throws(() => ensureLocalRunnerConfig(join(dir, "missing.json"), {}), /NEON_FUNCTION_INGEST_BASE_URL/);

console.log("local runner config regressions passed");

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addRepoPathToConfig, managedRepoPath } from "../lib/managed-repos";

const dir = mkdtempSync(join(tmpdir(), "managed-repos-"));
const configPath = join(dir, "config.json");
writeFileSync(configPath, JSON.stringify({ ingestUrl: "https://example.invalid/ingest", secret: "kept", factory: { maxInFlight: 1, repos: ["/existing"] } }));

assert.equal(managedRepoPath("acme/web", "/managed"), "/managed/acme/web");
assert.throws(() => managedRepoPath("../escape", "/managed"), /owner\/name/);
assert.throws(() => managedRepoPath("acme/web/extra", "/managed"), /owner\/name/);

assert.equal(addRepoPathToConfig(configPath, "/managed/acme/web"), true);
assert.equal(addRepoPathToConfig(configPath, "/managed/acme/web"), false, "adding the same checkout is idempotent");
const saved = JSON.parse(readFileSync(configPath, "utf8"));
assert.equal(saved.secret, "kept");
assert.deepEqual(saved.factory.repos, ["/existing", "/managed/acme/web"]);

console.log("managed repos regressions passed");

import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function ensureLocalRunnerConfig(path: string, env: Record<string, string | undefined> = process.env) {
  if (existsSync(path)) return false;
  const base = env.NEON_FUNCTION_INGEST_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("NEON_FUNCTION_INGEST_BASE_URL is required to configure the local runner");
  const secret = env.FACTORY_INGEST_SECRET;
  if (!secret) throw new Error("FACTORY_INGEST_SECRET is required to configure the local runner");
  const config = {
    ingestUrl: `${base}/ingest`,
    secret,
    factory: { maxInFlight: 1, tickSeconds: 30, repos: [] as string[] },
  };
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, path);
  return true;
}

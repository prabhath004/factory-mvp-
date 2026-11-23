export function configuredLiveUpdates({ explicit, vercelEnv }: { explicit?: string; vercelEnv?: string }) {
  return explicit ?? (vercelEnv === "preview" ? "off" : "on");
}

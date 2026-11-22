const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Explicit local-development auth bypass. It is structurally disabled in production. */
export function developmentOwner({ nodeEnv = process.env.NODE_ENV, email = process.env.FACTORY_DEV_OWNER_EMAIL }: { nodeEnv?: string; email?: string } = {}) {
  if (nodeEnv !== "development") return null;
  const value = email?.trim().toLowerCase();
  return value && EMAIL.test(value) ? value : null;
}

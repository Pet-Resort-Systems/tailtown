const escapeForRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function createAllowedOriginChecker(
  allowedOriginsEnv: string | undefined,
  defaultOrigins: string[] = []
) {
  const configuredOrigins = allowedOriginsEnv
    ? allowedOriginsEnv
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : defaultOrigins;

  const exactAllowedOrigins = new Set(
    configuredOrigins.filter((origin) => !origin.includes('*'))
  );
  const wildcardOriginPatterns = configuredOrigins
    .filter((origin) => origin.includes('*'))
    .map((origin) => {
      const escapedOrigin = escapeForRegex(origin);
      return new RegExp(`^${escapedOrigin.replace(/\\\*/g, '.*')}$`, 'i');
    });

  return (origin: string) =>
    exactAllowedOrigins.has(origin) ||
    wildcardOriginPatterns.some((pattern) => pattern.test(origin));
}

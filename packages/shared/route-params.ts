export function assertStringRouteParam<TError extends Error>(
  param: string | string[] | undefined,
  originalPath: string,
  createValidationError: (message: string) => TError,
  missingMessage: string = 'Route parameter is required'
): string {
  if (param === undefined) {
    throw createValidationError(missingMessage);
  }

  if (Array.isArray(param)) {
    throw createValidationError(
      `'${originalPath}' endpoint is not implemeted to receive *splat (wildcard) parameters`
    );
  }

  return param;
}

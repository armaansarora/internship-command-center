/**
 * Prevent open redirects after OAuth: only allow same-origin relative paths.
 */
const DEFAULT_AUTHENTICATED_PATH = "/penthouse";

export function getSafePostAuthPath(nextParam: string | null): string {
  if (nextParam == null || nextParam === "") {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  const decoded = nextParam.trim();
  if (!decoded.startsWith("/")) {
    return DEFAULT_AUTHENTICATED_PATH;
  }
  if (decoded.startsWith("//")) {
    return DEFAULT_AUTHENTICATED_PATH;
  }
  if (decoded.includes("\\")) {
    return DEFAULT_AUTHENTICATED_PATH;
  }
  if (decoded.includes("://")) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  return decoded;
}

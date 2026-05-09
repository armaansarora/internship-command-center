export const DEV_PREVIEW_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "preview@interntower.local",
} as const;

const LOCAL_STUB_ORIGINS = new Set([
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://[::1]:3001",
]);

const LOCAL_APP_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalSupabaseStubUrl(value: string): boolean {
  try {
    return LOCAL_STUB_ORIGINS.has(new URL(value).origin);
  } catch {
    return false;
  }
}

export function isLocalAppHost(hostname: string): boolean {
  return LOCAL_APP_HOSTS.has(hostname);
}

export function isDevPreviewAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.TOWER_DEV_PREVIEW_AUTH === "1" &&
    isLocalSupabaseStubUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  );
}

export function getSupabaseAuthCookieBaseName(supabaseUrl: string): string {
  const url = new URL(supabaseUrl);
  const projectRef = url.hostname.split(".")[0] ?? "localhost";
  return `sb-${projectRef}-auth-token`;
}

export function getSafeDevPreviewNextPath(
  nextPath: string | null,
  fallback = "/penthouse",
): string {
  if (!nextPath) return fallback;
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return fallback;
  if (nextPath.startsWith("/api/")) return fallback;
  return nextPath;
}

export const SUPABASE_AUTH_OPERATION_TIMEOUT_MS = 5_000;
export const SUPABASE_AUTH_OPERATION_TIMEOUT_MESSAGE =
  "Supabase Auth operation timed out";

export function isTransientSupabaseAuthError(
  message: string | null | undefined,
): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("unexpected token '<'") ||
    lower.includes("connection timed out") ||
    lower.includes("522") ||
    lower.includes("fetch failed") ||
    lower.includes(SUPABASE_AUTH_OPERATION_TIMEOUT_MESSAGE.toLowerCase())
  );
}

export function isSupabaseAuthTimeoutError(
  message: string | null | undefined,
): boolean {
  return (
    typeof message === "string" &&
    message.toLowerCase().includes(
      SUPABASE_AUTH_OPERATION_TIMEOUT_MESSAGE.toLowerCase(),
    )
  );
}

export function isRestartableSupabaseAuthError(
  message: string | null | undefined,
): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes("pkce code verifier not found");
}

export async function withSupabaseAuthTimeout<T>(
  operation: Promise<T>,
  timeoutMs = SUPABASE_AUTH_OPERATION_TIMEOUT_MS,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(SUPABASE_AUTH_OPERATION_TIMEOUT_MESSAGE));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function isTransientSupabaseAuthError(
  message: string | null | undefined,
): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("unexpected token '<'") ||
    lower.includes("connection timed out") ||
    lower.includes("522") ||
    lower.includes("fetch failed")
  );
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  retryableStatusCodes: number[];
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 4,
  baseDelayMs: 500,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

function extractStatusCode(err: unknown): number | undefined {
  if (err == null || typeof err !== "object") return undefined;
  const candidate = err as Record<string, unknown>;
  if (typeof candidate.statusCode === "number") return candidate.statusCode;
  if (typeof candidate.status === "number") return candidate.status;
  const responseHeaders = candidate.responseHeaders;
  if (responseHeaders && typeof responseHeaders === "object") {
    const status = (responseHeaders as Record<string, unknown>).status;
    if (typeof status === "string") {
      const parsed = Number.parseInt(status, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
    if (typeof status === "number") return status;
  }
  if (err instanceof Error) {
    const match = err.message.match(/HTTP\s+(\d{3})/) ?? err.message.match(/\b(4\d{2}|5\d{2})\b/);
    if (match) return Number.parseInt(match[1]!, 10);
  }
  return undefined;
}

function isRetryableError(err: unknown, retryableStatusCodes: number[]): boolean {
  const status = extractStatusCode(err);
  if (status === undefined) return false;
  return retryableStatusCodes.includes(status);
}

export async function withRetryAndBackoff<T>(op: () => Promise<T>, options: RetryOptions = DEFAULT_RETRY_OPTIONS): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await op();
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err, options.retryableStatusCodes)) throw err;
      if (attempt === options.maxAttempts) throw err;
      const delay = options.baseDelayMs * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError ?? new Error("withRetryAndBackoff: exhausted attempts");
}

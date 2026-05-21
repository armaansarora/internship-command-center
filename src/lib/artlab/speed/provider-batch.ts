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

function isRetryableError(err: unknown, retryableStatusCodes: number[]): boolean {
  if (!(err instanceof Error)) return false;
  const match = err.message.match(/HTTP\s+(\d{3})/);
  if (!match) return false;
  const status = Number.parseInt(match[1]!, 10);
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

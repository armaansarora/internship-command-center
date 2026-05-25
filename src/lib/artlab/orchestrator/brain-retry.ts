// src/lib/artlab/orchestrator/brain-retry.ts
//
// Shared retry + timeout helper for brain adapters. Both claude-brain and
// gemini-brain wrap their network call with `withRetryAndTimeout` so a
// transient 429/5xx/network blip doesn't silently degrade the brain to its
// canonical fallback. The retry envelope is reported back to the caller so
// logged-brain can record retry-count + last-error in the decision log.
//
// Defaults: 3 attempts (1s, 2s, 4s backoff), 45s per-attempt timeout. Vision
// kinds get 90s. Override globally via ARTLAB_BRAIN_TIMEOUT_MS.

const RETRYABLE_HTTP_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_PATTERNS = [
  /timeout/i,
  /aborted/i,
  /ECONNRESET/,
  /EPIPE/,
  /fetch failed/i,
  /network/i,
];

export interface BrainRetryOptions {
  /** Display name for logging (e.g. "claude-brain", "gemini-brain"). */
  opName: string;
  /** Total attempts including the first. Default 3. */
  maxAttempts?: number;
  /** Base backoff in ms; doubled per attempt. Default 1000. */
  baseBackoffMs?: number;
  /** Per-attempt timeout in ms. Default 45_000. */
  timeoutMs?: number;
}

export interface BrainRetryEnvelope<T> {
  result: T;
  retryCount: number;        // 0 if first attempt succeeded
  lastError?: string;        // present if any attempt failed
}

/** Vision kinds need extra time for multimodal reasoning. */
export function defaultTimeoutForKind(kind: string): number {
  const envOverride = process.env.ARTLAB_BRAIN_TIMEOUT_MS;
  if (envOverride) {
    const parsed = Number.parseInt(envOverride, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  if (kind === "critique-concept-board" || kind === "critique-production-sprites") {
    return 90_000;
  }
  return 45_000;
}

/**
 * Wrap an async function in retry + per-attempt timeout. The wrapped function
 * MUST honour the provided AbortSignal so the timeout actually fires.
 *
 * Throws the last error if all attempts fail. On success, returns the result
 * + how many retries it took (0 = first attempt succeeded) + the last error
 * encountered (for surfacing transient flakiness in the decision log).
 */
export async function withRetryAndTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: BrainRetryOptions,
): Promise<BrainRetryEnvelope<T>> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseBackoffMs = options.baseBackoffMs ?? 1000;
  const timeoutMs = options.timeoutMs ?? 45_000;

  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const result = await fn(controller.signal);
      clearTimeout(timer);
      return {
        result,
        retryCount: attempt,
        lastError: attempt > 0 && lastErr ? errorMessage(lastErr) : undefined,
      };
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt === maxAttempts - 1) break;
      if (!isRetryable(err)) break;
      const backoffMs = baseBackoffMs * 2 ** attempt;
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw new Error(`${options.opName} failed after ${maxAttempts} attempts: ${errorMessage(lastErr)}`);
}

export function isRetryableHttpStatus(status: number): boolean {
  return RETRYABLE_HTTP_STATUS_CODES.has(status);
}

function isRetryable(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof Error) {
    if (err.name === "AbortError") return true; // timeout
    const status = (err as { status?: unknown }).status;
    if (typeof status === "number" && RETRYABLE_HTTP_STATUS_CODES.has(status)) return true;
    return RETRYABLE_ERROR_PATTERNS.some((p) => p.test(err.message));
  }
  return false;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export type LimitedBodyResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; error: string; status: number };

export type LimitedBodyError = Extract<LimitedBodyResult, { ok: false }>;

export type LimitedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string; status: number };

export const DEFAULT_JSON_BODY_MAX_BYTES = 128 * 1024;

function parseContentLength(headers: Headers): number | null {
  const raw = headers.get("content-length");
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isSafeInteger(value) ? value : null;
}

export function rejectLargeRequestBody(
  request: Request,
  maxBytes: number,
): LimitedBodyError | null {
  const contentLength = parseContentLength(request.headers);
  if (contentLength !== null && contentLength > maxBytes) {
    return {
      ok: false,
      error: "request_body_too_large",
      status: 413,
    };
  }
  return null;
}

function concatChunks(chunks: Uint8Array[], totalBytes: number): Uint8Array {
  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function readRawBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<LimitedBodyResult> {
  const precheck = rejectLargeRequestBody(request, maxBytes);
  if (precheck) return precheck;

  if (!request.body) return { ok: true, bytes: new Uint8Array() };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return {
          ok: false,
          error: "request_body_too_large",
          status: 413,
        };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return { ok: true, bytes: concatChunks(chunks, received) };
}

export async function readJsonBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<LimitedJsonResult> {
  const body = await readRawBodyWithLimit(request, maxBytes);
  if (!body.ok) return body;

  try {
    const text = new TextDecoder().decode(body.bytes);
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: "invalid_json_body", status: 400 };
  }
}

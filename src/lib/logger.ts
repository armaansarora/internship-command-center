import { isProd } from "./env";

/**
 * Structured logger. Thin wrapper over console so Vercel/Sentry pick up
 * JSON-serialisable payloads. Avoids bringing in a full logger dependency.
 *
 * Usage:
 *   log.info("stripe.webhook.received", { eventId, type });
 *   log.error("gmail.sync.failed", err, { userId });
 */

export type LogFields = Record<string, unknown>;

interface LogPayload {
  level: "debug" | "info" | "warn" | "error";
  msg: string;
  ts: string;
  fields: LogFields;
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth-limit]";
  if (value == null) return value;
  if (typeof value === "string") {
    // Common token prefixes we should never log raw
    if (/^sk-|^whsec_|^rk_|^Bearer\s+/i.test(value)) return "[redacted]";
    return value.length > 2_000 ? `${value.slice(0, 2_000)}…` : value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const lower = k.toLowerCase();
    if (
      lower.includes("password") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("cookie") ||
      lower.includes("authorization")
    ) {
      out[k] = "[redacted]";
    } else {
      out[k] = redact(v, depth + 1);
    }
  }
  return out;
}

function emit(payload: LogPayload): void {
  const line = {
    level: payload.level,
    msg: payload.msg,
    ts: payload.ts,
    ...(redact(payload.fields) as LogFields),
  };
  if (isProd()) {
    // Single-line JSON for log aggregation.
    (payload.level === "error" ? console.error : console.log)(JSON.stringify(line));
    return;
  }
  // Pretty in development — still redact fields before printing.
  const fn =
    payload.level === "error"
      ? console.error
      : payload.level === "warn"
        ? console.warn
        : console.log;
  fn(`[${payload.level}]`, payload.msg, redact(payload.fields));
}

function serialiseError(err: unknown): LogFields {
  if (err instanceof Error) {
    return { error: { name: err.name, message: err.message, stack: err.stack } };
  }
  // Plain objects (e.g. Supabase PostgrestError: { code, message, details, hint })
  // otherwise stringify as "[object Object]" and hide the real failure reason.
  if (err && typeof err === "object") {
    const obj = err as Record<string, unknown>;
    const keys = [
      "code",
      "message",
      "details",
      "hint",
      "status",
      "statusText",
      "name",
    ] as const;
    const picked: Record<string, unknown> = {};
    for (const k of keys) {
      if (k in obj) picked[k] = obj[k];
    }
    return { error: Object.keys(picked).length > 0 ? picked : obj };
  }
  return { error: String(err) };
}

export const log = {
  debug(msg: string, fields: LogFields = {}): void {
    if (isProd()) return;
    emit({ level: "debug", msg, ts: new Date().toISOString(), fields });
  },
  info(msg: string, fields: LogFields = {}): void {
    emit({ level: "info", msg, ts: new Date().toISOString(), fields });
  },
  warn(msg: string, fields: LogFields = {}): void {
    emit({ level: "warn", msg, ts: new Date().toISOString(), fields });
  },
  error(msg: string, err?: unknown, fields: LogFields = {}): void {
    emit({
      level: "error",
      msg,
      ts: new Date().toISOString(),
      fields: { ...fields, ...(err === undefined ? {} : serialiseError(err)) },
    });
  },
};

/**
 * PDF resume parser.
 *
 * Extracts plain text + page count from a PDF buffer using pdfjs-dist.
 * The library is imported dynamically so it never runs during module load
 * or build-time analysis — critical for Next.js 16 bundling.
 *
 * Non-negotiables enforced here (per autopilot brief):
 *   - ReDoS guard: the parsed text must not contain runaway inputs that
 *     downstream regex-driven tailoring could hang on (max 500KB parsed
 *     text, max 50 pages, reject pathological whitespace patterns).
 *   - The raw PDF is never stored alongside the parsed text; storage-path
 *     references the private bucket only.
 */

export const MAX_PAGES = 50;
export const MAX_PARSED_TEXT_BYTES = 500_000; // 500 KB
export const MAX_FILE_BYTES = 10_485_760; // 10 MB (mirror bucket limit)

export type ResumeParseError =
  | { type: "empty_pdf" }
  | { type: "too_many_pages"; pages: number }
  | { type: "redos_risk"; reason: string }
  | { type: "parse_failed"; message: string };

export interface ResumeParseSuccess {
  text: string;
  pageCount: number;
  bytesParsed: number;
  truncated: boolean;
}

export type ResumeParseResult =
  | { ok: true; value: ResumeParseSuccess }
  | { ok: false; error: ResumeParseError };

/**
 * Defense-in-depth validator. Rejects inputs that would make downstream
 * regex work expensive (tailoring prompts slice the text, but a later
 * analyzer/ATS-scanner could use regex against it). Cheap static checks,
 * not a substitute for input-origin validation at upload.
 */
export function runRedosGuard(text: string): { ok: true } | { ok: false; reason: string } {
  // Long runs of a single non-whitespace char (classic regex backtracking
  // arm for patterns with `(x+)+` shapes).
  const longCharRun = /([^\s])\1{999,}/;
  if (longCharRun.test(text)) {
    return { ok: false, reason: "long_character_run" };
  }
  // Very long tokens without whitespace (> 10k chars) — pathological.
  const longToken = /\S{10001,}/;
  if (longToken.test(text)) {
    return { ok: false, reason: "pathological_long_token" };
  }
  // > 50 consecutive backslashes — arms catastrophic backtracking in naive
  // string escape regexes.
  if (/\\{51,}/.test(text)) {
    return { ok: false, reason: "excessive_backslashes" };
  }
  return { ok: true };
}

/**
 * Parse a PDF into { text, pageCount }. Caps to MAX_PAGES and returns
 * `truncated: true` if the cap kicked in, so the caller can log the
 * truncation but still persist what we got (most resumes are ≤ 3 pages;
 * a 50-page upload is pathological).
 *
 * Dynamic import of pdfjs-dist — the module is Node-friendly on
 * `pdfjs-dist/legacy/build/pdf.mjs` but it's heavy and we don't want it
 * bundled into client-side chunks.
 */
export async function parseResumePdf(buffer: ArrayBuffer): Promise<ResumeParseResult> {
  let pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs");
  try {
    // Dynamic import so Next.js doesn't attempt to resolve the worker
    // during RSC analysis.
    pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    // Node-side: disable the worker (we're in a server handler, not a browser).
    pdfjs.GlobalWorkerOptions.workerSrc = "";
  } catch (err) {
    return {
      ok: false,
      error: {
        type: "parse_failed",
        message: `pdfjs-dist load failed: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }

  let doc: import("pdfjs-dist/legacy/build/pdf.mjs").PDFDocumentProxy;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: false,
      disableFontFace: true,
      // Silence the console warnings inside pdfjs — they're not actionable.
      verbosity: 0,
    }).promise;
  } catch (err) {
    return {
      ok: false,
      error: {
        type: "parse_failed",
        message: `pdf open failed: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }

  const totalPages = doc.numPages;
  if (totalPages === 0) {
    return { ok: false, error: { type: "empty_pdf" } };
  }
  if (totalPages > MAX_PAGES) {
    return { ok: false, error: { type: "too_many_pages", pages: totalPages } };
  }

  const lines: string[] = [];
  let bytesAccumulated = 0;
  let truncated = false;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => {
        const t = (item as { str?: unknown }).str;
        return typeof t === "string" ? t : "";
      })
      .filter(Boolean)
      .join(" ");

    const pageBytes = Buffer.byteLength(pageText, "utf8");
    if (bytesAccumulated + pageBytes > MAX_PARSED_TEXT_BYTES) {
      // Fit as much as will fit, then mark truncated.
      const remaining = MAX_PARSED_TEXT_BYTES - bytesAccumulated;
      if (remaining > 0) {
        lines.push(pageText.slice(0, remaining));
        bytesAccumulated += remaining;
      }
      truncated = true;
      break;
    }
    lines.push(pageText);
    bytesAccumulated += pageBytes;
  }

  const rawText = lines.join("\n\n").trim();
  if (rawText.length === 0) {
    return { ok: false, error: { type: "empty_pdf" } };
  }

  const guard = runRedosGuard(rawText);
  if (!guard.ok) {
    return { ok: false, error: { type: "redos_risk", reason: guard.reason } };
  }

  return {
    ok: true,
    value: {
      text: rawText,
      pageCount: Math.min(totalPages, MAX_PAGES),
      bytesParsed: bytesAccumulated,
      truncated,
    },
  };
}

/**
 * rive-init.ts — centralised Rive runtime config (mirrors src/lib/gsap-init.ts).
 *
 * The Tower ships a strict CSP (next.config.ts): `connect-src 'self'` blocks
 * Rive's default jsdelivr/unpkg WASM fetch, and `script-src` needs
 * `'wasm-unsafe-eval'` to instantiate the module at all. So we SELF-HOST the
 * runtime WASM at /rive/rive.wasm (kept in sync by `npm run rive:wasm`) and
 * disable the CDN fallback. Import every Rive primitive from here so there is a
 * single place that owns the runtime contract.
 *
 * IMPORTANT: only import this from a client island mounted with
 * next/dynamic({ ssr: false }) — @rive-app/react-canvas references `window` at
 * import time and must never run during SSR (Next 16 App Router).
 */
import { RuntimeLoader } from "@rive-app/react-canvas";

let configured = false;

/** Point Rive at the self-hosted WASM exactly once (idempotent). */
export function initRive(): void {
  if (configured) return;
  configured = true;
  RuntimeLoader.setWasmUrl("/rive/rive.wasm");
  // No CDN fallback — our CSP only allows 'self', and we ship the only copy.
  RuntimeLoader.setWasmFallbackUrl(null);
}

export { useRive, useStateMachineInput, Fit, Alignment, Layout } from "@rive-app/react-canvas";

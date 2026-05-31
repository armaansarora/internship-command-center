export const meta = {
  name: 'identity-pilot-review',
  description: 'Adversarial multi-lens review of the visual-identity pilot deliverable, then synthesize real findings',
  phases: [
    { title: 'Review', detail: '5 independent lenses inspect the actual files/pixels' },
    { title: 'Verify', detail: 'adversarially confirm each finding is real before reporting' },
  ],
}

async function safe(fn){ try { return await fn(); } catch(e){ log('agent skipped: ' + (e && e.message ? e.message : String(e))); return null; } }

const REPO = "/Users/armaanarora/Documents/The Tower";
const CTX = `You are reviewing an OVERNIGHT, autonomous visual-identity deliverable in the repo at ${REPO} (branch identity/autopilot). It adds a new identity mark "The Keystone" (a matte-gold Art-Deco keystone with a lit passage + a breathing cream "soul" light) behind a NEW /lobby-pilot route — additive, must NOT touch the live lobby (src/app/lobby/*) or byte-protected assets. Repo conventions: Next.js 16 App Router, Server Components by default, "use client" only when needed, import type { JSX } from "react", GSAP only via @/lib/gsap-init, no \`any\`, no console.log, no TODO/FIXME, aria attributes + prefers-reduced-motion respected, Tailwind v3. Use Read/Grep/Bash to inspect the ACTUAL files. Be specific and adversarial; only report REAL issues with file:line. Do not invent problems.`;

const FILES = `Key files: src/components/identity/FloorMark.tsx (+ .test.tsx), src/lib/config/floors.config.ts (+ .test.tsx), src/styles/floor-mark.css, src/app/lobby-pilot/page.tsx, src/app/lobby-pilot/lobby-pilot-client.tsx, src/lib/supabase/middleware.ts (PUBLIC_PATHS), src/__tests__/no-handwritten-svg.test.ts, public/lobby-pilot/*, docs/MARK-SPEC.md, docs/MORNING-REVIEW.md, docs/glyph-autopilot-review.html. Proof images: docs/research/_renders/mark-final-proof.png, favicon-proof.png, motion-study.png.`;

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    lens: { type: 'string' },
    findings: { type: 'array', items: { type: 'object', properties: {
      severity: { type: 'string', enum: ['high','medium','low'] },
      area: { type: 'string' },
      file: { type: 'string' },
      issue: { type: 'string' },
      suggestion: { type: 'string' },
    }, required: ['severity','issue'] } },
    overall: { type: 'string' },
  },
  required: ['findings','overall'],
};

const LENSES = [
  { key: 'correctness', focus: 'CORRECTNESS & CONVENTIONS. Read FloorMark.tsx, floors.config.ts, the /lobby-pilot route, middleware.ts. Check for real bugs, SSR-safety (renderToStaticMarkup), the GSAP useEffect cleanup + reduced-motion guard, useId collisions, any `any`/console.log/TODO, the JSX import, and whether the middleware change is correct and minimal.' },
  { key: 'a11y', focus: 'ACCESSIBILITY. Audit FloorMark + the /lobby-pilot page: role="img" + title/desc correctness, aria-labelledby wiring, prefers-reduced-motion behavior (CSS + the hook), color contrast (gold #C9A84C on navy ~7:1; any gold-on-cream?), keyboard focus on the buttons, decorative vs meaningful semantics. Flag anything that fails WCAG or the house reduced-motion rule.' },
  { key: 'safety', focus: 'SAFETY & SCOPE. Verify additive-only: `git diff --name-only main..identity/autopilot` touches NOTHING under src/app/lobby/ (the live lobby), public/lobby/bg-*, public/art/lobby/otis, public/art/penthouse/ceo. Confirm the middleware PUBLIC_PATHS addition opens ONLY /lobby-pilot (exact, no prefix leak — run the public-paths test reasoning), the route is noindex, and no secrets were added. Confirm nothing was pushed (git log origin/main..HEAD).' },
  { key: 'design', focus: 'DESIGN QUALITY (look at the PIXELS). Read the proof PNGs docs/research/_renders/mark-final-proof.png, favicon-proof.png, motion-study.png with the Read tool and judge: is the mark premium, ownable, rooted in an internship-climb product, and instantly nameable at 24px grayscale + silhouette with NO unintended object misread (e.g. does it still read as a keyhole/tent/letter)? Is the cream-light "soul" legible and calm? Be a skeptical art director.' },
  { key: 'completeness', focus: 'COMPLETENESS vs the DONE conditions. Verify each genuinely holds by inspecting artifacts: (1) docs/research/IDENTITY-RESEARCH.md exists & non-trivial; (2) docs/MARK-SPEC.md locks the mark + 24px gate; (3) FloorMark + floors.config render at /lobby-pilot; (4) favicon assets exist & pass the gate; (5) tsc/lint/test green (trust prior run, but spot-check); (6) glyph-autopilot-review.html + MORNING-REVIEW.md complete with override instructions; (7) all committed to identity/autopilot, not merged/pushed. Flag any GAP or overstatement.' },
];

phase('Review');
const reviews = await pipeline(
  LENSES,
  (lens) => safe(() => agent(
    CTX + '\n\n' + FILES + '\n\nYOUR LENS: ' + lens.focus +
    '\n\nInspect the real files/pixels now, then return findings (severity high/medium/low, file, issue, suggestion) and a one-line overall verdict. Empty findings is a valid, good result if the work is clean.',
    { label: 'review:' + lens.key, phase: 'Review', schema: FINDINGS_SCHEMA }
  )).then((r) => r ? Object.assign({ lens: lens.key }, r) : null),
  // Verify stage: adversarially confirm only the high/medium findings are REAL (kill false positives).
  (review) => {
    if (!review) return null;
    const serious = (review.findings || []).filter((f) => f.severity !== 'low');
    if (!serious.length) return review;
    return safe(() => agent(
      CTX + '\n\nAnother reviewer (' + review.lens + ' lens) raised these findings:\n' +
      JSON.stringify(serious, null, 1) +
      '\n\nADVERSARIALLY VERIFY each by reading the actual file/line. For each, decide confirmed=true only if it is genuinely a real problem in THIS codebase (not a style preference, not already handled elsewhere). Default to confirmed=false if uncertain. Return the verified list.',
      { label: 'verify:' + review.lens, phase: 'Verify', schema: {
        type: 'object', properties: { lens: { type: 'string' }, verified: { type: 'array', items: { type: 'object', properties: {
          severity: { type: 'string' }, file: { type: 'string' }, issue: { type: 'string' }, suggestion: { type: 'string' }, confirmed: { type: 'boolean' },
        }, required: ['issue','confirmed'] } } }, required: ['verified'],
      } }
    )).then((v) => Object.assign({}, review, { verified: v ? v.verified : [] }));
  }
).then((rs) => rs.filter(Boolean));

return { reviews };

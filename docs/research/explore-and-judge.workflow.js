export const meta = {
  name: 'explore-and-judge',
  description: 'Generic round engine: render a list of candidate marks in parallel, judge them on rendered PIXELS with a 3-lens adversarial panel, and pick a winner autonomously',
  phases: [
    { title: 'Render', detail: 'craft each candidate as a self-contained mark' },
    { title: 'Judge', detail: '3 independent lenses score the rendered pixels' },
    { title: 'Decide', detail: 'director merges the panel and picks a winner + alternates' },
  ],
}

// ---------------------------------------------------------------------------
// INPUT (pass as Workflow `args`):
//   {
//     context:     string  // framing for this round (what the app is, what we're choosing)
//     craftSpec:   string  // what each agent must produce (e.g. "the SYMBOL inside a seal ring, gold on navy, + a calm idle")
//     items:       [{ key, name, direction }]   // the candidates to render (the RUN derives these from its own research)
//     judgeCriteria: string[]                    // axes to score 1-10 (default below)
//     topN:        number                        // how many alternates to keep (default 3)
//   }
// RETURNS: { items: [...withSvg], panel: [3 lens rankings], decision: { winner, alternates, rationale, perItem } }
// ---------------------------------------------------------------------------

async function safe(fn){ try { return await fn(); } catch(e){ log('agent skipped (continuing): ' + (e && e.message ? e.message : String(e))); return null; } }

let A = args;
if (typeof A === 'string') { try { A = JSON.parse(A); } catch (_e) { A = {}; } }
A = (A && typeof A === 'object') ? A : {};
const CTX = A.context || 'The Tower — a premium internship command-center web app styled as a luxury skyscraper. Navy #1A1A2E + gold #C9A84C; Playfair/Satoshi/JetBrains Mono.';
const CRAFT = A.craftSpec || 'Produce the mark as a clean, premium, gold-on-navy SVG (viewBox 0 0 120 120) plus a calm self-contained animated idle.';
const ITEMS = Array.isArray(A.items) ? A.items.filter((i) => i && i.key) : [];
const CRITERIA = (Array.isArray(A.judgeCriteria) && A.judgeCriteria.length) ? A.judgeCriteria
  : ['rootedness', 'ownability', 'premium', 'silhouetteSafe', 'characterizability', 'craft'];
const TOPN = Number(A.topN) > 0 ? Number(A.topN) : 3;

if (!ITEMS.length) { return { error: 'no items provided in args.items', items: [], panel: [], decision: null }; }

const MUST = '\n\nReturn ONLY via the StructuredOutput tool. Keep TIGHT: staticSvg under ~2400 chars, animatedHtml under ~6000 chars, everything inline (no network/CDN). Brevity required.';

const CRAFT_SCHEMA = {
  type: 'object',
  properties: {
    staticSvg: { type: 'string' }, animatedHtml: { type: 'string' },
    name: { type: 'string' }, meaning: { type: 'string' },
    characterization: { type: 'string' }, safety: { type: 'string' },
  },
  required: ['staticSvg', 'name'],
};
const LENS_SCHEMA = {
  type: 'object',
  properties: {
    ranking: { type: 'array', items: { type: 'object', properties: {
      key: { type: 'string' }, scores: { type: 'object', additionalProperties: { type: 'number' } }, verdict: { type: 'string' },
    }, required: ['key'] } },
    flags: { type: 'array', items: { type: 'string' } },
  },
  required: ['ranking'],
};
const DECISION_SCHEMA = {
  type: 'object',
  properties: {
    winner: { type: 'string' }, alternates: { type: 'array', items: { type: 'string' } },
    rationale: { type: 'string' },
    perItem: { type: 'array', items: { type: 'object', properties: {
      key: { type: 'string' }, avgScore: { type: 'number' }, verdict: { type: 'string' },
    }, required: ['key'] } },
  },
  required: ['winner', 'rationale'],
};

// ---- Phase 1: render every candidate in parallel ----
phase('Render');
const rendered = (await pipeline(ITEMS, (item) =>
  safe(() => agent(
    CTX +
    '\n\n=== CANDIDATE TO RENDER ===\nNAME: ' + item.name + '\nDIRECTION: ' + (item.direction || '') +
    '\n\n=== WHAT TO PRODUCE ===\n' + CRAFT +
    '\n\nAlso return: name, meaning (one-line rooting), characterization (one line: how it would carry identity/a soul), and a one-line safety note (reads as intended, no unintended object/anatomy misread).' + MUST,
    { label: 'render:' + item.key, phase: 'Render', schema: CRAFT_SCHEMA }
  )).then((r) => r ? Object.assign({}, item, r) : Object.assign({}, item, { renderFailed: true }))
)).filter(Boolean).filter((c) => c.staticSvg || c.animatedHtml);

if (!rendered.length) { return { error: 'all candidates failed to render', items: [], panel: [], decision: null }; }

// ---- Phase 2: 3-lens adversarial panel, each judges the rendered pixels independently ----
phase('Judge');
const corpus = rendered.map((c) =>
  'CANDIDATE [' + c.key + '] name=' + (c.name || '') + ' meaning=' + (c.meaning || '') +
  '\nSVG:\n' + (c.staticSvg || c.animatedHtml)
).join('\n\n----\n\n');

const LENSES = [
  { id: 'brand', focus: 'BRAND & PREMIUM: which looks most expensive, ownable, and timeless (not gimmicky, not a borrowed/cliche icon, not AI-trope); which best fits luxury game UI x Bloomberg x Apple spatial.' },
  { id: 'legibility', focus: 'LEGIBILITY & SILHOUETTE: render each to PNG and judge the ACTUAL pixels at hero, ~24px, and bare black silhouette; which survives reduction, has a clean ownable silhouette, and carries NO unintended object/anatomy misread or coin/blob collapse.' },
  { id: 'meaning', focus: 'ROOTEDNESS & CHARACTER: which most clearly means THIS app (the internship climb / getting in / the offer / guidance / the Tower) and can best be characterized — carry an eye/posture/calm idle and a soul.' },
];
const panel = (await parallel(LENSES.map((lens) => () =>
  safe(() => agent(
    'You are an art-direction judge. Lens: ' + lens.focus +
    '\n\nFor EACH candidate, WRITE its SVG to a file and RENDER to PNG via headless Chrome ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --window-size=240,240 --screenshot=out.png file.html), and judge the ACTUAL pixels at hero, ~24px, and bare silhouette. Score 1-10 on: ' + CRITERIA.join(', ') +
    '. Give a per-candidate verdict from YOUR lens, and flag any silhouette/object misreads. ' + CTX + '\n\n' + corpus + MUST,
    { label: 'judge:' + lens.id, phase: 'Judge', schema: LENS_SCHEMA }
  ))
))).filter(Boolean);

// ---- Phase 3: director merges the panel and decides ----
phase('Decide');
const panelDigest = panel.map((p, i) =>
  'LENS ' + (LENSES[i] ? LENSES[i].id : i) + ':\n' +
  (p.ranking || []).map((r) => '  [' + r.key + '] ' + Object.entries(r.scores || {}).map(([k, v]) => k + '=' + v).join(' ') + ' — ' + (r.verdict || '')).join('\n') +
  ((p.flags && p.flags.length) ? '\n  FLAGS: ' + p.flags.join(' | ') : '')
).join('\n\n');

const decision = await safe(() => agent(
  'You are the creative director making the FINAL autonomous pick for this round (the founder is unavailable — you must decide and justify). Merge the 3-lens panel below, average the scores, weight silhouette-safety and rootedness heavily (a mark that fails the silhouette/object test cannot win, however pretty). Pick ONE winner and up to ' + TOPN + ' alternates, with a clear rationale a designer could defend. ' + CTX +
  '\n\n=== PANEL ===\n' + panelDigest +
  '\n\nCandidates available: ' + rendered.map((c) => c.key).join(', ') +
  '\n\nReturn winner (key), alternates (keys), rationale, and perItem (key, avgScore, one-line verdict).' + MUST,
  { label: 'director', phase: 'Decide', schema: DECISION_SCHEMA }
));

return { items: rendered, panel, decision };

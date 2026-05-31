export const meta = {
  name: 'tower-identity-research',
  description: 'Massive parallel research sweep into EVERYTHING relevant to designing The Tower\'s visual identity — ~220 agents across 20 domains, synthesized into a research compendium to design from',
  phases: [
    { title: 'Probe', detail: '~200 research agents — every angle of every domain, in parallel' },
    { title: 'Synthesize', detail: 'one synthesizer per domain distils its findings' },
    { title: 'Compendium', detail: 'cross-cut synthesis → a single research report to design from' },
  ],
}

async function safe(fn){ try { return await fn(); } catch(e){ log('agent skipped (continuing): ' + (e && e.message ? e.message : String(e))); return null; } }

const TOWER = "PROJECT: 'The Tower' — a PREMIUM internship command-center web app for a stressed CS-senior job-seeker (find/track/apply/LAND internships). Its UI is a LUXURY SKYSCRAPER you enter: floors=features, elevator=nav, windows=skyline. Aesthetic: luxury game UI x Bloomberg Terminal x Apple spatial. Navy #1A1A2E + gold #C9A84C + cream #F5F1E8; Playfair Display / Satoshi / JetBrains Mono. GOAL of this research: gather EVERYTHING needed to design the Tower's core visual identity — one ownable SYMBOL that can be 'characterized' (given identity + a calm idle/a soul, in the spirit of the animated Claude icon or a Pixar Luxo lamp), premium, legible at 24px grayscale, silhouette-safe, ownable.";

const RESEARCH_RULES = "Research DEEPLY: lean on your design expertise AND use web search (load WebSearch / WebFetch via ToolSearch if available) to find current 2024–2026 examples, named references, and concrete techniques. Be specific and evidence-led — name real brands, tools, methods, numbers. NO fluff.";

const MUST_LEAF = "\n\nReturn ONLY via the StructuredOutput tool. Keep it TIGHT: keyFindings = 3–6 sharp bullets (<~22 words each), examples = up to 5 named real references, towerImplication = 1–2 sentences on what this means specifically for The Tower's mark, sources = a few names/URLs. Brevity required.";

const LEAF_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    keyFindings: { type: 'array', items: { type: 'string' } },
    examples: { type: 'array', items: { type: 'string' } },
    towerImplication: { type: 'string' },
    sources: { type: 'array', items: { type: 'string' } },
  },
  required: ['keyFindings', 'towerImplication'],
};

const DOMAIN_SCHEMA = {
  type: 'object',
  properties: {
    domain: { type: 'string' },
    summary: { type: 'string' },
    principles: { type: 'array', items: { type: 'string' } },
    patterns: { type: 'array', items: { type: 'string' } },
    opportunities: { type: 'array', items: { type: 'string' } },
    pitfalls: { type: 'array', items: { type: 'string' } },
    bestExamples: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'principles', 'opportunities', 'pitfalls'],
};

const DOMAINS = [
  { key:'icon-principles', title:'Iconography & Mark Construction', questions:[
    'Grid systems & optical balance in logo/mark construction','Silhouette-first design and why the bare outline is decisive','Negative-space technique in marks (hidden forms, figure-ground)','Geometric construction: circles, golden ratio, modular grids','Reduction & simplification — distilling an idea to its essence','Gestalt principles (closure, continuity, figure-ground) in icons','Keeping a single-glyph mark legible from hero size to 16–24px','Anatomy of the best single-glyph app marks and why they work','Stroke weight & contrast tuning at small sizes','Validation methods: squint, flip, blur, grayscale, 1-bit tests'] },
  { key:'semiotics', title:'Semiotics, Archetypes & Meaning of Shapes', questions:[
    'Psychological connotations of basic shapes (circle/triangle/upward forms)','The ascent/climb metaphor across cultures, brands, and history','Door / threshold / gateway symbolism (crossing into opportunity)','Key & unlock symbolism (and its visual cliches)','Star & celestial symbolism — power vs overuse','Summit / peak / mountain symbolism in identity','Cross-cultural pitfalls & unintended meanings of symbols','Hero-journey archetypes (the guide, the threshold, the ascent) for a job hunt','Symbols of achievement, arrival, and initiation','Abstract vs literal symbols — how each carries meaning'] },
  { key:'brand-systems', title:'Brand Identity Systems & Flexible Marks', questions:[
    'Responsive / adaptive logo systems (scale & context variants)','Design-token-driven identity systems','How one mark flexes across many sections/floors of a product','Building a sub-brand family from one parent mark','Framing/container devices (rings, badges, crests, lockups)','Structure of a modern brand guideline','Consistency vs deliberate variation within a system','Case studies of strongly-systemized marks','Marks that adapt to dark/light and ambient context','Evolving / versioning a mark over a product\'s life'] },
  { key:'animated-marks', title:'Living / Animated Brand Marks', questions:[
    'The animated Claude icon — construction, motion, and what makes it feel alive','Other living logos (Google, Mailchimp, AI assistants) — techniques','Idle vs reactive states in a brand mark','Loading / thinking states expressed as identity','Conveying personality through motion without a face','Lottie vs Rive vs hand-coded motion for living marks','Choreography & timing of premium brand motion','Restraint — how premium brands keep motion calm','State machines for mark behavior (idle/hover/active/notify)','Emotional read of motion: calm vs eager vs alert'] },
  { key:'character-design', title:'Characterizing Objects & Giving a Mark a Soul', questions:[
    'Pixar Luxo lamp: emotion via posture & motion, no face','Tasteful anthropomorphism of objects (premium, not kiddie)','Neoteny / baby-schema — cuteness without childishness','The single-eye / gaze technique for instant life','Line-of-action & posture as personality','Mascots that read genuinely premium','How minimal can a "character" be and still have a soul','The line between an icon and a character','Idle breathing / blink / micro-motion as life','Balancing identity/soul with abstraction & restraint'] },
  { key:'art-styles', title:'Art Styles & Visual Treatments', questions:[
    'Flat / minimal vector identity','Art Deco geometry & luxury heritage','Engraved / intaglio / guilloche (currency & seal aesthetics)','Glassmorphism in marks','Neumorphism / soft-emboss','Holographic / iridescent foil treatments','Realistic metallic / gold rendering','Monoline / continuous-line marks','Isometric / 2.5D marks','Textured / grain / risograph — when premium, when not'] },
  { key:'rendering-tech', title:'Web Rendering Tech for Marks', questions:[
    'SVG: capabilities & limits for an identity mark','SVG filters (feSpecularLighting, feTurbulence, feDisplacementMap) for material','CSS-only marks (clip-path, conic/radial gradients, masks)','Canvas 2D for generative & animated marks','WebGL / GLSL shaders for marks (glow, metal, refraction)','WebGPU — readiness and identity use today','Rive — state machines, runtime, bundle cost, brand motion','Lottie / After-Effects pipeline trade-offs','Performance, bundle size & accessibility per technology','Decision matrix: which tech for which effect & constraint'] },
  { key:'architecture', title:'Towers, Skyscrapers & Architectural Marks', questions:[
    'Art Deco skyscraper language: setbacks, spires, verticality','Famous building / skyline logos and how they abstract','Abstracting a building into a mark without cliche','The spire / beacon / lantern motif','Verticality & "rising" energy in architectural marks','Ornament & craft in Deco (Chrysler, Empire State, Rockefeller)','Avoiding the generic-skyscraper look','Light & lit windows as identity elements','Monolith vs detailed tower silhouettes','Architecture as a premium / institutional signal'] },
  { key:'career-landscape', title:'Job-Search / Career Product Identities', questions:[
    'LinkedIn, Handshake, Indeed, Glassdoor — mark analysis','Symbols the career/recruiting space already owns (to avoid rhyming)','How these brands feel: trust vs aspiration','Student / early-career product aesthetics','The emotional state of a job-seeker and what reassures them','Gamified career / progress products','What "premium" looks like in this category (it is rare)','Application-tracker / ATS tool aesthetics','Whitespace & differentiation opportunities in the space','Tone: signaling ambition while relieving anxiety'] },
  { key:'luxury', title:'Luxury & Premium Visual Cues', questions:[
    'What visual cues actually signal luxury / premium','Luxury hospitality identity (grand hotels)','Watchmaking & jewelry mark craft','Luxury fintech (Amex, private banking) visual cues','Restraint, whitespace & confidence as luxury','Gold usage in luxury branding done right','Implying material & tactility in a flat 2D mark','Typography\'s role in a premium feel','The line between premium and gaudy','Quiet luxury vs ornate luxury — when each fits'] },
  { key:'gold-light', title:'Gold, Color & Light on Dark', questions:[
    'Rendering believable gold in 2D (gradient ramps, highlights)','Gold gradient stops & temperature for richness','Gold on deep navy — contrast, glow, separation','Specular highlights & sheen techniques in vector/canvas','Metallic foil vs matte gold','Avoiding flat / cheap-looking gold','Ambient light & day/night on a gold mark','Accessibility & contrast of gold on dark','Bloom / glow without muddy haze','Accent colors that coexist with navy + gold'] },
  { key:'typography', title:'Typography, Logotype & Monogram', questions:[
    'Playfair Display character and what it pairs with','Logotype design with serif display faces','The letter T as a tower / monogram','Integrating a mark with a wordmark (lockup systems)','Numerals & data type (JetBrains Mono) in identity','Custom letterforms & ligatures for ownership','Balancing a display serif with a geometric mark','Vertical / architectural type treatments','Optical spacing & kerning for marks and lockups','When a wordmark alone is enough'] },
  { key:'small-size', title:'Favicon, App-Icon & Small-Size Behavior', questions:[
    'Designing for 16 / 24 / 32px legibility','Grayscale & 1-bit silhouette testing','Simplification ladders: hero → favicon variants','App-icon conventions (iOS, Android, macOS)','Maskable icons & safe areas','What survives reduction and what dies','Pixel-snapping & hinting for tiny marks','A repeatable small-size testing methodology','Common small-size failure modes','The squint test in practice'] },
  { key:'motion-grammar', title:'Motion Design & Micro-Interaction Grammar', questions:[
    'Easing curves and their emotional feel','Idle / ambient motion best practices','Hover / active / loading / notify state choreography','Spring vs tween vs keyframe motion','Calm, Apple-spatial motion principles','Motion duration & restraint for premium feel','prefers-reduced-motion patterns done well','Orchestrating multi-element motion gracefully','Signature motion as a piece of identity','Avoiding motion sickness & over-animation'] },
  { key:'spatial-game-ui', title:'Game UI, Spatial & Terminal Aesthetics', questions:[
    'Luxury game menu / UI design language','Bloomberg Terminal aesthetic & high-density data beauty','Apple visionOS / spatial design language','Immersive "enter a world" UI patterns','Depth, glass & parallax in premium UI','HUD & diegetic UI ideas','Spatial navigation metaphors (elevator, floors, doors)','Ambient world-building inside a UI','Balancing immersion with usability','Identity references from AAA game branding'] },
  { key:'day-night', title:'Day/Night Cycles & Ambient Identity', questions:[
    'Identities & UIs that respond to time of day','Ambient / generative brand systems','A mark\'s appearance under changing light','Night-mode vs day-mode mark treatments','Subtlety — ambient change that feels alive not gimmicky','Time-aware / circadian UI examples','Window-light & skyline ambient motifs','Performance of ambient / always-running systems','The emotional arc of a day inside a product','Making ambience reinforce, not distract'] },
  { key:'competitive-ai', title:'AI & Productivity Tool Identities (avoid rhyming)', questions:[
    'How AI tools (Claude, OpenAI, Gemini, etc.) brand themselves','The starburst / spark trope and its saturation','Productivity tool marks (Notion, Linear, Raycast, etc.)','What is overused in 2024–2026 tech identity','Differentiating from AI-cliche visuals','Minimal vs expressive in current tech branding','Abstract geometric mark trends right now','Gradient fatigue and what replaced it','What reads dated vs timeless in tech marks','Whitespace / opportunity to stand out in this category'] },
  { key:'accessibility', title:'Accessibility & Inclusive Identity', questions:[
    'Contrast ratios for marks and adjacent text','Colorblind-safe checks for navy + gold','Reduced-motion-compliant animated identity','Legibility for low vision','ARIA / semantics: decorative vs meaningful marks','Cultural inclusivity of chosen symbols','Never relying on color alone to carry meaning','Testing tools & methods for accessible identity','Accessible animation guidelines','Identity that degrades gracefully across contexts'] },
  { key:'craft', title:'Bezier Craft & Production Quality', questions:[
    'Smooth bezier/arc construction vs polyline "wonky/Desmos" look','Curvature continuity & tangent handling','Optical corrections (overshoot, balancing, alignment)','SVG path optimization & cleanliness','Resolution-independence & crispness','Gradient & filter craft inside SVG','Amateur tells in vector marks (and how to avoid them)','Tooling best practices (Figma, Illustrator) for marks','Exporting clean, production-grade SVG','A QA checklist for a finished mark'] },
  { key:'narrative', title:'Naming, Story & Brand Narrative', questions:[
    'Naming a mark or characterized symbol','The narrative of "entering the Tower"','How story reinforces and deepens a symbol','Tagline & mark synergy','The user\'s emotional journey as brand narrative','Metaphor consistency across all touchpoints','Onboarding users to the building metaphor','Mascot / character naming conventions','Avoiding over-explaining a mark','A story that scales as the product grows'] },
];

// ---- Phase 1+2: probe every angle of every domain, then synthesize each domain ----
phase('Probe');
const domainSyntheses = await pipeline(
  DOMAINS,
  // stage 1 — fan out every question of this domain in parallel (barrier within the domain)
  (domain) => parallel(domain.questions.map((q) => () =>
    safe(() => agent(
      TOWER + "\n\n" + RESEARCH_RULES +
      "\n\nDOMAIN: " + domain.title +
      "\nRESEARCH QUESTION: " + q +
      "\n\nResearch this question thoroughly and report findings." + MUST_LEAF,
      { label: 'probe:' + domain.key + ':' + q.slice(0, 28), phase: 'Probe', schema: LEAF_SCHEMA }
    )).then((r) => r ? Object.assign({ question: q }, r) : null)
  )).then((findings) => ({ domain, findings: findings.filter(Boolean) })),
  // stage 2 — synthesize this domain from its findings (no barrier across domains)
  (probed) => {
    const { domain, findings } = probed;
    if (!findings.length) return null;
    const corpus = findings.map((f) =>
      "Q: " + (f.question || '') +
      "\n- " + (f.keyFindings || []).join("\n- ") +
      (f.examples && f.examples.length ? "\nex: " + f.examples.join('; ') : '') +
      (f.towerImplication ? "\n=> Tower: " + f.towerImplication : '')
    ).join("\n\n");
    return safe(() => agent(
      TOWER +
      "\n\nYou are the lead synthesizer for the research DOMAIN: " + domain.title +
      ". Below are the raw findings from ~" + findings.length + " parallel research probes. Distil them into a sharp, decision-ready synthesis FOR DESIGNING THE TOWER'S MARK: the durable principles, the recurring patterns, the concrete OPPORTUNITIES for the Tower, the PITFALLS to avoid, and the best named examples to study. Be specific and opinionated; cut anything generic.\n\n=== FINDINGS ===\n" + corpus +
      "\n\nReturn ONLY via StructuredOutput. summary = 3–5 sentences; each array = 3–8 tight bullets. Brevity required.",
      { label: 'synth:' + domain.key, phase: 'Synthesize', schema: DOMAIN_SCHEMA }
    )).then((r) => r ? Object.assign({ key: domain.key, title: domain.title }, r) : null);
  }
);

const goodDomains = domainSyntheses.filter(Boolean);
log('Synthesized ' + goodDomains.length + '/' + DOMAINS.length + ' domains.');

// ---- Phase 3: cross-cut synthesis → a single compendium to design from ----
phase('Compendium');
const digest = goodDomains.map((d) =>
  "## " + d.title + "\n" + (d.summary || '') +
  "\nPRINCIPLES: " + (d.principles || []).join(' | ') +
  "\nPATTERNS: " + (d.patterns || []).join(' | ') +
  "\nOPPORTUNITIES: " + (d.opportunities || []).join(' | ') +
  "\nPITFALLS: " + (d.pitfalls || []).join(' | ') +
  "\nSTUDY: " + (d.bestExamples || []).join(' | ')
).join("\n\n");

const compendium = await safe(() => agent(
  TOWER +
  "\n\nYou are the research director. Below are synthesized findings across " + goodDomains.length +
  " research domains (each itself distilled from ~10 parallel probes). Write a single, comprehensive RESEARCH COMPENDIUM in Markdown that a designer will use as the foundation to design The Tower's visual identity from scratch. Structure it:\n" +
  "1. Executive summary — the 8–12 most important truths for this specific project.\n" +
  "2. Per-theme insight — the sharpest takeaways, organized into a coherent narrative (group the 20 domains into logical themes).\n" +
  "3. Constraints & non-negotiables that fall out of the research.\n" +
  "4. Pitfalls & cliches to avoid (and why), with named examples.\n" +
  "5. Tech & craft guidance (rendering tech trade-offs, small-size behaviour, motion).\n" +
  "6. The DESIGN OPPORTUNITY SPACE — frame the open decisions as dimensions/options to explore (e.g. abstract vs literal, symbol vs character, tech choice, art-style families). Be NEUTRAL and generative here: map the possibility space and the trade-offs, do NOT pick the final answer — the designer decides.\n" +
  "Be concrete, cite named references, and keep it dense and useful. This is the single most valuable artifact of the whole research effort.\n\n=== DOMAIN SYNTHESES ===\n" + digest,
  { label: 'compendium', phase: 'Compendium' }
));

return { domains: goodDomains, domainCount: goodDomains.length, compendium };

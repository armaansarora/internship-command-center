export const meta = {
  name: 'tower-identity-research-fill',
  description: 'Lean recovery sweep — one dense synthesis agent per research domain the main ~220-agent run did not complete (rate-limited). Low concurrency to dodge the rate-limit wall.',
  phases: [
    { title: 'Fill', detail: 'one domain-synthesis agent per under-covered domain' },
  ],
}

async function safe(fn){ try { return await fn(); } catch(e){ log('agent skipped (continuing): ' + (e && e.message ? e.message : String(e))); return null; } }

const TOWER = "PROJECT: 'The Tower' — a PREMIUM internship command-center web app for a stressed CS-senior job-seeker (find/track/apply/LAND internships). Its UI is a LUXURY SKYSCRAPER you enter: floors=features, elevator=nav, windows=skyline. Aesthetic: luxury game UI x Bloomberg Terminal x Apple spatial. Navy #1A1A2E + gold #C9A84C + cream #F5F1E8; Playfair Display / Satoshi / JetBrains Mono. GOAL: design the Tower's core visual identity — one ownable SYMBOL that can be 'characterized' (given identity + a calm idle/a soul, in the spirit of the animated Claude icon or a Pixar Luxo lamp), premium, legible at 24px grayscale, silhouette-safe, ownable.";

const RULES = "Research DEEPLY using your design expertise (and WebSearch/WebFetch via ToolSearch if available for current 2024-2026 named examples). Be specific and evidence-led — name real brands, tools, methods, numbers. NO fluff. This is the lead synthesis for the whole domain.";

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

const GAP_DOMAINS = [
  { key:'art-styles', title:'Art Styles & Visual Treatments', angles:'flat/minimal vector; Art Deco geometry & luxury heritage; engraved/intaglio/guilloche (currency & seal aesthetics); glassmorphism; neumorphism/soft-emboss; holographic/iridescent foil; realistic metallic/gold; monoline/continuous-line; isometric/2.5D; textured/grain/risograph — which read PREMIUM on navy and which read cheap.' },
  { key:'rendering-tech', title:'Web Rendering Tech for Marks', angles:'SVG capabilities & limits; SVG filters (feSpecularLighting/feTurbulence/feDisplacementMap) for material; CSS-only (clip-path, conic/radial gradients, masks); Canvas 2D; WebGL/GLSL; WebGPU readiness; Rive vs Lottie vs hand-coded; performance/bundle/accessibility; a decision matrix of which tech for which effect under a "ship it, accessible, performant" constraint.' },
  { key:'architecture', title:'Towers, Skyscrapers & Architectural Marks', angles:'Art Deco skyscraper language (setbacks, spire, verticality); famous building/skyline logos and how they abstract; abstracting a building without cliche; spire/beacon/lantern motif; verticality & rising energy; ornament & craft (Chrysler, Empire State, Rockefeller); avoiding the generic-skyscraper look; lit windows as identity; monolith vs detailed silhouettes; architecture as an institutional/premium signal.' },
  { key:'career-landscape', title:'Job-Search / Career Product Identities', angles:'LinkedIn/Handshake/Indeed/Glassdoor mark analysis; symbols the career/recruiting space already OWNS (to avoid rhyming); trust vs aspiration; student/early-career aesthetics; the emotional state of an anxious job-seeker and what reassures; gamified career products; what "premium" looks like here (rare); ATS/tracker aesthetics; whitespace/differentiation; signaling ambition while relieving anxiety.' },
  { key:'gold-light', title:'Gold, Color & Light on Dark', angles:'rendering believable gold in 2D (gradient ramps, stops, temperature); gold on deep navy (contrast, glow, separation); specular highlights/sheen in vector/canvas; metallic foil vs matte; avoiding flat/cheap gold; ambient day/night on a gold mark; accessibility/contrast of gold on dark; bloom/glow without muddy haze; accent colors that coexist with navy+gold.' },
  { key:'typography', title:'Typography, Logotype & Monogram', angles:'Playfair Display character & what it pairs with; logotype with serif display; the letter T as a tower/monogram; mark+wordmark lockup systems; numerals/JetBrains Mono in identity; custom letterforms/ligatures for ownership; balancing a display serif with a geometric mark; vertical/architectural type; optical spacing/kerning; when a wordmark alone is enough.' },
  { key:'small-size', title:'Favicon, App-Icon & Small-Size Behavior', angles:'16/24/32px legibility; grayscale & 1-bit silhouette testing; simplification ladders hero->favicon; app-icon conventions (iOS/Android/macOS); maskable icons & safe areas; what survives reduction and what dies; pixel-snapping/hinting; a repeatable small-size testing methodology; common failure modes; the squint test in practice.' },
  { key:'motion-grammar', title:'Motion Design & Micro-Interaction Grammar', angles:'easing curves & their emotional feel; idle/ambient motion best practices; hover/active/loading/notify state choreography; spring vs tween vs keyframe; calm Apple-spatial motion; duration & restraint for premium feel; prefers-reduced-motion patterns done well; orchestrating multi-element motion; signature motion as identity; avoiding motion sickness & over-animation. Define a clean 4-state grammar (idle/hover/active/notify).' },
  { key:'spatial-game-ui', title:'Game UI, Spatial & Terminal Aesthetics', angles:'luxury game menu/UI language; Bloomberg Terminal aesthetic & dense-data beauty; Apple visionOS/spatial language; immersive "enter a world" patterns; depth/glass/parallax in premium UI; HUD/diegetic ideas; spatial nav metaphors (elevator/floors/doors); ambient world-building; immersion vs usability; identity refs from AAA game branding.' },
  { key:'competitive-ai', title:'AI & Productivity Tool Identities (avoid rhyming)', angles:'how AI tools (Claude, OpenAI, Gemini, Perplexity) brand themselves; the starburst/spark trope and its saturation; productivity marks (Notion, Linear, Raycast, Vercel); what is overused in 2024-2026 tech identity; differentiating from AI-cliche; minimal vs expressive now; abstract-geometric trends; gradient fatigue and what replaced it; dated vs timeless; the whitespace to stand out.' },
  { key:'accessibility', title:'Accessibility & Inclusive Identity', angles:'contrast ratios for marks and adjacent text; colorblind-safe checks for navy+gold; reduced-motion-compliant animated identity; legibility for low vision; ARIA semantics decorative vs meaningful; cultural inclusivity of chosen symbols; never relying on color alone; testing tools/methods; accessible animation guidelines; identity that degrades gracefully.' },
  { key:'craft', title:'Bezier Craft & Production Quality', angles:'smooth bezier/arc construction vs polyline "wonky/Desmos" look; curvature continuity & tangent handling; optical corrections (overshoot, balancing, alignment); SVG path optimization & cleanliness; resolution-independence & crispness; gradient/filter craft inside SVG; amateur tells in vector marks and how to avoid them; tooling best practices; exporting clean production-grade SVG; a QA checklist for a finished mark.' },
  { key:'narrative', title:'Naming, Story & Brand Narrative', angles:'naming a mark or characterized symbol; the narrative of "entering the Tower"; how story reinforces a symbol; tagline & mark synergy; the user emotional journey as brand narrative; metaphor consistency across touchpoints; onboarding to the building metaphor; mascot/character naming conventions; avoiding over-explaining a mark; a story that scales as the product grows.' },
];

phase('Fill');
const syntheses = (await pipeline(GAP_DOMAINS, (d) =>
  safe(() => agent(
    TOWER + "\n\n" + RULES +
    "\n\nYou are the LEAD SYNTHESIZER for the research DOMAIN: " + d.title +
    ".\nCover these angles: " + d.angles +
    "\n\nProduce a sharp, decision-ready synthesis FOR DESIGNING THE TOWER'S MARK: durable principles, recurring patterns, concrete OPPORTUNITIES for the Tower, PITFALLS to avoid, and best NAMED examples to study. Be specific and opinionated; cut anything generic." +
    "\n\nReturn ONLY via StructuredOutput. summary = 3-5 sentences; principles/patterns/opportunities/pitfalls = 4-8 tight bullets each; bestExamples = up to 6 named references. Brevity required.",
    { label: 'fill:' + d.key, phase: 'Fill', schema: DOMAIN_SCHEMA }
  )).then((r) => r ? Object.assign({ key: d.key, title: d.title }, r) : null)
)).filter(Boolean);

log('Filled ' + syntheses.length + '/' + GAP_DOMAINS.length + ' gap domains.');
return { syntheses, filledCount: syntheses.length };

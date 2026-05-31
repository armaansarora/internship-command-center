#!/usr/bin/env python3
"""Generate docs/glyph-autopilot-review.html — the founder's one-page review:
the animated winner + every runner-up at each decision, with scores and proofs."""
import json, os, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # docs/
REN = os.path.join(ROOT, "research", "_renders")

def load(p):
    with open(os.path.join(ROOT, "research", p)) as f:
        return json.load(f)

p1 = load("_phase1.json")
p2 = load("_phase2.json")

def svg_of(prefix, key):
    fp = os.path.join(REN, f"{prefix}-{key}.svg")
    if os.path.exists(fp):
        return open(fp).read()
    return '<svg viewBox="0 0 120 120"><rect width="120" height="120" rx="26" fill="#222"/></svg>'

def score_map(phase):
    d = phase.get("decision") or {}
    m = {}
    for r in (d.get("perItem") or []):
        m[r.get("key")] = (r.get("avgScore"), r.get("verdict", ""))
    return m, d.get("winner"), (d.get("alternates") or [])

def cards(phase, prefix, chosen_key, chosen_note, panel_pick_note=None):
    m, panel_winner, alts = score_map(phase)
    items = phase.get("items") or []
    # order by score desc
    items = sorted(items, key=lambda it: -((m.get(it.get("key")) or (0,))[0] or 0))
    out = []
    for it in items:
        k = it.get("key"); name = it.get("name", k)
        sc, verdict = m.get(k, (None, ""))
        badges = ""
        if k == chosen_key:
            badges += '<span class="badge win">CHOSEN</span>'
        if k == panel_winner and k != chosen_key:
            badges += '<span class="badge panel">PANEL PICK</span>'
        elif k in alts and k != chosen_key:
            badges += '<span class="badge alt">runner-up</span>'
        if "control" in (it.get("name","").lower()) or "(control)" in (it.get("name","").lower()):
            badges += '<span class="badge ctrl">control</span>'
        meaning = it.get("meaning") or ""
        out.append(f'''
        <figure class="card{' chosen' if k==chosen_key else ''}">
          <div class="mk">{svg_of(prefix, k)}</div>
          <figcaption>
            <div class="cn">{html.escape(name)} {badges}</div>
            <div class="sc">{('%.1f'%sc) if sc is not None else '—'}</div>
            <div class="vd">{html.escape((verdict or meaning)[:150])}</div>
          </figcaption>
        </figure>''')
    return "\n".join(out)

# Animated winner SVG (the canonical idle), inlined.
WINNER_SVG = '''
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Tower keystone">
  <rect width="120" height="120" rx="26" fill="#1A1A2E"/>
  <path fill="#C9A84C" fill-rule="evenodd" d="M43.7 25.6Q44.1 23.4 46.4 23.4L73.6 23.4Q75.9 23.4 76.3 25.6L95.9 91.2Q96.6 93.6 94.1 93.6L70.8 93.6Q70.8 73 70.6 70.4Q69.6 56.4 60 56.4Q50.4 56.4 49.4 70.4Q49.2 73 49.2 93.6L25.9 93.6Q23.4 93.6 24.1 91.2Z"/>
  <path class="soul" fill="#F5F1E8" d="M60 63.4Q65.2 64 65.2 75.6L65.2 93.6L54.8 93.6L54.8 75.6Q54.8 64 60 63.4Z"/>
</svg>'''

p1_cards = cards(p1, "p1", "keystone", "")
p2_cards = cards(p2, "p2", "negative-cut", "")

DOC = f'''<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Tower — Identity Autopilot · Review</title>
<style>
  :root{{--navy:#1A1A2E;--gold:#C9A84C;--cream:#F5F1E8}}
  *{{box-sizing:border-box}}
  html,body{{margin:0;background:radial-gradient(120% 90% at 50% -10%,#20203a,#1A1A2E 55%,#121225);color:var(--cream);
    font-family:ui-sans-serif,system-ui,sans-serif}}
  .wrap{{max-width:1080px;margin:0 auto;padding:56px 24px 120px}}
  .mono{{font-family:ui-monospace,SFMono-Regular,monospace;letter-spacing:.06em}}
  .eyebrow{{font-family:ui-monospace,monospace;font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold)}}
  h1{{font-family:Georgia,"Times New Roman",serif;font-weight:700;font-size:clamp(40px,7vw,68px);margin:10px 0 8px;line-height:1.02}}
  h2{{font-family:Georgia,serif;font-weight:600;font-size:clamp(22px,3vw,30px);margin:0 0 4px}}
  p.sub{{color:#A9AEC4;font-size:15px;line-height:1.65;max-width:680px}}
  section{{margin-top:64px}}
  .hero{{display:flex;gap:40px;align-items:center;flex-wrap:wrap}}
  .hero .mk{{width:160px;height:160px}}
  .soul{{transform-box:fill-box;transform-origin:50% 100%;animation:breathe 7s cubic-bezier(.45,0,.55,1) infinite}}
  @keyframes breathe{{0%,100%{{opacity:.5;transform:scaleY(.9)}}50%{{opacity:.95;transform:scaleY(1)}}}}
  @media (prefers-reduced-motion:reduce){{.soul{{animation:none;opacity:.7}}}}
  .grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin-top:22px}}
  .card{{background:rgba(28,28,48,.5);border:1px solid rgba(201,168,76,.16);border-radius:16px;padding:16px;margin:0;
    display:flex;flex-direction:column;gap:10px}}
  .card.chosen{{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold),0 8px 40px rgba(201,168,76,.12)}}
  .mk{{width:84px;height:84px}}
  .mk svg{{width:100%;height:100%;display:block}}
  .cn{{font-size:13px;font-weight:600;display:flex;gap:6px;align-items:center;flex-wrap:wrap}}
  .sc{{font-family:ui-monospace,monospace;font-size:22px;color:var(--gold)}}
  .vd{{font-size:12px;color:#9aa0b6;line-height:1.5}}
  .badge{{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;
    padding:2px 6px;border-radius:999px;border:1px solid}}
  .badge.win{{background:var(--gold);color:var(--navy);border-color:var(--gold)}}
  .badge.panel{{color:#cdb;border-color:#5a6}}
  .badge.alt{{color:#bcd;border-color:#46a}}
  .badge.ctrl{{color:#a88;border-color:#744}}
  .proof{{width:100%;border-radius:14px;border:1px solid rgba(201,168,76,.16);margin-top:16px;display:block}}
  .note{{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.25);border-radius:14px;padding:16px 20px;
    font-size:14px;line-height:1.6;color:#cdd}}
  a{{color:var(--gold)}}
  code{{font-family:ui-monospace,monospace;color:var(--gold)}}
  footer{{margin-top:72px;font-family:ui-monospace,monospace;font-size:12px;color:#8a90a6;line-height:2}}
</style></head><body><div class="wrap">

  <header class="hero">
    <div class="mk">{WINNER_SVG}</div>
    <div>
      <p class="eyebrow">The Tower · Identity Autopilot · Review</p>
      <h1>The Keystone</h1>
      <p class="sub">The cap-stone of the internship climb — a matte-gold Art-Deco keystone with a lit
      passage you enter, and one cream light that breathes (the soul). Chosen overnight by research →
      three pixel-judged adversarial panels → a motion study. Live behind
      <a href="../src/app/lobby-pilot/page.tsx"><code>/lobby-pilot</code></a>; nothing on main touched.</p>
    </div>
  </header>

  <section>
    <div class="note"><b>How it was decided.</b> ~220-agent research compendium
    (<code>docs/research/IDENTITY-RESEARCH.md</code>) → Phase 1 chose the <b>symbol</b> from 16 candidates →
    Phase 2 chose the <b>look + tech</b> from 14 treatments → Phase 3 chose the <b>motion/soul</b> from a
    filmstrip study. Every option was rendered to real pixels and judged at hero, 24px, and bare silhouette
    by a 3-lens panel; the founder's taste call is recorded where I overrode the panel. Full trail:
    <code>docs/MORNING-REVIEW.md</code> · spec: <code>docs/MARK-SPEC.md</code>.</div>
  </section>

  <section>
    <p class="eyebrow">Phase 1 · the symbol</p>
    <h2>16 candidates → The Keystone</h2>
    <p class="sub">The panel's raw winner was <code>keyhole-tower</code> (silhouette-strongest), but it reads
    as an unmistakable <b>keyhole = security/login app</b> — a rootedness failure for an internship product.
    I overrode to <code>keystone</code> (highest rootedness, architectural, no object misread). The panel's
    pixel-judging correctly killed the weak ideas and the cliché controls.</p>
    <div class="grid">{p1_cards}</div>
  </section>

  <section>
    <p class="eyebrow">Phase 2 · look + tech</p>
    <h2>14 treatments → Negative-cut</h2>
    <p class="sub">The winner makes the doorway a <b>true negative-space cut</b> (survives bare silhouette)
    with a cream light-pillar as the soul. Tech: inline SVG, no filters at rest, gradient/halo reserved for
    the active state. The research-predicted "cheap on navy" controls (glass, holographic, soft-emboss) all
    lost on the pixels.</p>
    <div class="grid">{p2_cards}</div>
  </section>

  <section>
    <p class="eyebrow">Phase 3 · motion / soul</p>
    <h2>The light breathes — the body stays still</h2>
    <p class="sub">Three idle characters, each shown at low/mid/high phase so the motion range is visible.
    Chosen: <b>Breathe</b> (calmest, silhouette-stable). The gold body never moves; all life is in the light.</p>
    <img class="proof" src="research/_renders/motion-study.png" alt="Motion study: three idle characters at low/mid/high phase">
  </section>

  <section>
    <p class="eyebrow">The ship-gate</p>
    <h2>Reads at 24px, in grayscale</h2>
    <p class="sub">The locked mark at hero / favicon-24 / 24→120 / grayscale / silhouette — the founder's
    eyeball test for the favicon.</p>
    <img class="proof" src="research/_renders/mark-final-proof.png" alt="The mark at hero, 24px, grayscale, and silhouette">
    <img class="proof" src="research/_renders/favicon-proof.png" alt="Shipped favicon assets at 16/32px native and grayscale">
  </section>

  <footer>
    Live pilot: <code>/lobby-pilot</code> &nbsp;·&nbsp; Spec: <code>docs/MARK-SPEC.md</code> &nbsp;·&nbsp;
    Decisions + override instructions: <code>docs/MORNING-REVIEW.md</code><br>
    Additive · branch <code>identity/autopilot</code> · not merged, not pushed.
  </footer>

</div></body></html>'''

with open(os.path.join(ROOT, "glyph-autopilot-review.html"), "w") as f:
    f.write(DOC)
print("wrote docs/glyph-autopilot-review.html", len(DOC), "bytes")

# Otis v2 Material Simplifier Prompt Packet

Lane: wave-01-agent-05  
Strategy: Material Simplifier / Wide Divergence  
Intended generator: GPT Image 2  
Approval state: exploratory lane artifact, not approved for app

## Strongest Direction

Build Otis as a "single-read concierge": warm soft-Santa human presence first, clean silhouette second, premium materials third. The design should read clearly at app scale because the outfit uses large calm fabric blocks, a few aged-brass accents, and restrained texture cues instead of embroidery, busy trim, or shiny fantasy detail.

## Identity Lock

Otis Vale is an older human concierge with lived-in warmth, a slight belly, soft shoulders, kind tired eyes, silver-white hair, a full but tidy beard, and natural imperfections. He should look experienced, present, and quietly funny, not like a fashion model or mascot. Keep his stance grounded and approachable, with small asymmetries in brow, beard, posture, and smile.

Do not make him celebrity-like, hyper-symmetrical, plastic-skinned, overly muscular, doll-faced, glossy, or fake-perfect.

## Material System

Use a strict material budget:

- One dominant matte fabric per outfit.
- One secondary soft fabric visible at collar, cuffs, apron, or waist.
- Two or three aged-brass accents maximum.
- One small lived-in imperfection per pose, such as softened cuffs, a relaxed waist fold, slightly uneven beard edge, or natural shirt tension over the belly.
- No micro-patterns, heavy embroidery, dense buttons, decorative ropes, metallic glare, or sparkly trim.

Preferred material vocabulary:

- Brushed wool, soft melton, matte suiting, brushed cotton, linen shirt, satin-quiet lapel, aged brass, warm ivory, deep port red, muted charcoal, soft black, old-gold brass.
- Materials should be visible through broad value changes and simple edge quality, not tiny texture detail.

## Outfit Variants

### Variant A: Lobby Concierge Core

Deep port-red concierge waistcoat, warm ivory linen shirt, charcoal trousers, soft black shoes, two aged-brass buttons, one brass name pin. Clean chest shape, no ornate lapel braid. Premium but calm.

### Variant B: Penthouse Evening Host

Soft black dinner-concierge jacket with muted port lining visible only at cuffs and inner edge, ivory shirt, charcoal trousers, aged-brass watch chain or small lapel pin. Keep the jacket broad and matte, not tuxedo-glossy.

### Variant C: Working Porter Layer

Charcoal overshirt or service jacket over port waistcoat, rolled linen sleeves, simple brass key ring at belt, practical dark trousers. Slightly more lived-in, but still expensive and tidy. No cluttered tool belt.

## Master GPT Image 2 Prompt

```text
Create a production character source image of Otis Vale, an older warm human concierge for a premium AI-powered internship command center called The Tower. He has a soft Santa-like presence without becoming a costume: silver-white hair, full tidy beard, kind tired eyes, slight belly, soft shoulders, natural face asymmetry, and a relaxed grounded stance. Preserve lived-in human imperfections and avoid model-like perfection.

Art direction: clean premium app sprite design, readable at small UI scale, large calm shapes, restrained fabric detail, matte materials, subtle painterly-real character finish, transparent-background-ready full-body source, no crop, full hands and feet visible, 12 percent safe padding around the figure.

Material direction: one dominant matte fabric, one secondary soft fabric, two or three aged-brass accents maximum. Use broad value changes and simple edge quality to show brushed wool, linen, soft suiting, and aged brass. Avoid tiny texture, ornate embroidery, decorative ropes, busy trim, excessive buttons, metallic glare, or glossy synthetic shine.

Outfit: [INSERT VARIANT A, B, OR C].
Pose: [INSERT POSE ADDON].
Expression: warm, attentive, human, slightly amused, never cartoonish.
Lighting: soft studio lighting with gentle shadows, no dramatic rim-light halo, no glassy eyes, no waxy skin, no plastic clothing.
Output: native high-resolution full-body character source, transparent or plain neutral background, centered, sharp but not overprocessed.
```

## Pose Addons

Use one source image per pose. Do not rely on a contact sheet as source unless every cell can pass source preflight.

- Idle: standing comfortably, one hand resting near waistcoat, weight subtly shifted, calm concierge patience.
- Greeting: one hand open in a welcoming gesture, shoulders relaxed, smile warm but imperfect.
- Listening: head slightly tilted, hands loosely folded, eyes focused with gentle attentiveness.
- Thinking: one hand at beard or chin, brow slightly uneven, posture still soft and human.
- Talking: one hand lightly explaining, mouth mid-sentence, expression helpful and grounded.
- Alert: posture more upright, hand near brass key ring or name pin, concerned but not alarmed.
- Working: holding a simple folder, towel, or key card folio, no clutter, full prop visible, no cropped fingers.

## Negative Prompt

```text
Do not create ornate hotel uniform fantasy, brocade, gold ropes, military trim, crowded medals, too many buttons, busy fabric texture, micro-patterns, shiny tuxedo gloss, plastic skin, airbrushed model face, perfect symmetry, exaggerated Santa costume, cartoon mascot, childlike proportions, ultra-muscular body, glassy AI eyes, waxy beard, mirrored gold, chrome, latex, wet fabric, heavy bloom, rim halo, cropped hands, cropped feet, hidden fingers, extra fingers, fused props, floating artifacts, text labels, watermark, logo, blurry source, low-resolution output.
```

## App-Scale Readability Rules

- At 64 px height, Otis should still read as older concierge, soft beard, port or black uniform, brass accent.
- At 128 px height, the belly, shoulders, beard, and pose should be clear.
- At 256 px height, only then should subtle linen/wool detail become noticeable.
- If an accent cannot be read below 128 px, remove it instead of adding detail.
- If the generator makes the brass shiny, replace the wording with "dull aged brass, low reflection, small warm metal accent."

## Coordinator Use

Recommended first generation batch:

1. Variant A, idle and greeting.
2. Variant A, listening and talking.
3. Variant B, idle and working.
4. Variant C, alert and working.

Promote only the prompt language that keeps Otis warm, simple, and human after app-scale QA.

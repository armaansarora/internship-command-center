# Otis v2 Human Imperfection GPT Image 2 Prompt Packet

Lane: wave-01-agent-03
Strategy: Human Imperfection
Parent run: 2026-05-14-otis-production-redo-v1
Asset: Otis Vale
Status: draft prompt artifact for coordinator generation, not approved production art

## Strongest Direction

The strongest direction is "the concierge who has actually lived here": Otis still reads as the approved soft Santa concierge, but every render must include believable human specificity. He has a softer belly under the vest, a relaxed uneven stance, one shoulder sitting a little lower, a natural face with warm tired eyes, beard and hair that are groomed but not machine-perfect, and a gentle expression that feels competent, kind, and lived-in.

This is not a comic gross-out pass. The point is premium warmth, not caricature. Otis should look like a beloved building concierge who has carried luggage, remembered birthdays, missed a little sleep, and still shows up with grace.

## Canon Lock

- Adult male Tower concierge, older and warmly paternal, with the approved soft Santa energy.
- Slightly round build with a visible soft belly, not slim, athletic, or superhero-shaped.
- Premium Tower character style: dimensional, polished, app-ready, rich materials, readable at small scale, no celebrity likeness, no copied artist style.
- Consistent identity across outfit variants and poses: same face, body mass, beard shape, brow, nose, cheek volume, posture rhythm, and warmth.
- Full body, uncropped hands and feet, safe padding around silhouette, clean separation from background for later transparent staging.

## Human Imperfection Dial

Use these cues in every prompt. They are identity features, not optional flavor:

- Body: soft middle, broader waist, natural rounded abdomen under tailored clothing, relaxed knees, weight settled into one hip.
- Posture: shoulders relaxed and slightly uneven, head gently forward, stance courteous rather than posed.
- Face: asymmetric smile, one eyelid a touch heavier, natural cheek texture, soft under-eye tiredness, warm eyes, real skin, no waxy smoothness.
- Beard and hair: full white beard with uneven edges, a few flyaway hairs, groomed but not barber-perfect, hairline and waves slightly irregular.
- Hands: expressive older hands, natural knuckles, slightly thick fingers, no plastic toy hands.
- Clothing: premium but lived-in, subtle fabric creases around belly and elbows, one scarf/coat edge or lapel sitting a little imperfectly, polished shoes with tiny wear.

## Master GPT Image 2 Prompt

Use this as the core prompt for identity, outfit, and pose generations:

```text
Create a native high-resolution full-body character source of Otis Vale, an older Tower concierge with approved soft Santa warmth, premium adult app-character styling, and believable lived-in human imperfections. He is kind, competent, observant, and quietly funny, with a soft rounded belly under tailored concierge clothing, relaxed slightly uneven shoulders, a natural asymmetrical smile, warm tired eyes, real skin texture, and a full white beard that is groomed but imperfect with uneven edges and a few flyaway hairs.

Keep him premium and lovable, not sloppy or silly. His outfit should feel like a refined old-world concierge in The Tower: rich dark cloth, warm ivory shirt, tasteful brass details, practical polished shoes, and fabric creases that follow his softer body. His stance is relaxed and human, with weight settled naturally, no superhero pose, no fashion model symmetry, no perfect AI face.

Full body, single character, no cropping, hands and feet fully visible, generous transparent-source-safe padding, neutral studio background, clean silhouette, app sprite source quality, high detail, consistent identity, no text, no watermark.
```

## Negative Prompt / Reject Cues

Use these as hard rejects:

```text
Do not make Otis slim, athletic, fashion-model handsome, perfectly symmetrical, plastic-skinned, airbrushed, toy-like, bobbleheaded, childish, generic wizard, generic Santa costume, celebrity-like, photoreal employee badge portrait, horror old man, dirty, sloppy, drunk, grotesquely asymmetrical, diseased, scar-focused, or clownish. No perfect beard helmet. No overly sharp jawline. No smooth mannequin face. No missing fingers, fused fingers, cropped hands, cropped feet, floating props, text, logos, watermark, halo, harsh rim glow, or blurry source.
```

## Identity Reference Prompt

```text
Create the definitive Otis Vale identity reference for a production character pipeline. Full-body 3/4 front view, older soft Santa concierge, premium Tower style, kind human warmth, soft belly under tailored vest, relaxed shoulders slightly uneven, natural asymmetrical smile, warm tired eyes, real skin texture, full white beard with imperfect groomed edges and flyaway hairs, rich concierge clothing with subtle lived-in creases. Neutral studio background, full body uncropped with safe padding, clean silhouette, high-resolution source, no text.
```

## Turnaround Prompt

```text
Create a production turnaround sheet for Otis Vale in the approved soft Santa concierge design: front, 3/4 front, side, 3/4 back, and back views. Preserve the exact same identity, softer belly, shoulder asymmetry, natural posture, beard/hair irregularity, and outfit proportions in every view. Premium Tower app-character style, neutral background, clear labels may be omitted if they risk artifacts, full body uncropped in every view, safe padding, no text artifacts, no watermark.
```

## Expression Sheet Prompt

```text
Create an expression sheet for Otis Vale, the older soft Santa Tower concierge, keeping one consistent face and beard across all expressions. Include calm welcome, amused listening, thoughtful concern, quiet pride, gentle surprise, focused work, and reassuring alertness. Preserve natural asymmetry, warm tired eyes, real skin texture, uneven groomed beard edges, and lovable human warmth. Premium Tower style, head-and-shoulders or bust framing with consistent lighting, no text, no watermark, no perfect AI face.
```

## Outfit Variant Prompts

### Outfit A: Approved Concierge Base

```text
Otis Vale in the approved soft Santa concierge base outfit: refined dark concierge coat or vest, warm ivory shirt, tasteful brass detail, practical polished shoes, premium but lived-in. Keep the softer belly visible through the tailoring, fabric creasing naturally around the waist, relaxed shoulders, natural face, imperfect beard and hair. Full body, neutral studio background, app sprite source quality, no cropping.
```

### Outfit B: Formal Tower Door Coat

```text
Otis Vale in a more formal Tower door-coat variant over the same approved identity: structured dark wool coat, understated brass accents, warm scarf or collar detail, polished shoes with tiny wear. The coat must not hide his humanity: keep his softer belly and settled stance readable, one shoulder slightly lower, beard and hair groomed but imperfect, face warm and natural. Full body, neutral studio background, app sprite source quality, no cropping.
```

### Outfit C: Working Concierge Waistcoat

```text
Otis Vale in a working concierge waistcoat variant for active floor support: sleeves slightly relaxed, refined waistcoat, small key ring or clipboard optional, premium fabrics with practical creases. Keep him lovable and human: soft belly under the waistcoat, natural older hands, relaxed uneven posture, warm tired eyes, imperfect beard edges, no fake-perfect polish. Full body, neutral studio background, app sprite source quality, no cropping.
```

## Seven Required Pose Prompts

Append the matching outfit prompt above to one of these pose prompts.

### Idle

```text
Pose: idle. Otis stands at ease with weight slightly on one foot, shoulders relaxed and uneven, hands loosely gathered near his middle or resting naturally at his sides. The soft belly and human stance must read clearly.
```

### Greeting

```text
Pose: greeting. Otis offers a warm concierge welcome with one hand raised naturally, not too high, smile asymmetrical and kind, body leaning forward a touch as if he recognizes the user. Keep hands anatomically clean and full body uncropped.
```

### Listening

```text
Pose: listening. Otis tilts his head slightly, one brow soft, hands loosely folded or one hand near his vest, posture patient and attentive. Preserve tired warmth, natural face, beard irregularity, and gentle belly silhouette.
```

### Thinking

```text
Pose: thinking. Otis looks down and aside a little, one hand at chin or beard with realistic fingers, shoulders relaxed, expression reflective. Do not make him wizard-like; he is a modern premium concierge.
```

### Talking

```text
Pose: talking. Otis gestures with one open hand as if explaining the next step, mouth naturally mid-sentence, face expressive but not exaggerated. Keep asymmetry and human softness, no perfect commercial smile.
```

### Alert

```text
Pose: alert. Otis becomes attentive and protective, posture a little straighter but still human, eyes focused, one hand slightly lifted as if noticing something important. Do not turn him into an action hero; keep the softer belly and concierge calm.
```

### Working

```text
Pose: working. Otis checks a small clipboard, key ring, tablet, or folded note, with practical older hands and a small forward lean. Preserve premium Tower styling, natural creases, relaxed shoulders, and complete uncropped silhouette.
```

## Generation Notes For Coordinator

- Generate the identity reference first, then use it as visual reference for outfit and pose continuity.
- Reject any output where Otis looks 20 percent slimmer, younger, more symmetrical, or more plastic than the identity reference.
- Reject any output where the belly becomes a joke, the asymmetry becomes deformity, or the clothing becomes shabby.
- Prefer individual source generations over multi-cell contact sheets for final sprites. Use contact sheets only for review, not extraction, unless every cell passes crop and resolution preflight.
- No public/art promotion is implied by this lane. These prompts require image generation, preflight, review board comparison, and final human approval.

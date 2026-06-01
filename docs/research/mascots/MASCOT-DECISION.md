# The Tower — Mascot decision (LOCKED)

**Decision (2026-06-01):** the mascot is **the owl**, using the two renders the founder generated.
No further exploration — going with these.

## The two owls
| Render | Source | Role |
|---|---|---|
| **Cream owl** | `selected/cream-owl-favorite.png` → `public/brand/owl-cream.png` | **Active mascot now** (dark UI) |
| **Navy owl** | `selected/navy-owl-keeper.png` → `public/brand/owl-navy.png` | Light-mode twin (reserved) |

Same character, inverted for contrast: **cream on dark, navy on light.** When light/dark mode is
added, the mark flips between the two.

## Current state
- For now the app is dark, so the **cream owl** is the face.
- Component: `src/components/identity/Mascot.tsx` — `<Mascot mode="dark" | "light" />`
  (`dark` → cream, `light` → navy; defaults to `dark`). Renders inside a rounded app-icon tile.
- Live: `/lobby-pilot` (hero = the owl + the light/dark twin; the Keystone glyph stays as a
  secondary mark below).

## Backgrounds / transparency
- **Cream owl** (`public/brand/owl-cream.png`): now a **transparent cutout** (PIL flood-key), so it
  floats on any surface. Minor fraying at the lower-right wingtip (navy-on-navy edge) — invisible on
  the dark UI; visible on light. Pristine original (with navy backdrop) kept at
  `docs/research/mascots/selected/cream-owl-favorite.png`.
- **Navy owl** (`public/brand/owl-navy.png`): still has its flat navy backdrop. Auto-keying navy-on-navy
  frays badly, so render it with `tile`. Give it a clean transparent version (regenerate with a
  transparent / chroma background, or proper matting) when light mode is actually built.
- For a pristine cream cutout too, regenerate the chosen owl in GPT Image 2 on a **transparent or pure
  chroma (magenta/green) background** — far cleaner than keying the navy-baked PNG.
- Prompt exploration that led here: `CUTE-VARIATIONS.md` (cute/friendly round), `OWL-VARIATIONS.md`
  and `../MASCOT-CONCEPTS.md` (earlier rounds), `FEMININE-VARIATIONS.md` (superseded, read sultry).

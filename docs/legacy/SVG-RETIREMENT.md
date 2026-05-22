# SVG Retirement Ledger

The Tower no longer treats handwritten local SVG as production art. Local source should not contain hand-authored `<svg>` markup or `data:image/svg` URLs. Functional symbols may use an approved icon library. Product charts and diagrams should use HTML/CSS or canvas.

## Policy

- `replaced`: The local SVG/data-SVG source was removed and replaced with CSS, canvas, approved image assets, or an approved icon-library component.
- `pending replacement`: The old SVG was removed, but the final generated art is waiting on Armaan's approval before it can be committed.
- `kept via approved library`: The visual is a functional control icon rendered by a vetted package instead of local SVG markup.

## Lobby And Characters

| Source | Status | Replacement |
| --- | --- | --- |
| `src/components/lobby/concierge/OtisAvatar.tsx` | pending replacement | Manifest-backed `CharacterSprite` fallback until an Otis concept and pose pack are approved. |
| `src/components/floor-1/ceo-character/CEOCharacter.tsx` | pending replacement | Shared `CharacterSprite` fallback; generated CEO pack comes after Lobby/Otis. |
| `src/components/floor-2/cfo-character/CFOCharacter.tsx` | pending replacement | Shared `CharacterSprite` fallback; generated CFO pack comes later. |
| `src/components/floor-3/cpo-character/CPOCharacter.tsx` | pending replacement | Shared `CharacterSprite` fallback; generated CPO pack comes later. |
| `src/components/floor-4/coo-character/COOCharacter.tsx` | pending replacement | Shared `CharacterSprite` fallback; generated COO pack comes later. |
| `src/components/floor-5/cmo-character/CMOCharacter.tsx` | pending replacement | Shared `CharacterSprite` fallback; generated CMO pack comes later. |
| `src/components/floor-6/cno-character/CNOCharacter.tsx` | pending replacement | Shared `CharacterSprite` fallback; generated CNO pack comes later. |
| `src/components/floor-7/cro-character/CROCharacter.tsx` | pending replacement | Shared `CharacterSprite` fallback; generated CRO pack comes later. |

## Functional Icons

| Source | Status | Replacement |
| --- | --- | --- |
| Penthouse, lobby, settings, sound, pricing, elevator, modal, table, and action icons | kept via approved library | `lucide-react` components for functional symbols. |

## Charts And Diagrams

| Source | Status | Replacement |
| --- | --- | --- |
| Dispatch graph, whiteboards, analytics charts, compensation chart | replaced | HTML/CSS or canvas rendering, depending on whether the surface is data visualization or decorative status. |

## Texture Data URIs

| Source | Status | Replacement |
| --- | --- | --- |
| SVG noise overlays in global/lobby/card styles | replaced | CSS repeating gradients and radial overlays. |

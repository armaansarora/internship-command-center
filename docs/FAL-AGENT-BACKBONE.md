# fal.ai — agent media-generation backbone (verified 2026-06-03)

So **Claude Code and Codex can autonomously generate any Tower visual** — video, images, character art, floors,
textures, icons, sprites, background removal, upscaling, even custom identity LoRAs — from a shell, with one key.
Verdict + setup from a multi-agent research pass (7 agents → critic → adversarial verification) plus live
first-party checks. Companion to `docs/research/mascots/KLING-OWL-RUNBOOK.md` (the first job).

## Verdict: YES, fal is the right backbone — as the *coverage/agent* layer

fal uniquely hits all four agent-native requirements at once:
1. **One secret** — a single `FAL_KEY` env var the SDKs auto-read.
2. **Headless** — no browser OAuth (unlike Higgsfield's CLI); pure API.
3. **Broadest catalog** — 600–1,000+ models behind ONE uniform queue API: Kling v3/O1, Veo 3.1, Sora 2 (until
   2026-09), Wan, Seedance, Runway, Luma for video; FLUX.1/.2/Kontext, Seedream, Nano Banana, Recraft, Ideogram,
   GPT-Image for images; **BiRefNet/rembg** bg-removal, upscalers, image-to-3D, TTS, and **LoRA training**
   ($0.008/step) to lock a character's identity.
4. **Real async queue + `upload_file`** — hosts a local PNG to a CDN URL (the exact primitive to feed a local
   owl frame into a video model), with polling + webhooks.

**Honest exceptions (when to reach past fal):**
- **Bulk video** → Google **Veo via Gemini/Vertex** is much cheaper (Veo 3.1 Lite $0.05/s *with* audio vs fal's
  per-second markup). fal is convenience/coverage, not cost-optimal for one model at scale.
- **Background removal** → run **local `rembg`/BiRefNet** (free, offline) instead of paying fal's endpoint.
- **A model only on Replicate** → keep `REPLICATE_API_TOKEN` as a breadth fallback (postpaid, can't be balance-
  capped, so fallback only).
- **In-app (server-side) generation** → Vercel **AI Gateway** (zero markup, native to the Next.js + AI-SDK-v6
  stack). No agent MCP / no utility models, so it's the runtime path, not the agent path.

---

## Setup (one time)

### 1. Account + key
- Sign up at https://fal.ai → https://fal.ai/dashboard/keys → **Create Key**, scope **API**, name `tower-agent`.
- Copy the combined key immediately — format is **`key_id:key_secret`**, the secret is shown **once**.
- **Billing:** fund a fixed prepaid balance (e.g. $25), and **turn auto-top-up OFF** — the balance is then a
  hard spend cap (you're never charged for failed/queued jobs). ~$20 free starter credit, ~$10 min top-up
  (verify at signup). No monthly fee.

### 2. Put the key where both agents + the repo can read it
```bash
# a) repo (already gitignored) — for `set -a; source .env.local; set +a` scripts
printf '\nFAL_KEY="%s"\n' 'PASTE_key_id:key_secret' >> "/Users/armaanarora/Developer/The Tower/.env.local"

# b) shell-wide — Claude Code's Bash + the Codex *process* inherit this
printf '\nexport FAL_KEY="%s"\n' 'PASTE_key_id:key_secret' >> ~/.zshrc && source ~/.zshrc
[ -n "$FAL_KEY" ] && echo "FAL_KEY set" || echo "MISSING"
```
> ⚠️ **Codex gotcha (required):** Codex strips any env var whose name contains `KEY`/`SECRET`/`TOKEN` before
> handing env to the shells it runs — so the `~/.zshrc` export above reaches Codex's MCP client but **NOT**
> Codex's Bash tool. To let Codex *shell out* to `fal-gen`, inject it explicitly (plaintext, so `chmod 600
> ~/.codex/config.toml`, never commit):
> ```toml
> [shell_environment_policy.set]
> CLAUDE_STREAM_IDLE_TIMEOUT_MS = "900000"   # existing
> FAL_KEY = "PASTE_key_id:key_secret"        # add — literal, no $VAR interpolation
> ```
> No-plaintext alternative: under `[shell_environment_policy]` add `include_only = ["PATH","HOME","USER","TMPDIR","LANG","LC_*","FAL_KEY"]`.

### 3. Install a client
```bash
npm i @fal-ai/client            # Node path (repo is Node v24) — used by scripts/fal-gen.mjs
# or Python (3.14 + uv; PEP-668 needs a venv): uv venv .venv && source .venv/bin/activate && uv pip install fal-client
```

### 4. Register the official fal MCP (optional but recommended — model discovery + schema + run)
Free hosted server, 9 tools (search_models, get_model_schema, get_pricing, run_model, submit_job, check_job,
upload_file, recommend_model, search_docs). **MCP auth uses `Bearer`, the SDK/REST use `Key` — don't cross them.**
```bash
# Claude Code:
claude mcp add --transport http fal-ai https://mcp.fal.ai/mcp --header "Authorization: Bearer ${FAL_KEY}" --scope user
claude mcp list      # expect: fal-ai ... Connected
```
```toml
# Codex (~/.codex/config.toml): HTTP MCP needs the rmcp flag (top-level) + a server block
experimental_use_rmcp_client = true

[mcp_servers.fal-ai]
url = "https://mcp.fal.ai/mcp"
bearer_token_env_var = "FAL_KEY"
```

### 5. Prove it works (cheapest model, ~$0.003)
```bash
curl -s -X POST "https://fal.run/fal-ai/flux/schnell" \
  -H "Authorization: Key $FAL_KEY" -H "Content-Type: application/json" \
  -d '{"prompt":"keyboard test"}'        # returns an image url => key works end-to-end
```

---

## How agents generate anything: `scripts/fal-gen.mjs`

A turnkey wrapper (uploads local files, submits, polls, downloads the result, since fal.media URLs expire ≥7d).
```bash
node scripts/fal-gen.mjs --model <fal-model-id> --prompt "..." [--negative "..."] \
  [--image <path|url>] [--end-image <path|url>] [--duration 5] [--cfg 0.9] [--no-audio] \
  [--arg key=value ...] [--out path] [--json]
```
The owl idle loop (Path A of the Kling runbook) — same still both ends = seamless loop:
```bash
node scripts/fal-gen.mjs --model fal-ai/kling-video/v3/pro/image-to-video \
  --image owl-magenta.png --end-image owl-magenta.png --duration 5 --cfg 0.9 --no-audio \
  --prompt "the owl idles: slow soft belly breath, one slow blink, tiny feather settle, then returns to rest. static locked-off tripod shot, completely static camera, no movement." \
  --negative "camera movement, zoom, pan, orbit, morphing, warping, flicker, color shift, jittery eyes, wobbling gold bar, extra feathers, text, watermark" \
  --out public/brand/owl-take.mp4
```
**Verified params for `fal-ai/kling-video/v3/pro/image-to-video`:** `start_image_url` (req), `end_image_url`,
`negative_prompt`, `cfg_scale` (default 0.5 — push ~0.9), `duration` ("5"), `generate_audio`. Resilience: the
SDK/REST path is load-bearing; treat the MCP as the convenience layer (it's hosted on Vercel — a fal/Vercel
blip breaks MCP but not the SDK).

---

## Cost (verified per-unit; pick "prototype cheap → finalize premium")

| Item | fal rate | per 5s take / per image |
|---|---|---|
| **Kling v3 Pro** i2v (audio off) | $0.112/s | **$0.56** / 5s |
| Kling 2.5 Turbo Pro i2v | $0.07/s | $0.35 / 5s |
| Wan 2.5 (cheap prototype video) | $0.05/s | $0.25 / 5s |
| Veo 3.1 standard (no audio) | $0.20/s | $1.00 / 5s |
| FLUX.2 [dev] image | $0.012/MP | ~$0.01 |
| Nano Banana Pro (1K) | — | $0.15 |
| Seedream 4.0 image | — | $0.03 |
| BG removal (Bria RMBG2) | — | $0.018/run (or free local rembg) |
| FLUX LoRA fast-training | $0.008/step | ~$2–8 / run |

**Monthly scenarios for The Tower:** light (one owl loop + a few icons) ≈ **$5**; medium (owl + 2 character
idles + ~10 images) ≈ **$20–25**; heavy (lots of floors/sprites) ≈ **$60–90**. Realistic expected spend
**~$15–30/mo** — all under Higgsfield's $199 floor and at/under Replicate for the same calls. A perfectionist
owl loop of 100 Kling takes alone is ~$56, so the discipline is: prototype on Wan/Flux-dev, finalize the winner
on Kling v3 Pro / Nano Banana Pro. Live prices: `GET https://api.fal.ai/v1/models/pricing?endpoint_id=<slug>`.

---

## Rights & data (paid SaaS due-diligence)
- **Commercial use:** allowed for models carrying fal's **"Commercial use"** badge (Kling, FLUX dev/schnell
  do). fal's ToS is a *disclaimer*, not an IP grant — no output-IP indemnity; you indemnify fal for input-IP.
  For a mascot built from your own owl art + a commercial-badge model, this is fine.
- **Training opt-out:** fal *may* use your data to train (no toggle). Send header **`X-Fal-Store-IO: 0`** to stop
  it storing the prompt/output JSON payloads (CDN media still produced). Worth it for an identity-defining asset.
- **Retention:** result media lives **≥7 days** then is permanently deleted — `fal-gen.mjs` downloads immediately.

## ArtLab integration (later, not required for the owl)
fal should *complement* the ArtLab pipeline: add a `fal-api` `CreativeProductionProviderId` + a `FalAdapter`
(`billing:'api-billed'`, `supportsUnattendedGeneration:true`, `supportsReferenceImages:true`) behind the
existing budget ledger (`src/lib/artlab/budget/ledger.ts`), so agents keep calling `artlab/generate` while fal
does the video/multimodal lifting. Net-new (no video provider exists today); keep behind the two human gates.

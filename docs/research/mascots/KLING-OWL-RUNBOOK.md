# Kling owl idle-loop — execution runbook (verified 2026-06-03)

How to produce `public/brand/owl-idle.webm` + `owl-idle.mov` (the `engine="video"` assets for the cream-owl
companion) with Kling. Two multi-agent workflows (8 + 7 research agents → claim critic → adversarial
verification, ~53 agents total) + live first-party checks back every number here. Confidence flagged where the
source was secondary.

Read with `ANIMATION-ALTERNATIVES.md` (why AI-image-to-video #1) and `OWL-HANDOFF.md` (the built integration).

---

## TL;DR decision

- **Model:** **Kling v3 Pro** (image-to-video, 1080p). Newest line (launched 2026-01-31), strongest identity
  binding of any Kling version (<10% drift vs 50%+ on 2.6). **Kling O1** is the validated second choice.
- **Two ways to run it, same engine + same prompt:**
  - **Path A — AUTONOMOUS via fal.ai (recommended).** The agent (me) drives everything headlessly with one
    `FAL_KEY`: upload the still, generate N takes (same image as start+end = seamless loop, `negative_prompt`
    for the identity lock, `cfg_scale` high), poll, download, background-remove, ffmpeg dual-encode, drop into
    `public/brand/`. ~$0.56/5s take, pay-as-you-go, no subscription.
  - **Path B — MANUAL via klingai.com native app.** You click through the web UI. Same model/prompt/settings.
    One ~$6.99 month covers the whole curation batch.
- **Higgsfield's CLI does NOT make Higgsfield worth it** (it can't target Kling as the right model, auth is
  browser-OAuth-only, API is gated to the $199/mo tier). fal.ai is the clean autonomous path. See bottom.
- **Transparency:** Kling never outputs alpha — opaque MP4 either way. The bg-removal + ffmpeg dual-encode
  (WebM-VP9-alpha + HEVC `.mov`) runs locally on the Mac (encoders verified present). Unchanged from the plan.

---

## Recommended generation settings (shared by both paths)

- **Input still:** the owl on a **flat, saturated chroma plate the owl does NOT contain** — saturated GREEN
  (`#00B140`) or **MAGENTA** (`#FF00FF`, safer for a CREAM subject — cream has green/yellow). **NEVER** navy/
  `#1A1A2E` (fringes the navy markings on key) and **NEVER** an empty/transparent bg (Kling invents scenery).
  Keep the exact 3/4 pose, folded wings, perched on the thin gold bar. This one image is BOTH start and end.
- **Loop mechanic:** same image as **first frame AND last frame** → Kling interpolates motion that returns to
  the identical pose = seamless loop.
- **⚠️ Loop caveat (verified):** identical start=end frames *default toward a 360° camera orbit*. You MUST
  force a locked camera: put `static locked-off tripod shot, completely static camera, no movement` at the
  **END** of the positive prompt (Kling weights end-of-prompt tokens heavily) AND put camera-motion terms in
  the negative. If orbit persists, fall back to single-frame (no end frame) + an ffmpeg boomerang/crossfade.
- **Duration:** 5s (not 10 — fewer frames = less drift). **cfg_scale ≈ 0.9** (high = faithful to the image;
  fal default is 0.5, push it up). Native UI: drag **Creativity↔Relevance fully to RELEVANCE**.
- **Audio:** off (`generate_audio: false`). **Mode:** Professional/Pro (1080p; end-frame is Pro-gated).
- **`elements`/"Bind Subject":** if available, add the owl still as a reference to further lock identity.

### Positive prompt (motion-only — never re-describe the owl; Kling preserves the input image)
```
The owl idles calmly: belly rises and falls in a slow, soft, barely-perceptible breath; one slow gentle blink of the amber eyes; a tiny feather settle, then returns to the resting pose. static locked-off tripod shot, completely static camera, no movement, fixed frame.
```

### Negative prompt (tight — 7–12 terms; overlong negatives make Kling stiff)
```
camera movement, zoom, pan, dolly, orbit, 360 rotation, drifting camera, morphing, warping, melting, flicker, boiling texture, color shift, changing markings, jittery eyes, wobbling gold bar, extra feathers, extra limbs, deformed beak, text, watermark
```

---

## Path A — AUTONOMOUS (fal.ai, agent-driven) ★ recommended

Everything is a single `FAL_KEY` env var; `fal_client.upload_file()` turns a local PNG into a hosted URL (no
separate image hosting). Endpoint **`fal-ai/kling-video/v3/pro/image-to-video`** — schema verified live:
accepts `start_image_url` (req), `end_image_url`, `negative_prompt` (default "blur, distort, and low quality"),
`cfg_scale` (default 0.5), `duration` ("5"), `generate_audio`, `elements`, `shot_type`.

**What the agent needs from you:** (1) a `FAL_KEY` (fal.ai dashboard), (2) the owl still on a chroma plate
(or say the word and I generate that first).

```bash
pip install fal-client       # or: npm i @fal-ai/client
export FAL_KEY=...            # single static key, no browser login
```

```python
import fal_client
IMG = fal_client.upload_file("owl-magenta.png")      # local file -> CDN url, reuse across takes
POS = ("The owl idles calmly: belly rises and falls in a slow, soft, barely-perceptible breath; "
       "one slow gentle blink of the amber eyes; a tiny feather settle, then returns to the resting pose. "
       "static locked-off tripod shot, completely static camera, no movement, fixed frame.")
NEG = ("camera movement, zoom, pan, dolly, orbit, 360 rotation, drifting camera, morphing, warping, melting, "
       "flicker, boiling texture, color shift, changing markings, jittery eyes, wobbling gold bar, "
       "extra feathers, extra limbs, deformed beak, text, watermark")
r = fal_client.subscribe("fal-ai/kling-video/v3/pro/image-to-video", arguments={
    "prompt": POS, "negative_prompt": NEG,
    "start_image_url": IMG, "end_image_url": IMG,      # same image both ends = loop
    "duration": "5", "cfg_scale": 0.9, "generate_audio": False,
})
print(r["video"]["url"])     # then: curl -o take.mp4 "<url>"
```
Loop over this for 8–12 takes (vary nothing but reruns/seed), download each, then curate (below). Background
removal is also scriptable (fal BiRefNet/rembg endpoint, or local rembg) — fully headless.

---

## Path B — MANUAL (klingai.com native app)

1. **Subscribe first** (commercial + watermark-free): `app.klingai.com/global/membership/membership-plan`.
   Standard ≈ $6.99 first month. Free tier is **non-commercial + hard-watermarked** — cannot ship.
2. Go to `app.klingai.com/global/image-to-video/frame-mode/new` (sidebar **AI Video → Image-to-Video**).
   Confirm the **global** app (English), not the China app.
3. Model dropdown → **Kling 3.0** (or O1), mode **Professional/Pro** (end-frame is Pro-gated; Standard hides it).
4. Upload the chroma-plate still to the **First/Start** dropzone → click **Add End Frame** (top-right) → upload
   the **same** still as the End frame.
5. Paste the positive prompt; open **Negative Prompt** and paste the negative. Camera Movement auto-disables
   once an End Frame is present (good). Don't use Motion Brush.
6. **Creativity↔Relevance → fully RELEVANCE.** Duration **5s**. Aspect ratio = the owl frame's (1:1 or 9:16).
7. **Generate**, re-roll for 8–12 takes. **At download, toggle OFF the watermark checkbox** (paid still
   defaults to watermarked — a watermarked file is an auto-reject).

---

## Curation checklist (grade every take keep/kill)

Budget **8–12 takes** to land one clean loop (expect ~1-in-4 to 1-in-6 keepers at low motion on flat art).
Kill a take for ANY of: camera wander/orbit · navy markings shifting/morphing · amber eyes warping or blinking
too fast · gold bar bending/wobbling · "boil"/shimmer crawling across the cream/navy fills · visible seam jump
at the loop point · over-animation (more than a soft breathe + one slow blink) · invented background motion.

**Iteration order if a batch is bad — change ONE thing at a time:**
1. **Over-animation / drift** → shorten the positive prompt (drop "feather settle", keep breathe + one blink) and
   raise cfg toward 1.0. (Do NOT lengthen the negative — long negatives stiffen Kling.)
2. **Loop seam** → confirm identical start/end frames; if a mid-clip snap appears, keep 5s and fix the seam in
   ffmpeg (boomerang/crossfade below).
3. **Boil/shimmer across the whole batch** → this is the signal Kling can't hold this flat-shaded asset; switch
   to the repo's Rive mesh-deform path (`ANIMATION-ALTERNATIVES.md` #2) instead of burning more takes.
4. **Edge fringing** → re-key with a cleaner choke/despill (last; it's a post issue, not a generation issue).

---

## Downstream: background removal + dual-encode (local, macOS)

Verified on this Mac: ffmpeg 8.1.1, `libvpx-vp9` ✓, `hevc_videotoolbox` ✓, `premultiply`/`despill`/`colorkey` ✓.
`rembg`/`backgroundremover` are NOT installed (one-time `pip install "rembg[cli]"`). HEVC-with-alpha is
macOS-only — commit the `.mov` as a binary artifact.

```bash
# 1) BG removal — local BiRefNet (best on feather edges; free/offline; no usage-rights issue)
mkdir -p /tmp/owl/frames /tmp/owl/cut
ffmpeg -i take.mp4 -vsync 0 /tmp/owl/frames/f_%04d.png
rembg p -m birefnet-general /tmp/owl/frames /tmp/owl/cut
ffmpeg -framerate 30 -i /tmp/owl/cut/f_%04d.png -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le -an /tmp/owl/owl-master.mov
#    ALT (chroma key, if matting is ragged): generate owl on #FF00FF, then
#    ffmpeg -i take.mp4 -vf "colorkey=0xFF00FF:0.30:0.10,despill=type=magenta,format=rgba" -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le -an /tmp/owl/owl-master.mov

# 2) Loop seam — clean trim (Kling start=end already matches); ALT crossfade if a seam shows (blend keeps alpha; xfade drops it)
ffmpeg -y -i /tmp/owl/owl-master.mov -t 5 -r 30 -an -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le /tmp/owl/owl-loop.mov

# 3a) WebM VP9 + alpha (Chrome/Firefox), 2-pass
ffmpeg -y -i /tmp/owl/owl-loop.mov -an -c:v libvpx-vp9 -pix_fmt yuva420p -crf 28 -b:v 0 -row-mt 1 -lag-in-frames 25 -auto-alt-ref 0 -pass 1 -passlogfile owlpass -f null /dev/null
ffmpeg -y -i /tmp/owl/owl-loop.mov -an -c:v libvpx-vp9 -pix_fmt yuva420p -crf 28 -b:v 0 -row-mt 1 -lag-in-frames 25 -auto-alt-ref 0 -pass 2 -passlogfile owlpass "public/brand/owl-idle.webm"

# 3b) HEVC hvc1 + alpha (Safari/iOS), premultiplied for #1A1A2E (encode FROM the webm so the two are frame-identical)
ffmpeg -y -c:v libvpx-vp9 -i "public/brand/owl-idle.webm" -c:v hevc_videotoolbox -alpha_quality 0.75 -vtag hvc1 -vf "premultiply=inplace=1" "public/brand/owl-idle.mov"

# verify (expect webm: vp9/yuv420p/alpha_mode=1 ; mov: hevc/hvc1)
ffprobe -v error -show_entries stream=codec_name,codec_tag_string,pix_fmt -show_entries stream_tags=alpha_mode -show_entries format=duration "public/brand/owl-idle.webm" "public/brand/owl-idle.mov"
```
- `premultiply=inplace=1` is CORRECT, not a bug — it pre-darkens semi-transparent edge pixels so WebKit's GPU
  composite over navy doesn't bright-fringe (Apple WWDC19 HEVC-alpha spec + Jake Archibald's recipe).
- `yuv420p + alpha_mode=1` on probe is expected for layered VP9 alpha — do not "fix" it.
- `.mov` MUST be listed first in `<source>` (already is): Safari does VP9 but NOT VP9-with-alpha.
- Sizes: WebM ~150–400KB, `.mov` ~0.3–1.5MB at ~512px/5s/30fps. Tuning: edges chunky → `-alpha_quality 0.9`;
  too big → `-crf 30` or `-r 24`.

---

## Commercial rights & watermark (both paths)

- **fal.ai (Path A):** pay-as-you-go, commercially licensed, watermark-free output. Cleanest for a paid SaaS.
- **klingai.com (Path B):** commercial use permitted on **any PAID plan** (Terms of Paid Service, eff.
  2026-04-21: "members' use of the Output for commercial purposes is not restricted… except for… competitive
  products of KLING AI" — an internship tracker is fine). You **own the IP**; **free tier is non-commercial +
  watermarked**. Residual: Kling keeps a broad license to host/train on your content (opt out via
  support@kling.ai, User Policy §4.7.4); enable Private Mode for an identity-defining brand asset.

---

## Higgsfield CLI — verdict (why it doesn't change the plan)

The CLI is **real and official** (`github.com/higgsfield-ai/cli`, MIT, ~277★, v0.1.40 May 2026; `npm i -g
@higgsfield/cli`), does image-to-video headlessly (`--start-image`, `--wait`, `--json`). But for autonomous
agent use it loses on every axis that matters:
- **Auth is interactive browser OAuth only** (Clerk) — **no API-key/env-var path**. A fresh agent can't
  bootstrap unattended; needs a one-time human browser login (session then caches ~1yr).
- **Can't target the right model:** its video catalog is Kling 2.6/3.0/Veo/Seedance/Wan — **Kling O1 is image-
  only, DoP isn't in the CLI at all**; and its video schemas expose **no `negative_prompt`/motion/seed**.
- **Higgsfield's only key-based headless surface** (the JS/Python SDK, `HF_API_KEY:HF_API_SECRET`) exposes
  **only its own DoP engine**, not Kling — and **API access is gated to the ~$199/mo Studio tier** (the "$199"
  hunch was confirmed).
- **Net:** fal.ai gives the *same verified-best Kling engine* + single-key headless control + `negative_prompt`
  + scriptable bg-removal, with no tier gate. Higgsfield's CLI does not win on automation.
- Kling's **own official API** is the fallback (uniquely first-party: `image_tail` + `negative_prompt` +
  `cfg_scale`) but needs an HS256 JWT re-signed ~every 30 min and an API plan, and has no bg remover.

---

## Costs

- **fal.ai Kling v3/O1:** ~$0.56 per 5s take, pay-as-you-go → ~$11 for 20 takes. No subscription.
- **klingai.com native:** Standard ≈ $6.99 first month / 660 credits. Kling **3.0** Pro ≈ 8 cr/sec ≈ ~40 cr/5s
  (~16 Pro takes/mo); Kling 3.0 Std (720p) ≈ ~30 cr/5s; **Kling 2.6** is the cheaper 10 cr (Std) / 35 cr (Pro)
  per 5s if you want more takes at slightly weaker identity lock. One month covers a full curation batch.
  (The "10/35 credits" figure is **2.6**, not 3.0 — verify on-screen credit cost before each render.)

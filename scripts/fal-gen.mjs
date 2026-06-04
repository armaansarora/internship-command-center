#!/usr/bin/env node
// fal-gen — turnkey fal.ai generator so Claude Code / Codex can produce ANY Tower visual asset headlessly.
//
// Setup (one time):  npm i @fal-ai/client   +   export FAL_KEY=key_id:key_secret  (see docs/FAL-AGENT-BACKBONE.md)
//
// Usage:
//   node scripts/fal-gen.mjs --model <id> --prompt "..." [options]
//
// Options:
//   --model <id>            fal model id, e.g. fal-ai/kling-video/v3/pro/image-to-video  (required)
//   --prompt "..."          positive prompt
//   --negative "..."        negative_prompt (identity/drift lock)
//   --image <path|url>      local file or URL -> uploaded + sent as start_image_url
//   --end-image <path|url>  local file or URL -> sent as end_image_url (same as --image = seamless loop)
//   --duration <n>          duration seconds (string enum on Kling), default omitted
//   --cfg <0..1>            cfg_scale (higher = more faithful, less drift)
//   --no-audio              generate_audio=false (silent; also cheaper on Kling)
//   --arg key=value         pass ANY extra model param (repeatable). Numbers/true/false auto-cast.
//   --out <path>            download the first result media to this path (default: ./fal-out/<ts>.<ext>)
//   --json                  print the full raw result JSON to stdout
//
// Examples:
//   # owl idle loop (same still both ends = seamless loop)
//   node scripts/fal-gen.mjs --model fal-ai/kling-video/v3/pro/image-to-video \
//     --image owl-magenta.png --end-image owl-magenta.png --duration 5 --cfg 0.9 --no-audio \
//     --prompt "the owl idles: slow soft belly breath, one slow blink, tiny feather settle, then returns to rest. static locked-off tripod shot, completely static camera, no movement." \
//     --negative "camera movement, zoom, pan, orbit, morphing, warping, flicker, color shift, jittery eyes, wobbling gold bar, extra feathers, text, watermark" \
//     --out public/brand/owl-take.mp4
//   # a quick image
//   node scripts/fal-gen.mjs --model fal-ai/flux/schnell --prompt "brass elevator dial, art deco" --out dial.png

import { fal } from "@fal-ai/client";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, extname, dirname } from "node:path";

const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" };
const isUrl = (s) => /^https?:\/\//i.test(s);
const cast = (v) => (v === "true" ? true : v === "false" ? false : /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v);

function parseArgs(argv) {
  const o = { extra: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--model": o.model = next(); break;
      case "--prompt": o.prompt = next(); break;
      case "--negative": o.negative = next(); break;
      case "--image": o.image = next(); break;
      case "--end-image": o.endImage = next(); break;
      case "--duration": o.duration = next(); break;
      case "--cfg": o.cfg = Number(next()); break;
      case "--no-audio": o.noAudio = true; break;
      case "--out": o.out = next(); break;
      case "--json": o.json = true; break;
      case "--arg": { const [k, ...rest] = next().split("="); o.extra[k] = cast(rest.join("=")); break; }
      case "--arg-file": { const [k, ...rest] = next().split("="); (o.argFiles ??= {})[k] = rest.join("="); break; } // upload a local file -> set input[k]=cdn url
      default: console.error(`Unknown arg: ${a}`); process.exit(2);
    }
  }
  return o;
}

async function toUrl(pathOrUrl) {
  if (isUrl(pathOrUrl)) return pathOrUrl;
  const buf = await readFile(pathOrUrl);
  const ext = extname(pathOrUrl).slice(1).toLowerCase();
  const file = new File([buf], basename(pathOrUrl), { type: MIME[ext] || "application/octet-stream" });
  return fal.storage.upload(file); // -> https://*.fal.media/... CDN url, reusable across calls
}

// Walk the result object, return the first {url, ...} media entry.
function firstMedia(data) {
  let found = null;
  const walk = (v) => {
    if (found || v == null) return;
    if (typeof v === "object") {
      if (typeof v.url === "string") { found = v; return; }
      for (const x of Array.isArray(v) ? v : Object.values(v)) walk(x);
    }
  };
  walk(data);
  return found;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!process.env.FAL_KEY) { console.error("ERROR: FAL_KEY is not set. See docs/FAL-AGENT-BACKBONE.md"); process.exit(1); }
  if (!o.model) { console.error("ERROR: --model is required"); process.exit(2); }
  fal.config({ credentials: process.env.FAL_KEY });

  const input = { ...o.extra };
  if (o.prompt) input.prompt = o.prompt;
  if (o.negative) input.negative_prompt = o.negative;
  if (o.duration) input.duration = o.duration; // Kling wants a string enum, keep as-is
  if (typeof o.cfg === "number" && !Number.isNaN(o.cfg)) input.cfg_scale = o.cfg;
  if (o.noAudio) input.generate_audio = false;
  if (o.image) input.start_image_url = await toUrl(o.image);
  if (o.endImage) input.end_image_url = await toUrl(o.endImage);
  for (const [k, p] of Object.entries(o.argFiles ?? {})) input[k] = await toUrl(p); // upload local files to arbitrary params

  console.error(`→ ${o.model}\n  input: ${JSON.stringify(input)}`);
  const t0 = Date.now();
  const res = await fal.subscribe(o.model, {
    input,
    logs: true,
    onQueueUpdate: (u) => { if (u.status) console.error(`  [${u.status}] ${Math.round((Date.now() - t0) / 1000)}s`); },
  });
  const data = res.data ?? res;
  if (o.json) console.log(JSON.stringify(data, null, 2));

  const media = firstMedia(data);
  if (!media) { console.error("No media URL in result. Full data:\n" + JSON.stringify(data, null, 2)); return; }
  console.error(`  result url: ${media.url}`);

  // fal.media URLs are EPHEMERAL (>=7 days then deleted) — download now.
  const urlExt = extname(new URL(media.url).pathname).slice(1) || (media.content_type?.split("/")[1] ?? "bin");
  const out = o.out ?? `fal-out/${t0}.${urlExt}`;
  await mkdir(dirname(out), { recursive: true });
  const buf = Buffer.from(await (await fetch(media.url)).arrayBuffer());
  await writeFile(out, buf);
  console.error(`  saved: ${out} (${(buf.length / 1024).toFixed(0)} KB)`);
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });

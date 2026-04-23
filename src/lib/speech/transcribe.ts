/**
 * R6.2 — Whisper transcription via Vercel AI SDK v6.
 *
 * Called exclusively from /api/briefing/transcribe. That route is gated
 * end-to-end (403 if voice_recording_enabled=false, 410 if permanently
 * disabled, 403 if the caller doesn't own the bucket path). By the time
 * control reaches here, the user has consented and owns the file.
 *
 * `ai@6.0.116` exports `experimental_transcribe` (see node_modules/ai/dist/
 * index.d.ts). We stay on that export rather than the direct OpenAI fetch
 * fallback — the SDK gives us provider-agnostic swap-out later, and the
 * fetch path would bypass AI_GATEWAY_API_KEY routing if we add it.
 */
import { openai } from "@ai-sdk/openai";
import { experimental_transcribe as transcribe } from "ai";

export async function transcribeAudio(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const result = await transcribe({
    model: openai.transcription("whisper-1"),
    audio: buf,
  });
  return result.text ?? "";
}

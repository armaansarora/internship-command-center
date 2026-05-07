/**
 * Whisper transcription via Vercel AI SDK v6.
 *
 * Called exclusively from /api/briefing/transcribe. That route is gated
 * end-to-end (403 if voice_recording_enabled=false, 410 if permanently
 * disabled, 403 if the caller doesn't own the bucket path). By the time
 * control reaches here, the user has consented and owns the file.
 *
 * `ai@6.0.116` exports `experimental_transcribe` (see node_modules/ai/dist/
 * index.d.ts). The model comes from the central AI factory so production can
 * route through AI Gateway while local/dev can still use a direct OpenAI key.
 */
import { experimental_transcribe as transcribe } from "ai";
import { getTranscriptionModel } from "@/lib/ai/model";

export async function transcribeAudio(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const result = await transcribe({
    model: getTranscriptionModel(),
    audio: buf,
  });
  return result.text ?? "";
}

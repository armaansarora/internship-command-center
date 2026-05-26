export interface ArtLabImageProviderInput {
  prompt: string;
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:3" | "3:4" | "21:9";
  seed?: number;
}

export interface ArtLabImageProviderResult {
  mode: "mock" | "real" | "placeholder";
  bytes: Buffer;
  contentType: "image/png" | "image/webp" | "image/jpeg";
  costCents: number;
  durationMs: number;
}

export interface ArtLabImageProvider {
  generateImage(input: ArtLabImageProviderInput): Promise<ArtLabImageProviderResult>;
}

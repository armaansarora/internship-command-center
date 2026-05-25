import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { validateReferencePhoto } from "./reference-attachment";

async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 150, b: 100 } },
  }).png().toBuffer();
}

describe("validateReferencePhoto", () => {
  it("accepts a 1024×1024 PNG", async () => {
    const bytes = await makePng(1024, 1024);
    const result = await validateReferencePhoto({ bytes, contentType: "image/png" });
    expect(result.ok).toBe(true);
    expect(result.width).toBe(1024);
    expect(result.height).toBe(1024);
    expect(result.sizeKB).toBeGreaterThan(0);
    expect(result.format).toBe("png");
  });

  it("rejects a 200×200 PNG (under 512px short edge)", async () => {
    const bytes = await makePng(200, 200);
    const result = await validateReferencePhoto({ bytes, contentType: "image/png" });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/too small/i);
    expect(result.width).toBe(200);
  });

  it("rejects 800×400 (short edge < 512)", async () => {
    const bytes = await makePng(800, 400);
    const result = await validateReferencePhoto({ bytes, contentType: "image/png" });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/too small/i);
  });

  it("rejects unsupported MIME type", async () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff]); // junk
    const result = await validateReferencePhoto({ bytes, contentType: "image/heic" });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/unsupported format/i);
  });

  it("rejects files over 10MB", async () => {
    const bytes = Buffer.alloc(11 * 1024 * 1024);
    const result = await validateReferencePhoto({ bytes, contentType: "image/png" });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/too large/i);
  });

  it("rejects unreadable bytes (corrupt image)", async () => {
    const bytes = Buffer.from("not actually an image");
    const result = await validateReferencePhoto({ bytes, contentType: "image/png" });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/unreadable/i);
  });

  it("accepts a JPEG", async () => {
    const bytes = await sharp({
      create: { width: 800, height: 800, channels: 3, background: { r: 100, g: 100, b: 100 } },
    }).jpeg().toBuffer();
    const result = await validateReferencePhoto({ bytes, contentType: "image/jpeg" });
    expect(result.ok).toBe(true);
    expect(result.format).toBe("jpeg");
  });
});

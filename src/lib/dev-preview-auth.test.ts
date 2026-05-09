import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSafeDevPreviewNextPath,
  getSupabaseAuthCookieBaseName,
  isDevPreviewAuthEnabled,
  isLocalAppHost,
  isLocalSupabaseStubUrl,
} from "./dev-preview-auth";

describe("dev preview auth helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("only enables preview auth for explicit local stub mode", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TOWER_DEV_PREVIEW_AUTH", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:3001");

    expect(isDevPreviewAuthEnabled()).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    expect(isDevPreviewAuthEnabled()).toBe(false);
  });

  it("rejects preview auth in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TOWER_DEV_PREVIEW_AUTH", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:3001");

    expect(isDevPreviewAuthEnabled()).toBe(false);
  });

  it("recognizes local app and stub origins", () => {
    expect(isLocalAppHost("localhost")).toBe(true);
    expect(isLocalAppHost("127.0.0.1")).toBe(true);
    expect(isLocalAppHost("interntower.com")).toBe(false);
    expect(isLocalSupabaseStubUrl("http://localhost:3001")).toBe(true);
    expect(isLocalSupabaseStubUrl("https://project.supabase.co")).toBe(false);
  });

  it("derives the Supabase SSR auth cookie name from the project URL", () => {
    expect(getSupabaseAuthCookieBaseName("http://localhost:3001")).toBe(
      "sb-localhost-auth-token",
    );
    expect(
      getSupabaseAuthCookieBaseName("https://jzrsrruugcajohvvmevg.supabase.co"),
    ).toBe("sb-jzrsrruugcajohvvmevg-auth-token");
  });

  it("only lets preview login redirect back to safe in-app page paths", () => {
    expect(getSafeDevPreviewNextPath("/war-room?case=1")).toBe(
      "/war-room?case=1",
    );
    expect(getSafeDevPreviewNextPath("//evil.test")).toBe("/penthouse");
    expect(getSafeDevPreviewNextPath("https://evil.test")).toBe("/penthouse");
    expect(getSafeDevPreviewNextPath("/api/stripe/checkout")).toBe("/penthouse");
    expect(getSafeDevPreviewNextPath(null)).toBe("/penthouse");
  });
});

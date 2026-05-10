import { describe, it, expect, vi, beforeEach } from "vitest";

const { setSpy, getSpy, revalidateSpy, requireUserSpy, isProdSpy } = vi.hoisted(
  () => ({
    setSpy: vi.fn(),
    getSpy: vi.fn(),
    revalidateSpy: vi.fn(),
    requireUserSpy: vi.fn(async () => ({ id: "user-1" })),
    isProdSpy: vi.fn(() => false),
  }),
);

vi.mock("next/headers", () => ({
  cookies: async () => ({ set: setSpy, get: getSpy }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidateSpy,
}));

vi.mock("@/lib/supabase/server", () => ({
  requireUser: requireUserSpy,
}));

vi.mock("@/lib/env", () => ({
  isProd: isProdSpy,
}));

import { toggleFocusMode } from "./focus-mode";

describe("toggleFocusMode", () => {
  beforeEach(() => {
    setSpy.mockReset();
    getSpy.mockReset();
    revalidateSpy.mockReset();
    requireUserSpy.mockClear();
    isProdSpy.mockReset();
    isProdSpy.mockReturnValue(false);
  });

  it("with no prior cookie sets value '1' and returns focusMode=true", async () => {
    getSpy.mockReturnValue(undefined);
    const result = await toggleFocusMode();
    expect(result).toEqual({ focusMode: true });
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy.mock.calls[0][0]).toBe("tower_focus_mode");
    expect(setSpy.mock.calls[0][1]).toBe("1");
  });

  it("with cookie='0' flips to '1'", async () => {
    getSpy.mockReturnValue({ value: "0" });
    const result = await toggleFocusMode();
    expect(result).toEqual({ focusMode: true });
    expect(setSpy.mock.calls[0][1]).toBe("1");
  });

  it("with cookie='1' flips to '0'", async () => {
    getSpy.mockReturnValue({ value: "1" });
    const result = await toggleFocusMode();
    expect(result).toEqual({ focusMode: false });
    expect(setSpy.mock.calls[0][1]).toBe("0");
  });

  it("calls revalidatePath('/', 'layout') exactly once", async () => {
    getSpy.mockReturnValue(undefined);
    await toggleFocusMode();
    expect(revalidateSpy).toHaveBeenCalledTimes(1);
    expect(revalidateSpy).toHaveBeenCalledWith("/", "layout");
  });

  it("writes the cookie with the locked options (path, maxAge, sameSite, httpOnly, secure)", async () => {
    getSpy.mockReturnValue(undefined);
    isProdSpy.mockReturnValue(true);
    await toggleFocusMode();
    expect(setSpy.mock.calls[0][2]).toEqual({
      path: "/",
      maxAge: 31_536_000,
      sameSite: "lax",
      httpOnly: false,
      secure: true,
    });
  });

  it("uses secure=false in non-prod", async () => {
    getSpy.mockReturnValue(undefined);
    isProdSpy.mockReturnValue(false);
    await toggleFocusMode();
    expect(setSpy.mock.calls[0][2]).toMatchObject({ secure: false });
  });
});

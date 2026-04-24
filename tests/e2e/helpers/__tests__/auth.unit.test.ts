import { describe, it, expect } from "vitest";
import { buildAuthCookies } from "../auth";

describe("buildAuthCookies", () => {
  it("returns sb-access-token and sb-refresh-token cookies for user", () => {
    const cookies = buildAuthCookies({
      id: "00000000-0000-0000-0000-000000000001",
      email: "alice@example.com",
    });
    expect(cookies).toHaveLength(2);
    const names = cookies.map((c) => c.name).sort();
    expect(names).toEqual(["sb-access-token", "sb-refresh-token"]);
  });

  it("sets httpOnly, Lax sameSite, localhost domain, root path", () => {
    const cookies = buildAuthCookies({
      id: "00000000-0000-0000-0000-000000000001",
      email: "alice@example.com",
    });
    for (const c of cookies) {
      expect(c.domain).toBe("localhost");
      expect(c.path).toBe("/");
      expect(c.httpOnly).toBe(true);
      expect(c.sameSite).toBe("Lax");
    }
  });

  it("access-token payload decodes to include the user id and email", () => {
    const cookies = buildAuthCookies({
      id: "00000000-0000-0000-0000-000000000001",
      email: "alice@example.com",
    });
    const access = cookies.find((c) => c.name === "sb-access-token");
    expect(access).toBeDefined();
    const [, payloadB64] = access!.value.split(".");
    const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    expect(decoded.sub).toBe("00000000-0000-0000-0000-000000000001");
    expect(decoded.email).toBe("alice@example.com");
  });

  it("different users produce different access-token values", () => {
    const aliceCookies = buildAuthCookies({
      id: "00000000-0000-0000-0000-000000000001",
      email: "alice@example.com",
    });
    const bobCookies = buildAuthCookies({
      id: "00000000-0000-0000-0000-000000000002",
      email: "bob@example.com",
    });
    const aliceToken = aliceCookies.find((c) => c.name === "sb-access-token")!;
    const bobToken = bobCookies.find((c) => c.name === "sb-access-token")!;
    expect(aliceToken.value).not.toBe(bobToken.value);
  });
});

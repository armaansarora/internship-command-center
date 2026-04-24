import { describe, it, expect } from "vitest";
import { buildAuthCookies } from "../auth";

const ALICE = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "alice@example.com",
};

describe("buildAuthCookies", () => {
  it("returns a single sb-localhost-auth-token cookie", () => {
    const cookies = buildAuthCookies(ALICE);
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe("sb-localhost-auth-token");
  });

  it("scopes cookie via url so it works on any origin", () => {
    const cookies = buildAuthCookies(ALICE);
    expect(cookies[0].url).toBe("http://localhost:3000");
    expect(cookies[0].httpOnly).toBe(true);
    expect(cookies[0].sameSite).toBe("Lax");
  });

  it("encodes session as base64url-prefixed JSON", () => {
    const [cookie] = buildAuthCookies(ALICE);
    expect(cookie.value.startsWith("base64-")).toBe(true);
    const encoded = cookie.value.substring("base64-".length);
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    const session = JSON.parse(decoded);
    expect(session.user.id).toBe(ALICE.id);
    expect(session.user.email).toBe(ALICE.email);
    expect(session.token_type).toBe("bearer");
    expect(typeof session.access_token).toBe("string");
    expect(typeof session.refresh_token).toBe("string");
  });

  it("access_token JWT payload includes user id and email", () => {
    const [cookie] = buildAuthCookies(ALICE);
    const session = JSON.parse(
      Buffer.from(
        cookie.value.substring("base64-".length),
        "base64url",
      ).toString("utf8"),
    );
    const [, payloadB64] = (session.access_token as string).split(".");
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString(),
    );
    expect(payload.sub).toBe(ALICE.id);
    expect(payload.email).toBe(ALICE.email);
    expect(payload.role).toBe("authenticated");
  });

  it("different users produce different access_token values", () => {
    const aliceCookie = buildAuthCookies(ALICE)[0];
    const bobCookie = buildAuthCookies({
      id: "00000000-0000-0000-0000-000000000002",
      email: "bob@example.com",
    })[0];
    expect(aliceCookie.value).not.toBe(bobCookie.value);
  });
});

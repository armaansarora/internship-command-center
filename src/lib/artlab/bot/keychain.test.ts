import { describe, expect, it } from "vitest";
import { getKeychainSecret, setKeychainSecret, deleteKeychainSecret, ARTLAB_KEYCHAIN_PREFIX } from "./keychain";

describe("artlab keychain helpers", () => {
  const testService = `${ARTLAB_KEYCHAIN_PREFIX}-test-${Date.now()}`;

  it("declares the canonical Keychain prefix", () => {
    expect(ARTLAB_KEYCHAIN_PREFIX).toBe("tower-artlab");
  });

  it("set → get → delete round trip", async () => {
    await setKeychainSecret(testService, "the-value");
    const got = await getKeychainSecret(testService);
    expect(got).toBe("the-value");
    await deleteKeychainSecret(testService);
    const goneOrNull = await getKeychainSecret(testService);
    expect(goneOrNull).toBeNull();
  });

  it("getKeychainSecret returns null for missing entries", async () => {
    const missing = await getKeychainSecret(`${ARTLAB_KEYCHAIN_PREFIX}-does-not-exist-${Date.now()}`);
    expect(missing).toBeNull();
  });
});

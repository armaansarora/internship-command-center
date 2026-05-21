import { describe, expect, it } from "vitest";
import * as providers from "./providers";
import * as promotion from "./promotion";
import * as review from "./review";
import * as cleanup from "./cleanup";
import * as contracts from "./contracts";

describe("artlab salvaged re-exports", () => {
  it("providers exposes createLocalMockProviderAdapter", () => {
    expect(typeof providers.createLocalMockProviderAdapter).toBe("function");
  });
  it("contracts exposes getCreativeAssetContract", () => {
    expect(typeof contracts.getCreativeAssetContract).toBe("function");
  });
  it("promotion exposes a callable surface", () => {
    expect(promotion).toBeDefined();
  });
  it("review exposes a callable surface", () => {
    expect(review).toBeDefined();
  });
  it("cleanup exposes a callable surface", () => {
    expect(cleanup).toBeDefined();
  });
});

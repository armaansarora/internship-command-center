import { describe, expect, it } from "vitest";
import * as artlabScheduler from "./index";

describe("artlab scheduler re-export", () => {
  it("re-exports runCreativeSlotScheduler", () => {
    expect(typeof artlabScheduler.runCreativeSlotScheduler).toBe("function");
  });
});

import { describe, expect, it } from "vitest";
import * as artlabBudget from "./index";

describe("artlab budget re-export", () => {
  it("re-exports reserveCreativeBudget from legacy ledger", () => {
    expect(typeof artlabBudget.reserveCreativeBudget).toBe("function");
  });

  it("re-exports releaseCreativeBudgetReservation", () => {
    expect(typeof artlabBudget.releaseCreativeBudgetReservation).toBe("function");
  });

  it("re-exports recordCreativeBudgetSpend", () => {
    expect(typeof artlabBudget.recordCreativeBudgetSpend).toBe("function");
  });
});

import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { REQUIRED_PROMOTION_PHRASE } from "./constants";

describe("REQUIRED_PROMOTION_PHRASE", () => {
  it("equals the exact phrase the firewall expects", () => {
    expect(REQUIRED_PROMOTION_PHRASE).toBe("approved for app");
  });

  it("is a string-literal-typed constant (assignable to literal-typed slots)", () => {
    // If `as const` ever drops, this assignment would widen to `string` and
    // fail a literal-type assignment site (e.g. contracts.ts
    // requiresExactApprovalPhrase). Type-level guard.
    const literal: "approved for app" = REQUIRED_PROMOTION_PHRASE;
    expect(literal).toBe("approved for app");
  });

  it("has zero remaining production literals of 'approved for app' under src/lib/artlab/", () => {
    // The whole point of consolidating is that the literal lives in exactly
    // one place: this file. Any production site that still hard-codes the
    // string defeats the purpose — it would drift silently on rename.
    // Excludes:
    //   - constants.ts (intentional canonical literal)
    //   - *.test.ts (tests may assert against the literal value)
    let stdout = "";
    try {
      stdout = execSync(
        `grep -rn '"approved for app"' src/lib/artlab/ --include='*.ts' | grep -v 'constants.ts' | grep -v '.test.ts' || true`,
        { cwd: process.cwd(), encoding: "utf8" },
      );
    } catch {
      stdout = "";
    }
    expect(stdout.trim()).toBe("");
  });
});

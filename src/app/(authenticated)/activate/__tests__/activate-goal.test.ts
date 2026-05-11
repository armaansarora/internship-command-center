/**
 * Activate-Complete goal proof.
 *
 * Asserts that `activate-client.tsx` fires `trackGoal("activate_complete", ...)`
 * from the closing beat (the `enterTower` callback that runs when the user
 * clicks "Enter the Tower" on the delivered phase). A content-based proof is
 * intentionally chosen over a full state-machine drive: the activation
 * gauntlet's intake → source → working → delivered flow is exercised by
 * higher-level integration coverage, and this file pins ONLY the GTM goal
 * wiring so a future refactor can't silently drop the conversion signal.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(
  resolve(process.cwd(), "src/app/(authenticated)/activate/activate-client.tsx"),
  "utf8",
);

describe("activate-client — trackGoal('activate_complete')", () => {
  it("imports trackGoal from the analytics helper", () => {
    expect(SOURCE).toMatch(
      /import\s+\{\s*[^}]*\btrackGoal\b[^}]*\}\s+from\s+["']@\/lib\/analytics\/plausible["']/,
    );
  });

  it("fires trackGoal('activate_complete', …) inside enterTower (closing beat)", () => {
    // Extract the body of enterTower so the assertion is scoped — a stray
    // call elsewhere should not satisfy this test.
    const enterTowerStart = SOURCE.indexOf("const enterTower = useCallback");
    expect(enterTowerStart).toBeGreaterThan(-1);

    const bodyEnd = SOURCE.indexOf("router.push(\"/penthouse\")", enterTowerStart);
    expect(bodyEnd).toBeGreaterThan(enterTowerStart);

    const body = SOURCE.slice(enterTowerStart, bodyEnd);
    expect(body).toMatch(/trackGoal\(\s*["']activate_complete["']/);
  });

  it("only fires the goal on success — skip() does NOT emit it", () => {
    // The skip() callback records an abandon outcome but must not fire the
    // GTM conversion goal. A grep within the skip() body proves the omission.
    const skipStart = SOURCE.indexOf("const skip = useCallback");
    expect(skipStart).toBeGreaterThan(-1);

    const skipBodyEnd = SOURCE.indexOf(
      "router.push(\"/penthouse\")",
      skipStart,
    );
    expect(skipBodyEnd).toBeGreaterThan(skipStart);

    const skipBody = SOURCE.slice(skipStart, skipBodyEnd);
    expect(skipBody).not.toMatch(/trackGoal\(\s*["']activate_complete["']/);
  });
});

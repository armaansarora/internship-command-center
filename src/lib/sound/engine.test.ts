import { describe, expect, it } from "vitest";
import { FLOORS } from "@/types/ui";
import { AMBIENT_BED_BY_FLOOR, type AmbientBedName } from "./engine";

/**
 * Cross-floor coherence regression test.
 *
 * Background: an earlier inlined map paired floors with the wrong ambient
 * beds (4 → Briefing, 3 → Rolodex, 6 → Situation). The mapping is now
 * declarative and this suite pins the only shape that matches the
 * floor-directory in `src/types/ui.ts`.
 */
describe("AMBIENT_BED_BY_FLOOR", () => {
  it("maps every authenticated floor to the matching room bed", () => {
    const expected: Record<string, AmbientBedName> = {
      PH:  "penthouse",
      "7": "war-room",
      "6": "rolodex",
      "5": "writing-room",
      "4": "situation-room",
      "3": "briefing-room",
      "2": "observatory",
      "1": "c-suite",
    };
    expect(AMBIENT_BED_BY_FLOOR).toEqual(expected);
  });

  it("omits the Lobby on purpose so reception stays silent", () => {
    expect(AMBIENT_BED_BY_FLOOR.L).toBeUndefined();
  });

  it("covers every authenticated floor in the directory", () => {
    const authenticated = FLOORS.filter((f) => f.id !== "L").map((f) => f.id);
    for (const id of authenticated) {
      expect(AMBIENT_BED_BY_FLOOR[id]).toBeTypeOf("string");
    }
  });

  it("never re-introduces the 4↔Briefing / 3↔Rolodex / 6↔Situation swap", () => {
    expect(AMBIENT_BED_BY_FLOOR["4"]).toBe("situation-room");
    expect(AMBIENT_BED_BY_FLOOR["3"]).toBe("briefing-room");
    expect(AMBIENT_BED_BY_FLOOR["6"]).toBe("rolodex");
  });
});

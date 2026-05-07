import { describe, expect, it } from "vitest";
import { PRIVACY_POLICY } from "./privacy";
import { TERMS_OF_SERVICE } from "./terms";

const DRAFT_MARKER = /\[(?:REVIEW|TODO|FIXME)\]|lorem ipsum/i;

function allParagraphs(): string[] {
  return [
    ...PRIVACY_POLICY.sections.flatMap((section) => section.body),
    ...TERMS_OF_SERVICE.sections.flatMap((section) => section.body),
  ];
}

describe("public legal copy", () => {
  it("does not render internal draft markers", () => {
    const offenders = allParagraphs().filter((paragraph) =>
      DRAFT_MARKER.test(paragraph),
    );

    expect(offenders).toEqual([]);
  });
});

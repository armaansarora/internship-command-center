// src/lib/artlab/sdk/canon/validate.ts
import type { ArtLabCanon } from "./load-canon";

export interface ArtLabCanonValidationIssue {
  code:
    | "palette-ref-unresolved"
    | "canon-empty-character-set"
    | "promoted-without-byteprotection-note"
    | "duplicate-floor-id"
    | "header-revised-at-future";
  message: string;
  sourcePath?: string;
  recordId?: string;
}

export interface ArtLabCanonValidationReport {
  ok: boolean;
  issues: readonly ArtLabCanonValidationIssue[];
  recordCount: number;
}

export function validateArtLabCanon(canon: ArtLabCanon): ArtLabCanonValidationReport {
  const issues: ArtLabCanonValidationIssue[] = [];
  const paletteIds = new Set(canon.palettes.map((p) => p.header.id));

  if (canon.characters.length === 0) {
    issues.push({
      code: "canon-empty-character-set",
      message: "canon contains zero character records",
    });
  }

  for (const c of canon.characters) {
    if (!paletteIds.has(c.paletteRef)) {
      issues.push({
        code: "palette-ref-unresolved",
        message: `character "${c.header.id}" references palette "${c.paletteRef}" which is not in canon`,
        recordId: c.header.id,
      });
    }
    if (c.promotionStatus === "promoted" && !/byte-protect/i.test(c.artDirectionNotes)) {
      issues.push({
        code: "promoted-without-byteprotection-note",
        message: `promoted character "${c.header.id}" must mention byte-protection in artDirectionNotes`,
        recordId: c.header.id,
      });
    }
    const revised = Date.parse(c.header.revisedAt);
    if (Number.isFinite(revised) && revised > Date.now()) {
      issues.push({
        code: "header-revised-at-future",
        message: `character "${c.header.id}" has a future revisedAt timestamp`,
        recordId: c.header.id,
      });
    }
  }

  for (const c of canon.characters) {
    if (!c.floorId.trim()) {
      issues.push({
        code: "duplicate-floor-id",
        message: `character "${c.header.id}" has empty floorId`,
        recordId: c.header.id,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    recordCount:
      canon.characters.length +
      canon.palettes.length +
      canon.typography.length +
      canon.motionLanguage.length +
      canon.spaceTokens.length +
      canon.iconographyRules.length,
  };
}

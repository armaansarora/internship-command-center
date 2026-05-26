// src/lib/foundry/cli/canon-validate.ts
import { loadFoundryCanon } from "@/lib/foundry/canon/load-canon";
import { validateFoundryCanon } from "@/lib/foundry/canon/validate";

export interface RunCanonValidateInput {
  canonRoot: string;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}

export async function runCanonValidateSubcommand(input: RunCanonValidateInput): Promise<number> {
  const canon = await loadFoundryCanon({ canonRoot: input.canonRoot });
  input.stdout(
    `canon loaded: ${canon.characters.length} characters, ${canon.palettes.length} palettes, ${canon.typography.length} typography, ${canon.motionLanguage.length} motion-language, ${canon.spaceTokens.length} space-tokens, ${canon.iconographyRules.length} iconography-rules (${canon.loadDurationMs} ms)`,
  );
  const report = validateFoundryCanon(canon);
  if (!report.ok) {
    for (const issue of report.issues) {
      input.stderr(`issue [${issue.code}] ${issue.recordId ? `record=${issue.recordId} ` : ""}${issue.message}`);
    }
    input.stderr(`canon failed: ${report.issues.length} issues`);
    return 1;
  }
  input.stdout("canon ok");
  return 0;
}

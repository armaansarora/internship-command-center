/**
 * Proof test: tables migrated to `Row<...>` must not re-grow a hand-rolled
 * snake_case `interface XxxRow { … }` (Fix #5).
 *
 * Before Fix #5, the same `interface ApplicationRow { id: string;
 * user_id: string; … }` was redeclared in four files — they could drift from
 * each other and from the Drizzle schema in `src/db/schema.ts`. Fix #5
 * introduced `src/db/database.types.ts` and migrated `ApplicationRow` to
 * `Row<"applications">`.
 *
 * This proof test fails CI if anyone reintroduces `interface ApplicationRow`
 * outside the allowed files. As future fixes migrate more tables, add their
 * `XxxRow` name to the `MIGRATED_TYPES` set so the same guard protects them.
 *
 * Other hand-rolled `XxxRow` interfaces (CompanyRow, InterviewRow, …) are
 * NOT yet guarded — they live in their own *-rest.ts files and will be
 * migrated table-by-table.
 */
import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "..", "..", "..");

/**
 * Snake_case row-shape types that already live in `database.types.ts`.
 * Adding a name here means: "all hand-rolled `interface <Name> {` is now
 * forbidden in src/; use the Row<…> helper instead."
 *
 * Excluded from this list (kept hand-rolled by intent):
 *   - CronRunRow, WaitlistInviteRow — tables not in Drizzle schema yet.
 *   - DeadlineRow — synthesized union over applications+offers, not a
 *     pure DB row.
 *   - TargetRow, TopDiscoveredRow — view-shaped projections.
 *   - MockRow, PlantedRow — test fixtures by name.
 */
const MIGRATED_TYPES = [
  "ApplicationRow",
  "AgentDispatchRow",
  "BaseResumeRow",
  "ContactRow",
  "CompanyRow",
  "DocumentRow",
  "NotificationRow",
  "CompanyEmbeddingRow",
  "JobEmbeddingRow",
  "CompBandsRow",
  "InterviewRow",
  "EmailRow",
  "CalendarEventRow",
  "CalendarRow",
  "OutreachRow",
  "InterviewPrepRow",
  "ApplicationPrepRow",
  "ProfileConsentRow",
  "ProfileStateRow",
  "StripeWebhookRow",
  "NotificationQueueRow",
  "UserRow",
  "ApprovedRow",
  "AppRow",
  "ApplicationMonthRow",
] as const;

/** Files allowed to reference the migrated type names. */
const ALLOWED_FILES = new Set<string>([
  "src/db/database.types.ts",
  "src/db/__tests__/row-type-guard.proof.test.ts",
]);

describe("row-type guard", () => {
  for (const name of MIGRATED_TYPES) {
    it(`forbids hand-rolled \`interface ${name} { … }\` declarations`, () => {
      let listing: string;
      try {
        // Use absolute pattern to avoid grep flag interpretation issues.
        listing = execSync(
          `grep -rln "^\\(export \\)\\?interface ${name} {" src/ --include='*.ts' --include='*.tsx' || true`,
          { cwd: REPO_ROOT, encoding: "utf8" },
        );
      } catch {
        listing = "";
      }

      const offenders = listing
        .split("\n")
        .filter(Boolean)
        .filter((rel) => !ALLOWED_FILES.has(rel));

      expect(offenders).toEqual([]);
    });
  }
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { glob } from "glob";

/**
 * R11 P2 — structural no-leak guard.
 *
 * Files that read/write `match_candidate_index` MUST NOT project contact
 * fields that could leak another user's Rolodex data.  The match index
 * stores anonymized keys (via HMAC) and company_context (a public company
 * name — already on the counterparty's networking_match_index row).
 * Contact names, emails, private notes, and phone numbers MUST NOT
 * appear in the match flow.
 *
 * Rule: any file referencing `match_candidate_index` cannot also contain
 * `contacts.name` / `contacts.email` / `contacts.private_note` /
 * `contacts.phone` / the plain camel-case equivalents (`.name`/`.email`
 * on a contacts-typed symbol is harder to grep — we stick to the
 * explicit snake-case projections from Supabase SELECTs).
 *
 * rebuild-match-index.ts IS allowed to SELECT `company_name` and
 * `last_contact_at` on contacts — those are the scoring inputs; the
 * algorithm discards the raw id (HMAC'd to anon key) before results hit
 * match_candidate_index.
 */

const FORBIDDEN_CONTACT_FIELDS = [
  "contacts.name",
  "contacts.email",
  "contacts.private_note",
  "contacts.phone",
  // Snake-case select-fragment patterns — e.g., `.select("id, name, email, private_note")`
  // on the `contacts` table.  Our `rebuild-match-index.ts` selects
  // `id, company_name, last_contact_at, user_id` — no name/email/private_note/phone.
];

describe("R11 P2 — no cross-user contact leak", () => {
  it("files touching match_candidate_index never reference forbidden contact fields", async () => {
    const files = await glob("src/**/*.{ts,tsx}", {
      ignore: [
        "src/**/__tests__/**",
        "src/**/*.test.*",
        "src/**/*.spec.*",
        "src/**/migrations/**",
      ],
      absolute: false,
    });

    const offenders: Array<{ file: string; field: string }> = [];
    for (const file of files) {
      const src = readFileSync(resolve(process.cwd(), file), "utf8");
      if (!src.includes("match_candidate_index")) continue;

      for (const field of FORBIDDEN_CONTACT_FIELDS) {
        if (src.includes(field)) {
          offenders.push({ file, field });
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("rebuild-match-index.ts selects only id/company_name/last_contact_at/user_id from contacts", () => {
    const body = readFileSync(
      resolve(process.cwd(), "src/lib/networking/rebuild-match-index.ts"),
      "utf8",
    );
    // The contacts SELECT must project exactly the scoring-relevant columns.
    // If someone ever adds `name` or `email` to this SELECT it's an instant
    // privacy regression — this test makes the change visible in review.
    const contactsSelectMatch = body.match(/\.from\("contacts"\)[\s\S]*?\.select\(\s*"([^"]+)"/);
    expect(contactsSelectMatch).not.toBeNull();
    if (contactsSelectMatch) {
      const cols = contactsSelectMatch[1].split(",").map((c) => c.trim());
      for (const c of cols) {
        expect(["id", "company_name", "last_contact_at", "user_id"]).toContain(c);
      }
    }
  });

  it("match-candidates route response never exposes raw contact ids", () => {
    const body = readFileSync(
      resolve(process.cwd(), "src/app/api/networking/match-candidates/route.ts"),
      "utf8",
    );
    // Response should project counterparty_anon_key, company_context,
    // edge_strength — never a raw `id` from contacts.
    expect(body).toMatch(/counterparty_anon_key/);
    expect(body).not.toMatch(/contacts\.id/);
  });
});

import { describe, it, expect } from "vitest";
import { matchEmailAgainstApplications } from "./parser";

/**
 * Unit tests for the pure email→application matcher. This logic was previously
 * only reachable through matchEmailToApplication (which hit the DB) and had no
 * direct coverage. Extracting the pure function (to kill the Gmail-sync N+1)
 * makes it directly testable.
 */
function email(from: string) {
  return {
    subject: "s",
    from,
    to: "me@example.org",
    snippet: "",
    bodyText: "",
  };
}

describe("matchEmailAgainstApplications", () => {
  it("matches by linked company domain, stripping www.", () => {
    const apps = [
      { id: "app-dom", company_name: "Acme", companies: [{ domain: "www.acme.com" }] },
    ];
    expect(matchEmailAgainstApplications(email("recruiter@acme.com"), apps)).toBe(
      "app-dom",
    );
  });

  it("falls back to a normalized company-name match in the domain", () => {
    const apps = [{ id: "app-name", company_name: "Stripe", companies: null }];
    expect(matchEmailAgainstApplications(email("jobs@stripe.com"), apps)).toBe(
      "app-name",
    );
  });

  it("prefers a domain match over a name match", () => {
    const apps = [
      { id: "by-name", company_name: "example", companies: null },
      { id: "by-domain", company_name: "Other", companies: [{ domain: "example.com" }] },
    ];
    expect(matchEmailAgainstApplications(email("hi@example.com"), apps)).toBe(
      "by-domain",
    );
  });

  it("ignores short company names (<4 chars) to avoid false positives", () => {
    const apps = [{ id: "ibm", company_name: "IBM", companies: null }];
    expect(
      matchEmailAgainstApplications(email("hr@ibmrecruiting.com"), apps),
    ).toBeUndefined();
  });

  it("returns undefined when nothing matches", () => {
    const apps = [
      { id: "a", company_name: "Acme", companies: [{ domain: "acme.com" }] },
    ];
    expect(
      matchEmailAgainstApplications(email("recruiter@zzz.com"), apps),
    ).toBeUndefined();
  });

  it("returns undefined when the from address has no domain", () => {
    const apps = [
      { id: "a", company_name: "Acme", companies: [{ domain: "acme.com" }] },
    ];
    expect(
      matchEmailAgainstApplications(email("not-an-email"), apps),
    ).toBeUndefined();
  });

  it("returns undefined for an empty applications list", () => {
    expect(matchEmailAgainstApplications(email("x@acme.com"), [])).toBeUndefined();
  });
});

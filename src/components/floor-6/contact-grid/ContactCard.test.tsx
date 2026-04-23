// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ContactForAgent } from "@/lib/db/queries/contacts-rest";
import { ContactCard } from "./ContactCard";

function make(tier: "warm" | "cooling" | "cold"): ContactForAgent {
  return {
    id: "c-1",
    name: "Sarah Lin",
    email: null,
    title: null,
    companyId: null,
    companyName: "Blackstone",
    relationship: "referral",
    linkedinUrl: null,
    phone: null,
    introducedBy: null,
    notes: null,
    source: null,
    lastContactAt: null,
    warmthLevel: tier,
    warmthScore: tier === "cold" ? 10 : tier === "cooling" ? 50 : 85,
    daysSinceContact: tier === "cold" ? 45 : tier === "cooling" ? 10 : 3,
  };
}

const FORBIDDEN_RED = [/#ef4{2,}/i, /239,\s*68,\s*68/, /#f44336/i];

describe("R8 — ContactCard cool-blue palette (non-negotiable)", () => {
  it("cold card does NOT contain any red hex or rgba", () => {
    const html = renderToStaticMarkup(<ContactCard contact={make("cold")} onEdit={() => {}} />);
    for (const pattern of FORBIDDEN_RED) expect(html).not.toMatch(pattern);
  });

  it("cooling card does NOT contain any red hex or rgba", () => {
    const html = renderToStaticMarkup(<ContactCard contact={make("cooling")} onEdit={() => {}} />);
    for (const pattern of FORBIDDEN_RED) expect(html).not.toMatch(pattern);
  });

  it("warm card does NOT contain the old green hex either", () => {
    const html = renderToStaticMarkup(<ContactCard contact={make("warm")} onEdit={() => {}} />);
    expect(html.toLowerCase()).not.toContain("#4ade80");
    // 74, 222, 128 is the rgb for #4ADE80
    expect(html).not.toMatch(/74,\s*222,\s*128/);
  });

  it("cold tier label is 'Cold' (no ALERT / DEAD / etc.)", () => {
    const html = renderToStaticMarkup(<ContactCard contact={make("cold")} onEdit={() => {}} />);
    expect(html).toMatch(/Cold/);
    expect(html.toLowerCase()).not.toMatch(/dead|lost|alert/);
  });
});

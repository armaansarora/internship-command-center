import { describe, it, expect } from "vitest";
import { findWarmIntros, cosine } from "./warm-intro-finder";

describe("cosine", () => {
  it("1 for identical vectors", () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1, 10);
  });
  it("0 for orthogonal", () => {
    expect(cosine([1, 0], [0, 1])).toBe(0);
  });
  it("0 for zero vectors", () => {
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });
  it("close to 1 for near-collinear", () => {
    expect(cosine([1, 0.1], [1, 0])).toBeGreaterThan(0.99);
  });
});

describe("findWarmIntros", () => {
  const companies = [
    { id: "apollo",     embedding: [1, 0, 0] },
    { id: "tiger",      embedding: [0, 1, 0] },
    { id: "blackstone", embedding: [0.96, 0.28, 0] },  // ~0.96 cosine to apollo
    { id: "anthropic",  embedding: [0, 0, 1] },
  ];

  it("returns proposals above threshold only", () => {
    const contacts = [
      { id: "c1", name: "Marcus", companyId: "apollo", applicationId: null },
      { id: "c2", name: "Elena",  companyId: "tiger",  applicationId: null },
    ];
    const activeApps = [{ id: "a1", companyId: "blackstone" }];
    const out = findWarmIntros({ contacts, companies, activeApps, threshold: 0.8, perUserCap: 5 });
    expect(out).toHaveLength(1);
    expect(out[0].contactId).toBe("c1");
    expect(out[0].applicationId).toBe("a1");
    expect(out[0].similarity).toBeGreaterThan(0.8);
  });

  it("skips contacts already linked to that application", () => {
    const contacts = [
      { id: "c1", name: "Marcus", companyId: "apollo", applicationId: "a1" },
    ];
    const activeApps = [{ id: "a1", companyId: "blackstone" }];
    const out = findWarmIntros({ contacts, companies, activeApps, threshold: 0.8, perUserCap: 5 });
    expect(out).toHaveLength(0);
  });

  it("caps output at perUserCap", () => {
    const contacts = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      name: `Marcus ${i}`,
      companyId: "apollo",
      applicationId: null,
    }));
    const activeApps = [{ id: "a1", companyId: "blackstone" }];
    const out = findWarmIntros({ contacts, companies, activeApps, threshold: 0.8, perUserCap: 2 });
    expect(out).toHaveLength(2);
  });

  it("sorts by similarity descending", () => {
    // apollo vs blackstone ≈ 0.96; a lower-similarity "warm-but-close" must come after.
    const companiesExtended = [
      ...companies,
      { id: "kkr", embedding: [0.82, 0.57, 0] },  // less similar
    ];
    const contacts = [
      { id: "c-kkr",    name: "Alan",  companyId: "kkr",    applicationId: null },
      { id: "c-apollo", name: "Marcus", companyId: "apollo", applicationId: null },
    ];
    const activeApps = [{ id: "a1", companyId: "blackstone" }];
    const out = findWarmIntros({
      contacts, companies: companiesExtended, activeApps, threshold: 0.8, perUserCap: 5,
    });
    expect(out).toHaveLength(2);
    expect(out[0].contactId).toBe("c-apollo");
    expect(out[0].similarity).toBeGreaterThan(out[1].similarity);
  });

  it("ignores contacts without a companyId", () => {
    const contacts = [{ id: "c1", name: "Marcus", companyId: null, applicationId: null }];
    const activeApps = [{ id: "a1", companyId: "blackstone" }];
    const out = findWarmIntros({ contacts, companies, activeApps, threshold: 0.5, perUserCap: 5 });
    expect(out).toHaveLength(0);
  });

  it("ignores applications without a target company", () => {
    const contacts = [{ id: "c1", name: "Marcus", companyId: "apollo", applicationId: null }];
    const activeApps = [{ id: "a1", companyId: null }];
    const out = findWarmIntros({ contacts, companies, activeApps, threshold: 0.5, perUserCap: 5 });
    expect(out).toHaveLength(0);
  });
});

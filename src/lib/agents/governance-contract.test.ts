import { describe, expect, it } from "vitest";
import {
  appendAgentGovernance,
  buildAgentEvidenceContext,
  buildAgentGovernanceContract,
} from "./governance-contract";

describe("Tower agent governance contract", () => {
  it("requires evidence, permission grades, previews, audits, and trust limits", () => {
    const contract = buildAgentGovernanceContract("cro");

    expect(contract).toContain("The Tower");
    expect(contract).toContain("Evidence standard");
    expect(contract).toContain("Direct fact");
    expect(contract).toContain("Inference");
    expect(contract).toContain("Permission ladder");
    expect(contract).toContain("Grade 5");
    expect(contract).toContain("Preview");
    expect(contract).toContain("Audit");
    expect(contract).toContain("private notes");
    expect(contract).toContain("cross-user");
  });

  it("appends the contract once without erasing the agent persona", () => {
    const original = "You are the CRO. Pipeline first.";
    const once = appendAgentGovernance(original, "cro");
    const twice = appendAgentGovernance(once, "cro");

    expect(once).toContain(original);
    expect(once).toContain("TOWER AGENT GOVERNANCE");
    expect(twice.match(/TOWER AGENT GOVERNANCE/g)).toHaveLength(1);
  });

  it("formats active evidence context without leaking private-note fields", () => {
    const context = buildAgentEvidenceContext({
      room: "War Room",
      subject: "Ramp - Backend Infrastructure Intern",
      summary: "Interview scheduled; outreach still needs approval.",
      evidence: [
        {
          id: "evidence:app-ramp:application-status",
          kind: "direct_fact",
          claim: "Ramp is in interview_scheduled status.",
          source: "applications.status",
          confidence: 96,
        },
      ],
      permissionGates: [
        {
          id: "approval:outreach-ramp",
          title: "Review Mina outreach",
          permissionGrade: 5,
          evidenceIds: ["evidence:app-ramp:application-status"],
        },
      ],
    });

    expect(context).toContain("ACTIVE TOWER EVIDENCE CONTEXT");
    expect(context).toContain("Ramp - Backend Infrastructure Intern");
    expect(context).toContain("evidence:app-ramp:application-status");
    expect(context).toContain("Direct fact");
    expect(context).toContain("Grade 5 approval waiting");
    const sensitiveFieldPattern = new RegExp(
      [`private${"Note"}`, `private${"_note"}`].join("|"),
    );
    expect(context).not.toMatch(sensitiveFieldPattern);
  });
});

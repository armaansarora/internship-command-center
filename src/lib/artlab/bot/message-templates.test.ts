import { describe, expect, it } from "vitest";
import {
  blockerNotice,
  bundleAck,
  cancelAck,
  clarificationPrompt,
  conceptApprovedAck,
  conceptBoardCaption,
  decisionsTemplate,
  esc,
  finalBoardCaption,
  gateReplyEcho,
  gateReplyNoMatch,
  healthSnapshot,
  helpTemplate,
  liveFloorUrl,
  promotedConfirmation,
  promotionAcceptedAck,
  queueList,
  shortRunId,
  statusList,
  statusOne,
  triggerAck,
  triggerWithPhotoAck,
  unknownCommandTemplate,
} from "./message-templates";

const SAMPLE_RUN_ID = "a4f3c721-3aa8-4d68-9e51-2c30fa6e6f7d";

describe("HTML message templates", () => {
  it("esc escapes < > & in user-supplied text", () => {
    expect(esc("<script>alert('x')</script>")).toBe("&lt;script&gt;alert('x')&lt;/script&gt;");
    expect(esc("AT&T")).toBe("AT&amp;T");
    expect(esc(undefined)).toBe("");
    expect(esc(42)).toBe("42");
  });

  it("shortRunId trims to 8 chars without dashes", () => {
    expect(shortRunId(SAMPLE_RUN_ID)).toBe("a4f3c721");
  });

  it("liveFloorUrl appends cache-busting v= query when runId given", () => {
    expect(liveFloorUrl("rolodex-lounge")).toBe("https://www.interntower.com/rolodex-lounge");
    expect(liveFloorUrl("rolodex-lounge", SAMPLE_RUN_ID)).toBe(
      "https://www.interntower.com/rolodex-lounge?v=a4f3c721",
    );
  });

  it("liveFloorUrl strips path-injection characters from space", () => {
    expect(liveFloorUrl("rolodex-lounge/../etc/passwd")).toBe(
      "https://www.interntower.com/rolodex-loungeetcpasswd",
    );
  });

  it("triggerAck includes subject, run id, ETA and HTML parse_mode", () => {
    const msg = triggerAck({
      displayName: "Sol Navarro",
      title: "Chief Networking Officer",
      spaceLabel: "Rolodex Lounge",
      runId: SAMPLE_RUN_ID,
    });
    expect(msg.parseMode).toBe("HTML");
    expect(msg.text).toContain("Sol Navarro");
    expect(msg.text).toContain("a4f3c721");
    expect(msg.text).toMatch(/ETA/);
  });

  it("triggerWithPhotoAck calls out the reference photo", () => {
    const msg = triggerWithPhotoAck({
      displayName: "Vera Bloom",
      runId: SAMPLE_RUN_ID,
    });
    expect(msg.text).toMatch(/reference photo/i);
  });

  it("bundleAck pluralizes correctly", () => {
    expect(bundleAck({ runCount: 1 }).text).toContain("1 linked run");
    expect(bundleAck({ runCount: 3 }).text).toContain("3 linked runs");
  });

  it("conceptBoardCaption attaches the 5-direction inline keyboard + refine + revise/reject", () => {
    const msg = conceptBoardCaption({
      displayName: "Sol Navarro",
      subtitle: "Chief Networking Officer · Rolodex Lounge",
      runId: SAMPLE_RUN_ID,
    });
    expect(msg.replyMarkup?.inline_keyboard[0]).toHaveLength(5);
    expect(msg.replyMarkup?.inline_keyboard[1]).toHaveLength(1);
    expect(msg.replyMarkup?.inline_keyboard[2]).toHaveLength(2);
  });

  it("conceptBoardCaption includes recommendation when provided", () => {
    const msg = conceptBoardCaption({
      displayName: "Sol Navarro",
      runId: SAMPLE_RUN_ID,
      recommendation: { laneIndex: 3, reasoning: "Brass-green palette stays canon." },
    });
    expect(msg.text).toMatch(/Recommended.*Direction 3/);
    expect(msg.text).toContain("Brass-green palette stays canon");
  });

  it("conceptApprovedAck names the lane + walks the next phases", () => {
    const msg = conceptApprovedAck({ laneIndex: 3, runId: SAMPLE_RUN_ID });
    expect(msg.text).toContain("Direction 3");
    expect(msg.text).toMatch(/canary.*production.*strict-qa.*final-review/);
  });

  it("finalBoardCaption attaches the approve+reject keyboard + live preview link", () => {
    const msg = finalBoardCaption({
      displayName: "Sol Navarro",
      spriteCount: 21,
      runId: SAMPLE_RUN_ID,
      space: "rolodex-lounge",
    });
    expect(msg.replyMarkup?.inline_keyboard[0]).toHaveLength(2);
    expect(msg.text).toContain("21");
    expect(msg.text).toContain("https://www.interntower.com/rolodex-lounge");
  });

  it("promotedConfirmation includes the cache-busted Live link with runId", () => {
    const msg = promotedConfirmation({
      displayName: "Sol Navarro",
      runId: SAMPLE_RUN_ID,
      assetCount: 21,
      space: "rolodex-lounge",
      spend: { actualCents: 136, capCents: 250 },
    });
    expect(msg.text).toContain("?v=a4f3c721");
    expect(msg.text).toContain("$1.36");
    expect(msg.text).toContain("of $2.50");
    expect(msg.text).toContain("/decisions a4f3c721");
  });

  it("promotionAcceptedAck shows the writing-to-public/art line", () => {
    const msg = promotionAcceptedAck({ runId: SAMPLE_RUN_ID });
    expect(msg.text).toContain("public/art");
  });

  it("blockerNotice surfaces phase + blocker", () => {
    const msg = blockerNotice({
      displayName: "Sol Navarro",
      runId: SAMPLE_RUN_ID,
      phase: "production",
      blocker: "provider-blocked",
    });
    expect(msg.text).toContain("production");
    expect(msg.text).toContain("provider-blocked");
  });

  it("clarificationPrompt attaches an inline keyboard per option", () => {
    const msg = clarificationPrompt({
      question: "That's wide-open. Want to narrow it?",
      options: [
        { id: "char", label: "👤 Character" },
        { id: "floor", label: "🏙️ Floor plate" },
      ],
    });
    expect(msg.replyMarkup?.inline_keyboard).toHaveLength(2);
  });

  it("gateReplyEcho echoes the raw user text safely", () => {
    const msg = gateReplyEcho({ rawText: "<weird>thing<weird>" });
    expect(msg.text).toContain("&lt;weird&gt;");
  });

  it("gateReplyNoMatch concept vs promotion produces distinct copy", () => {
    expect(gateReplyNoMatch({ surface: "concept", laneIndex: 2, reason: "no-run" }).text).toMatch(/approve direction 2/);
    expect(gateReplyNoMatch({ surface: "promotion", reason: "no-run" }).text).toMatch(/approved for app/);
  });

  it("statusList shows '(0)' when empty + lists short ids when populated", () => {
    expect(statusList({ runs: [] }).text).toMatch(/No active runs/);
    const populated = statusList({ runs: [SAMPLE_RUN_ID] }).text;
    expect(populated).toContain("a4f3c721");
  });

  it("statusOne renders phase, slots, spend", () => {
    const msg = statusOne({
      runId: SAMPLE_RUN_ID,
      phase: "production",
      slots: { running: 4, completed: 16, failed: 0 },
      spend: { actualCents: 142, monthlyCeilingCents: 2000 },
    });
    expect(msg.text).toContain("production");
    expect(msg.text).toContain("16 done");
    expect(msg.text).toContain("$1.42");
  });

  it("queueList handles empty + populated", () => {
    expect(queueList({ entries: [] }).text).toMatch(/Queue empty/);
    expect(queueList({ entries: [{ runId: SAMPLE_RUN_ID, priority: "default" }] }).text).toContain("default");
  });

  it("cancelAck mentions next sweep", () => {
    expect(cancelAck({ runId: SAMPLE_RUN_ID }).text).toMatch(/SIGTERM|sweep/);
  });

  it("healthSnapshot lists locks + runs + leases + spend", () => {
    const msg = healthSnapshot({
      activeLocks: 1,
      activeRuns: 2,
      activeLeases: 3,
      monthlySpendCents: 500,
      collectedAt: "2026-05-25T00:00:00Z",
    });
    expect(msg.text).toMatch(/locks/);
    expect(msg.text).toMatch(/runs/);
    expect(msg.text).toContain("$5.00");
  });

  it("helpTemplate includes triggers, gates, commands", () => {
    const msg = helpTemplate();
    expect(msg.text).toContain("Triggers");
    expect(msg.text).toContain("Gates");
    expect(msg.text).toContain("Commands");
    expect(msg.text).toContain("/decisions");
  });

  it("unknownCommandTemplate includes the command name + help body", () => {
    const msg = unknownCommandTemplate({ commandName: "dance" });
    expect(msg.text).toMatch(/dance/);
    expect(msg.text).toMatch(/Tower creative engine/);
  });

  it("decisionsTemplate handles empty + populated", () => {
    expect(decisionsTemplate({ runId: SAMPLE_RUN_ID, decisions: [] }).text).toMatch(/No brain decisions/);
    const populated = decisionsTemplate({
      runId: SAMPLE_RUN_ID,
      decisions: [{ kind: "generate-concept-prompts", summary: "5 distinct lanes drafted" }],
    });
    expect(populated.text).toContain("generate-concept-prompts");
    expect(populated.text).toContain("5 distinct lanes drafted");
  });

  it("all templates declare HTML parse_mode (no raw markdown)", () => {
    const templates = [
      triggerAck({ displayName: "X", runId: SAMPLE_RUN_ID }),
      bundleAck({ runCount: 1 }),
      conceptBoardCaption({ displayName: "X", runId: SAMPLE_RUN_ID }),
      finalBoardCaption({ displayName: "X", spriteCount: 1, runId: SAMPLE_RUN_ID }),
      promotedConfirmation({ displayName: "X", runId: SAMPLE_RUN_ID, assetCount: 1 }),
      blockerNotice({ displayName: "X", runId: SAMPLE_RUN_ID, phase: "p", blocker: "b" }),
      helpTemplate(),
    ];
    for (const t of templates) {
      expect(t.parseMode).toBe("HTML");
    }
  });
});

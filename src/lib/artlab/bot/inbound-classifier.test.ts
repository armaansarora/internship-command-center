import { describe, expect, it } from "vitest";
import { classifyInbound, ARTLAB_INBOUND_KINDS } from "./inbound-classifier";

describe("inbound message classifier", () => {
  it("declares the 6 inbound kinds", () => {
    expect(ARTLAB_INBOUND_KINDS).toEqual([
      "trigger", "trigger-with-photo", "gate-reply", "bundle", "command", "promotion",
    ]);
  });

  it("classifies plain text 'make Sol' as trigger", () => {
    const r = classifyInbound({ chat: { id: 1 }, message_id: 1, text: "make Sol Navarro", date: 0 });
    expect(r.kind).toBe("trigger");
  });

  it("classifies text + photo as trigger-with-photo with largest file_id", () => {
    const r = classifyInbound({
      chat: { id: 1 }, message_id: 1, date: 0,
      caption: "make Priya like this",
      photo: [
        { file_id: "small", file_unique_id: "s", width: 100, height: 100 },
        { file_id: "large", file_unique_id: "l", width: 800, height: 800 },
      ],
    });
    expect(r.kind).toBe("trigger-with-photo");
    expect(r.photoFileId).toBe("large");
  });

  it("classifies 'approve direction 2' as gate-reply", () => {
    expect(classifyInbound({ chat: { id: 1 }, message_id: 1, text: "approve direction 2", date: 0 }).kind).toBe("gate-reply");
  });

  it("classifies 'approved for app' (any case) as promotion", () => {
    expect(classifyInbound({ chat: { id: 1 }, message_id: 1, text: "Approved For App", date: 0 }).kind).toBe("promotion");
  });

  it("classifies '/status' as command", () => {
    const r = classifyInbound({ chat: { id: 1 }, message_id: 1, text: "/status", date: 0 });
    expect(r.kind).toBe("command");
    expect(r.commandName).toBe("status");
  });

  it("classifies bundle phrasing 'war room with Rafe in it' as bundle", () => {
    expect(classifyInbound({ chat: { id: 1 }, message_id: 1, text: "make the war room with Rafe in it", date: 0 }).kind).toBe("bundle");
  });
});

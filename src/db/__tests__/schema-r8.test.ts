import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import {
  userProfiles,
  contacts,
  contactEmbeddings,
  networkingMatchIndex,
} from "../schema";

describe("R8 schema additions", () => {
  it("userProfiles has networking consent columns", () => {
    const colNames = Object.keys(getTableColumns(userProfiles));
    expect(colNames).toEqual(expect.arrayContaining([
      "networkingConsentAt",
      "networkingRevokedAt",
      "networkingConsentVersion",
    ]));
  });

  it("contacts has privateNote column", () => {
    expect(Object.keys(getTableColumns(contacts))).toContain("privateNote");
  });

  it("exports contactEmbeddings with expected columns", () => {
    expect(contactEmbeddings).toBeDefined();
    const colNames = Object.keys(getTableColumns(contactEmbeddings));
    expect(colNames).toEqual(expect.arrayContaining(["contactId", "userId", "embedding", "updatedAt"]));
  });

  it("exports networkingMatchIndex with expected columns", () => {
    expect(networkingMatchIndex).toBeDefined();
    const colNames = Object.keys(getTableColumns(networkingMatchIndex));
    expect(colNames).toEqual(expect.arrayContaining(["id", "userId", "targetCompanyName", "createdAt"]));
  });
});

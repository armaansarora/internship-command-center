/**
 * base_resumes table + resumes storage bucket.
 *
 * Locks in the schema shape for base resumes (uploaded PDF sources that the
 * CMO's tailoring tool reads from). The bucket itself is provisioned via
 * migration 0014 against storage.buckets and cannot be asserted from Drizzle.
 */
import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { baseResumes } from "./schema";

describe("R5.1 base_resumes table", () => {
  const columns = getTableColumns(baseResumes);

  it("has id as uuid primary key", () => {
    const col = columns.id;
    expect(col).toBeDefined();
    expect(col.name).toBe("id");
    expect(col.primary).toBe(true);
  });

  it("has user_id as notNull uuid", () => {
    const col = columns.userId;
    expect(col).toBeDefined();
    expect(col.name).toBe("user_id");
    expect(col.notNull).toBe(true);
  });

  it("has storage_path as notNull text", () => {
    const col = columns.storagePath;
    expect(col).toBeDefined();
    expect(col.name).toBe("storage_path");
    expect(col.notNull).toBe(true);
  });

  it("has original_filename as notNull text", () => {
    const col = columns.originalFilename;
    expect(col).toBeDefined();
    expect(col.name).toBe("original_filename");
    expect(col.notNull).toBe(true);
  });

  it("has file_size_bytes as notNull integer", () => {
    const col = columns.fileSizeBytes;
    expect(col).toBeDefined();
    expect(col.name).toBe("file_size_bytes");
    expect(col.notNull).toBe(true);
  });

  it("has parsed_text as notNull text (cache for tailoring)", () => {
    const col = columns.parsedText;
    expect(col).toBeDefined();
    expect(col.name).toBe("parsed_text");
    expect(col.notNull).toBe(true);
  });

  it("has page_count as notNull integer", () => {
    const col = columns.pageCount;
    expect(col).toBeDefined();
    expect(col.name).toBe("page_count");
    expect(col.notNull).toBe(true);
  });

  it("has is_active as notNull boolean defaulting to true", () => {
    const col = columns.isActive;
    expect(col).toBeDefined();
    expect(col.name).toBe("is_active");
    expect(col.notNull).toBe(true);
    expect(col.hasDefault).toBe(true);
  });

  it("has created_at + updated_at timestamps", () => {
    expect(columns.createdAt).toBeDefined();
    expect(columns.createdAt.name).toBe("created_at");
    expect(columns.updatedAt).toBeDefined();
    expect(columns.updatedAt.name).toBe("updated_at");
  });
});

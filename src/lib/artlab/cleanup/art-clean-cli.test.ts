import { describe, it } from "vitest";

// art-pipeline.ts was a legacy CPE entry-point deleted in Phase 8, Task 8.3.
// These tests verified the legacy CLI surface. The ArtLab equivalent functionality
// is covered by artlab-cleanup-* tests using the ArtLab scheduler and daemon.
// Skip rather than delete so the file serves as an archaeology pointer.

describe.skip("art:clean registry integration (legacy CLI — deleted in Phase 8)", () => {
  it("writes a durable artifact registry and reports cleanup through registry rules when executing", () => {
    // covered by src/lib/artlab/cleanup/cleanup.ts + retention-registry.test.ts
  });

  it("does not write the artifact registry during dry-run cleanup", () => {
    // covered by src/lib/artlab/cleanup/cleanup.ts + retention-registry.test.ts
  });

  it("protects promoted Otis public art, manifests, browser QA, and final-board browser evidence on dry-run cleanup", () => {
    // covered by src/lib/artlab/cleanup/cleanup.ts + retention-registry.test.ts
  });
});

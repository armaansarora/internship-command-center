import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  alertsFileSchema,
  extractRunbookAnchors,
  loadAlertsFromFile,
  parseAlertsYaml,
  validateAlerts,
  verifyRunbookAnchors,
} from "./sentry-alerts";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const ALERTS_PATH = resolve(REPO_ROOT, "sentry", "alerts.yaml");
const RUNBOOK_PATH = resolve(REPO_ROOT, "docs", "RUNBOOK.md");

describe("sentry/alerts.yaml", () => {
  it("parses and validates the shipped YAML", () => {
    const alerts = loadAlertsFromFile(ALERTS_PATH);
    expect(alerts.version).toBe(1);
    expect(alerts.alerts.length).toBeGreaterThan(0);
    for (const rule of alerts.alerts) {
      expect(rule.id).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(rule.window_minutes).toBeGreaterThan(0);
      expect(rule.threshold).toBeGreaterThan(0);
      expect(rule.runbook).toContain("docs/RUNBOOK.md#");
    }
  });

  it("includes the three required SentryRules contracts", () => {
    const alerts = loadAlertsFromFile(ALERTS_PATH);
    const ids = alerts.alerts.map((rule) => rule.id);
    expect(ids).toContain("agent_stream_failures");
    expect(ids).toContain("outreach_sender_send_failures");
    expect(ids).toContain("ai_quota_rpc_errors");
  });

  it("points every alert at an existing runbook anchor", () => {
    const alerts = loadAlertsFromFile(ALERTS_PATH);
    const markdown = readFileSync(RUNBOOK_PATH, "utf8");
    const check = verifyRunbookAnchors(alerts, markdown);
    if (!check.ok) {
      throw new Error(
        `runbook anchors missing: ${check.missing.join(", ")}`,
      );
    }
    expect(check.ok).toBe(true);
  });

  it("rejects duplicate alert ids", () => {
    const bad = {
      version: 1,
      alerts: [
        {
          id: "dup_alert",
          name: "dup",
          query: "tags.event:x",
          window_minutes: 1,
          threshold: 1,
          comparator: "gt",
          runbook: "docs/RUNBOOK.md#dup_alert",
        },
        {
          id: "dup_alert",
          name: "dup 2",
          query: "tags.event:y",
          window_minutes: 1,
          threshold: 1,
          comparator: "gt",
          runbook: "docs/RUNBOOK.md#dup_alert",
        },
      ],
    };
    expect(() => validateAlerts(bad)).toThrow(/Duplicate alert id/);
  });

  it("rejects a non-positive window or threshold", () => {
    const bad = {
      version: 1,
      alerts: [
        {
          id: "bad_alert",
          name: "bad",
          query: "tags.event:x",
          window_minutes: 0,
          threshold: 1,
          comparator: "gt",
          runbook: "docs/RUNBOOK.md#bad",
        },
      ],
    };
    expect(alertsFileSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unsupported comparator", () => {
    const bad = {
      version: 1,
      alerts: [
        {
          id: "weird_alert",
          name: "weird",
          query: "tags.event:x",
          window_minutes: 5,
          threshold: 5,
          comparator: "lt",
          runbook: "docs/RUNBOOK.md#weird",
        },
      ],
    };
    expect(alertsFileSchema.safeParse(bad).success).toBe(false);
  });
});

describe("YAML parser", () => {
  it("round-trips a representative shape", () => {
    const yaml = [
      "version: 1",
      "alerts:",
      '  - id: example_alert',
      '    name: "Example > 5/min"',
      '    query: "tags.event:example.failed"',
      '    window_minutes: 1',
      '    threshold: 5',
      '    comparator: "gt"',
      '    runbook: "docs/RUNBOOK.md#example_alert"',
      "",
    ].join("\n");
    const parsed = parseAlertsYaml(yaml);
    const validated = validateAlerts(parsed);
    expect(validated.alerts).toHaveLength(1);
    expect(validated.alerts[0]).toMatchObject({
      id: "example_alert",
      name: "Example > 5/min",
      query: "tags.event:example.failed",
      window_minutes: 1,
      threshold: 5,
      comparator: "gt",
    });
  });

  it("skips comments and blank lines", () => {
    const yaml = [
      "# leading comment",
      "version: 1",
      "",
      "alerts:    # trailing comment",
      '  - id: a',
      '    name: "A"',
      '    query: "tags.event:a"',
      '    window_minutes: 1',
      '    threshold: 1',
      '    comparator: "gt"',
      '    runbook: "docs/RUNBOOK.md#a"',
    ].join("\n");
    expect(() => validateAlerts(parseAlertsYaml(yaml))).not.toThrow();
  });
});

describe("runbook anchor extraction", () => {
  it("collects every '##' heading", () => {
    const markdown = [
      "# top",
      "",
      "## first_anchor",
      "body",
      "",
      "## second_anchor",
      "more body",
      "",
      "### nested-not-counted",
    ].join("\n");
    const anchors = extractRunbookAnchors(markdown);
    expect(anchors.has("first_anchor")).toBe(true);
    expect(anchors.has("second_anchor")).toBe(true);
    expect(anchors.has("nested-not-counted")).toBe(false);
  });
});

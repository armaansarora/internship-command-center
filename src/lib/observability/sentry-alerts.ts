/**
 * sentry-alerts — Schema and helpers for the versioned Sentry alert rules
 * defined in `sentry/alerts.yaml`.
 *
 * The CLI entry point (`scripts/validate-sentry-alerts.ts`) and the unit
 * test (`./sentry-alerts.test.ts`) both consume this module. We deliberately
 * own a tiny YAML parser here rather than add a dependency — the schema is
 * narrow (one literal version + a flat list of objects with primitive
 * fields) and the validator must run from `npm test` and CI without
 * additional setup.
 */
import { readFileSync } from "node:fs";
import z from "zod/v4";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const alertRuleSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "alert id must be snake_case starting with a lowercase letter",
    ),
  name: z.string().min(1),
  query: z.string().min(1),
  window_minutes: z.number().int().positive(),
  threshold: z.number().int().positive(),
  comparator: z.enum(["gt", "gte"]),
  runbook: z.string().min(1),
});

export const alertsFileSchema = z.object({
  version: z.literal(1),
  alerts: z.array(alertRuleSchema).min(1),
});

export type AlertRule = z.infer<typeof alertRuleSchema>;
export type AlertsFile = z.infer<typeof alertsFileSchema>;

// ---------------------------------------------------------------------------
// Minimal YAML parser — narrow to our schema shape.
//
// Supports comments, blank lines, double-quoted strings, bare scalars,
// integers, and list-of-maps. Anything beyond that throws — better to fail
// loudly than to silently misinterpret a fancy YAML construct.
// ---------------------------------------------------------------------------

type YamlValue = string | number | boolean | YamlValue[] | YamlMap;
interface YamlMap {
  [key: string]: YamlValue;
}

function stripComment(line: string): string {
  // Strip `#` comments that are not inside a double-quoted string.
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i - 1] !== "\\") inString = !inString;
    if (ch === "#" && !inString) return line.slice(0, i);
  }
  return line;
}

function parseScalar(raw: string): YamlValue {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "";
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\\n/g, "\n");
  }
  if (/^-?\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return Number.parseFloat(trimmed);
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return trimmed;
}

interface PreparedLine {
  raw: string;
  indent: number;
  content: string;
}

function prepareLines(source: string): PreparedLine[] {
  return source
    .split(/\r?\n/)
    .map((rawLine) => {
      const stripped = stripComment(rawLine).replace(/\s+$/, "");
      const indent = stripped.length - stripped.trimStart().length;
      return { raw: rawLine, indent, content: stripped.trimStart() };
    })
    .filter((entry) => entry.content.length > 0);
}

function parseKeyValue(content: string): { key: string; value: string } {
  const idx = content.indexOf(":");
  if (idx === -1) {
    throw new Error(`Expected "key:" in YAML line: ${content}`);
  }
  return {
    key: content.slice(0, idx).trim(),
    value: content.slice(idx + 1),
  };
}

function parseBlock(
  lines: PreparedLine[],
  cursor: { index: number },
  minIndent: number,
): YamlValue {
  if (cursor.index >= lines.length) return {};
  const first = lines[cursor.index];
  if (first.content.startsWith("- ") || first.content === "-") {
    return parseList(lines, cursor, minIndent);
  }
  return parseMap(lines, cursor, minIndent);
}

function parseMap(
  lines: PreparedLine[],
  cursor: { index: number },
  minIndent: number,
): YamlMap {
  const map: YamlMap = {};
  while (cursor.index < lines.length) {
    const line = lines[cursor.index];
    if (line.indent < minIndent) break;
    if (line.indent !== minIndent) {
      throw new Error(
        `Unexpected indent in YAML map (expected ${minIndent}, got ${line.indent}): ${line.raw}`,
      );
    }
    const { key, value } = parseKeyValue(line.content);
    cursor.index += 1;
    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      if (cursor.index < lines.length && lines[cursor.index].indent > minIndent) {
        const childIndent = lines[cursor.index].indent;
        map[key] = parseBlock(lines, cursor, childIndent);
      } else {
        map[key] = "";
      }
    } else {
      map[key] = parseScalar(trimmedValue);
    }
  }
  return map;
}

function parseList(
  lines: PreparedLine[],
  cursor: { index: number },
  minIndent: number,
): YamlValue[] {
  const out: YamlValue[] = [];
  while (cursor.index < lines.length) {
    const line = lines[cursor.index];
    if (line.indent < minIndent) break;
    if (line.indent !== minIndent) {
      throw new Error(
        `Unexpected indent in YAML list (expected ${minIndent}, got ${line.indent}): ${line.raw}`,
      );
    }
    if (!line.content.startsWith("-")) break;

    const rest = line.content.slice(1).trimStart();
    cursor.index += 1;

    if (rest.length === 0) {
      if (cursor.index < lines.length && lines[cursor.index].indent > minIndent) {
        const childIndent = lines[cursor.index].indent;
        out.push(parseBlock(lines, cursor, childIndent));
      } else {
        out.push("");
      }
      continue;
    }

    if (rest.includes(":")) {
      const { key, value } = parseKeyValue(rest);
      const inlineMap: YamlMap = {};
      const trimmedValue = value.trim();
      // The `- ` consumes 2 columns of indent; subsequent keys for this map
      // sit at `minIndent + 2`.
      const inlineKeyIndent = minIndent + 2;
      if (trimmedValue.length === 0) {
        if (
          cursor.index < lines.length &&
          lines[cursor.index].indent > inlineKeyIndent
        ) {
          const childIndent = lines[cursor.index].indent;
          inlineMap[key] = parseBlock(lines, cursor, childIndent);
        } else {
          inlineMap[key] = "";
        }
      } else {
        inlineMap[key] = parseScalar(trimmedValue);
      }
      while (cursor.index < lines.length) {
        const sub = lines[cursor.index];
        if (sub.indent !== inlineKeyIndent) break;
        if (sub.content.startsWith("-")) break;
        const kv = parseKeyValue(sub.content);
        cursor.index += 1;
        const subTrimmed = kv.value.trim();
        if (subTrimmed.length === 0) {
          if (
            cursor.index < lines.length &&
            lines[cursor.index].indent > inlineKeyIndent
          ) {
            const childIndent = lines[cursor.index].indent;
            inlineMap[kv.key] = parseBlock(lines, cursor, childIndent);
          } else {
            inlineMap[kv.key] = "";
          }
        } else {
          inlineMap[kv.key] = parseScalar(subTrimmed);
        }
      }
      out.push(inlineMap);
    } else {
      out.push(parseScalar(rest));
    }
  }
  return out;
}

export function parseAlertsYaml(source: string): unknown {
  const lines = prepareLines(source);
  const cursor = { index: 0 };
  const result = parseMap(lines, cursor, 0);
  if (cursor.index !== lines.length) {
    throw new Error(
      `Trailing YAML content at line ${cursor.index + 1}: ${lines[cursor.index].raw}`,
    );
  }
  return result;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function validateAlerts(parsed: unknown): AlertsFile {
  const result = alertsFileSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `sentry/alerts.yaml failed schema validation: ${z.prettifyError(result.error)}`,
    );
  }
  assertUniqueAlertIds(result.data);
  return result.data;
}

export function loadAlertsFromFile(yamlPath: string): AlertsFile {
  const raw = readFileSync(yamlPath, "utf8");
  const parsed = parseAlertsYaml(raw);
  return validateAlerts(parsed);
}

export function assertUniqueAlertIds(alerts: AlertsFile): void {
  const seen = new Set<string>();
  for (const rule of alerts.alerts) {
    if (seen.has(rule.id)) {
      throw new Error(`Duplicate alert id: ${rule.id}`);
    }
    seen.add(rule.id);
  }
}

/**
 * Headings in the runbook are `## anchor-name`. We match the heading
 * verbatim against the `#anchor` fragment in each rule's `runbook` field.
 */
export function extractRunbookAnchors(markdown: string): Set<string> {
  const anchors = new Set<string>();
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^##\s+(\S+)\s*$/.exec(line);
    if (match) anchors.add(match[1].toLowerCase());
  }
  return anchors;
}

export function verifyRunbookAnchors(
  alerts: AlertsFile,
  runbookMarkdown: string,
): { ok: true } | { ok: false; missing: string[] } {
  const anchors = extractRunbookAnchors(runbookMarkdown);
  const missing: string[] = [];
  for (const rule of alerts.alerts) {
    const hash = rule.runbook.split("#")[1];
    if (!hash) {
      missing.push(`${rule.id} (no '#' fragment in runbook field)`);
      continue;
    }
    if (!anchors.has(hash.toLowerCase())) {
      missing.push(`${rule.id} → ${rule.runbook}`);
    }
  }
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

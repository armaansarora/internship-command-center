// src/lib/artlab/cli/ui/widgets.ts
//
// Composable widgets: banner, kv list, status dot, step progress, sparkline,
// summary footer. All styled in Tower's gold-on-navy aesthetic.

import {
  bold,
  center,
  colorFail,
  colorInfo,
  colorMuted,
  colorOk,
  colorWarn,
  padRight,
  towerCream,
  towerGold,
  towerGoldBright,
  towerSlate,
  visibleLength,
} from "./ansi";
import { box, divider, getTerminalWidth } from "./box";

export interface BannerInput {
  title?: string;
  subtitle?: string;
  version?: string;
}

export function banner(input: BannerInput = {}): string {
  const title = input.title ?? "ArtLab";
  const subtitle = input.subtitle ?? "The Tower creative engine";
  const version = input.version ?? "v1.0";
  const width = getTerminalWidth();
  const out: string[] = [];
  out.push(divider(width));
  out.push("");
  const titleLine = `${towerGoldBright(bold(title))}  ${towerSlate("·")}  ${towerCream(subtitle)}  ${towerSlate(version)}`;
  out.push(center(titleLine, width));
  out.push("");
  out.push(divider(width));
  return out.join("\n");
}

export type StatusKind = "ok" | "warn" | "fail" | "info" | "muted" | "active";

export function statusDot(kind: StatusKind): string {
  switch (kind) {
    case "ok": return colorOk("●");
    case "warn": return colorWarn("●");
    case "fail": return colorFail("●");
    case "info": return colorInfo("●");
    case "active": return towerGoldBright("◐");
    case "muted":
    default: return colorMuted("○");
  }
}

export interface KvRow { label: string; value: string; status?: StatusKind; }

export function kvList(rows: KvRow[], opts: { labelWidth?: number } = {}): string {
  const labelWidth = opts.labelWidth ?? Math.max(...rows.map((r) => visibleLength(r.label)));
  return rows
    .map((row) => {
      const label = towerSlate(padRight(row.label, labelWidth));
      const dot = row.status ? `${statusDot(row.status)} ` : "  ";
      return `  ${dot}${label}  ${towerCream(row.value)}`;
    })
    .join("\n");
}

export interface StepInput {
  step: number;
  total: number;
  label: string;
  state: "running" | "done" | "fail" | "pending";
}

export function step(input: StepInput): string {
  const counter = towerSlate(`[${input.step}/${input.total}]`);
  const marker =
    input.state === "done" ? colorOk("✓")
    : input.state === "fail" ? colorFail("✗")
    : input.state === "running" ? towerGoldBright("◐")
    : colorMuted("·");
  const labelColor =
    input.state === "done" ? towerCream
    : input.state === "fail" ? colorFail
    : input.state === "running" ? towerGoldBright
    : towerSlate;
  return `  ${counter}  ${marker}  ${labelColor(input.label)}`;
}

export function bar(percent: number, width = 24): string {
  const clamped = Math.max(0, Math.min(1, percent));
  const filledChars = Math.round(clamped * width);
  const filled = towerGoldBright("▰".repeat(filledChars));
  const empty = towerSlate("▱".repeat(width - filledChars));
  return `${filled}${empty} ${towerCream(`${Math.round(clamped * 100)}%`)}`;
}

export function asset(label: string, kind: StatusKind = "info"): string {
  return `${statusDot(kind)} ${towerCream(label)}`;
}

export function summaryFooter(input: {
  label: string;
  state: "ok" | "fail" | "partial";
  notes?: string[];
}): string {
  const tag =
    input.state === "ok" ? colorOk(bold(" PASS "))
    : input.state === "partial" ? colorWarn(bold(" PARTIAL "))
    : colorFail(bold(" FAIL "));
  const lines: string[] = [];
  lines.push(`${tag}  ${towerCream(input.label)}`);
  if (input.notes) {
    for (const note of input.notes) lines.push(`        ${towerSlate("·")} ${towerSlate(note)}`);
  }
  return box(lines, { title: "Result" });
}

export function header(title: string, subtitle?: string): string {
  const w = getTerminalWidth();
  const top = divider(w);
  const lead = `  ${towerGoldBright(bold("▸"))}  ${towerCream(bold(title))}`;
  const sub = subtitle ? `  ${towerSlate(subtitle)}` : "";
  return `${top}\n${lead}${sub}\n${divider(w)}`;
}

export function muted(text: string): string {
  return towerSlate(text);
}

export function gold(text: string): string {
  return towerGold(text);
}

export function highlight(text: string): string {
  return towerGoldBright(bold(text));
}

// src/lib/artlab/cli/ui/box.ts
//
// Unicode box / panel / divider primitives. Tower aesthetic: gold outline,
// crowned by a title bar with a small "▸" mark.

import { center, padRight, towerGold, towerCream, towerSlate, visibleLength } from "./ansi";

const TL = "╭";
const TR = "╮";
const BL = "╰";
const BR = "╯";
const H = "─";
const V = "│";
const T_DOWN = "┬";
const T_UP = "┴";

export interface BoxOptions {
  title?: string;
  subtitle?: string;
  width?: number;
  align?: "left" | "center";
  padding?: number;
}

export function getTerminalWidth(): number {
  const cols = process.stdout.columns;
  if (typeof cols === "number" && cols > 20) return Math.min(cols, 120);
  return 80;
}

export function divider(width = getTerminalWidth(), char = "─"): string {
  return towerGold(char.repeat(width));
}

export function thinDivider(width = getTerminalWidth()): string {
  return towerSlate("·".repeat(width));
}

function topBar(width: number, title?: string, subtitle?: string): string {
  if (!title) return towerGold(TL + H.repeat(width - 2) + TR);
  const titleText = ` ▸ ${title}${subtitle ? ` ${towerSlate(`— ${subtitle}`)}` : ""} `;
  const titleWidth = visibleLength(titleText);
  const remaining = Math.max(2, width - 2 - titleWidth);
  const left = 2;
  const right = remaining - left;
  return (
    towerGold(TL + H.repeat(left)) +
    towerGold(titleText) +
    towerGold(H.repeat(right) + TR)
  );
}

function bottomBar(width: number): string {
  return towerGold(BL + H.repeat(width - 2) + BR);
}

function side(): string {
  return towerGold(V);
}

export function box(lines: string[], opts: BoxOptions = {}): string {
  const width = opts.width ?? getTerminalWidth();
  const padding = opts.padding ?? 1;
  const innerWidth = width - 2 - padding * 2;
  // Expand multi-line strings into individual lines so each gets its own bordered row.
  const expanded = lines.flatMap((line) => line.split("\n"));
  const out: string[] = [topBar(width, opts.title, opts.subtitle)];
  const padBlank = " ".repeat(padding);
  if (padding > 0) {
    out.push(side() + " ".repeat(width - 2) + side());
  }
  for (const raw of expanded) {
    const padded = opts.align === "center"
      ? center(raw, innerWidth)
      : padRight(raw, innerWidth);
    out.push(side() + padBlank + padded + padBlank + side());
  }
  if (padding > 0) {
    out.push(side() + " ".repeat(width - 2) + side());
  }
  out.push(bottomBar(width));
  return out.join("\n");
}

export function panel(title: string, body: string, opts: Omit<BoxOptions, "title"> = {}): string {
  return box(body.split("\n"), { ...opts, title });
}

export interface ColumnSpec {
  header: string;
  width: number;
  align?: "left" | "right";
}

export function table(columns: ColumnSpec[], rows: string[][]): string {
  const lines: string[] = [];
  const headerCells = columns.map((c) =>
    towerCream(c.align === "right" ? padLeftRespectingColor(c.header, c.width) : padRight(c.header, c.width)),
  );
  lines.push(headerCells.join(towerSlate("  ")));
  lines.push(towerSlate(columns.map((c) => "─".repeat(c.width)).join("  ")));
  for (const row of rows) {
    const cells = row.map((cell, i) => {
      const col = columns[i]!;
      return col.align === "right" ? padLeftRespectingColor(cell, col.width) : padRight(cell, col.width);
    });
    lines.push(cells.join("  "));
  }
  return lines.join("\n");
}

function padLeftRespectingColor(text: string, width: number): string {
  const need = Math.max(0, width - visibleLength(text));
  return " ".repeat(need) + text;
}

export const BOX_GLYPHS = { TL, TR, BL, BR, H, V, T_DOWN, T_UP } as const;

// src/lib/artlab/cli/ui/ansi.ts
//
// Tower-aesthetic ANSI primitives — gold #C9A84C accents on dark, with
// Unicode box drawing. Detects TTY + NO_COLOR. Zero runtime dependencies.

const ESC = "\x1b[";

export function hasColor(): boolean {
  if (process.env.NO_COLOR && process.env.NO_COLOR !== "0") return false;
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0") return true;
  return Boolean(process.stdout.isTTY);
}

function code(open: string, close: string) {
  return (text: string): string => (hasColor() ? `${ESC}${open}m${text}${ESC}${close}m` : text);
}

function rgb24(r: number, g: number, b: number): (text: string) => string {
  return (text: string): string =>
    hasColor() ? `${ESC}38;2;${r};${g};${b}m${text}${ESC}0m` : text;
}

function bgRgb24(r: number, g: number, b: number): (text: string) => string {
  return (text: string): string =>
    hasColor() ? `${ESC}48;2;${r};${g};${b}m${text}${ESC}0m` : text;
}

// Tower palette
export const towerGold = rgb24(0xc9, 0xa8, 0x4c);
export const towerGoldBright = rgb24(0xe6, 0xc4, 0x6b);
export const towerNavy = rgb24(0x1a, 0x1a, 0x2e);
export const towerNavyBg = bgRgb24(0x1a, 0x1a, 0x2e);
export const towerCream = rgb24(0xf2, 0xee, 0xe2);
export const towerSlate = rgb24(0x8a, 0x8e, 0x9c);
export const towerEmber = rgb24(0xd8, 0x6c, 0x3a);
export const towerJade = rgb24(0x6f, 0xb5, 0x8a);
export const towerSky = rgb24(0x7c, 0xa6, 0xd1);

// Generic styles
export const bold = code("1", "22");
export const dim = code("2", "22");
export const italic = code("3", "23");
export const underline = code("4", "24");

// Status colors
export const colorOk = towerJade;
export const colorWarn = towerGoldBright;
export const colorFail = towerEmber;
export const colorInfo = towerSky;
export const colorMuted = towerSlate;

// Visual-width-aware helpers — strip ANSI sequences before measuring.
const ANSI_PATTERN = /\[[0-9;]*m/g;

export function visibleLength(text: string): number {
  return text.replace(ANSI_PATTERN, "").length;
}

export function padRight(text: string, width: number, char = " "): string {
  const need = Math.max(0, width - visibleLength(text));
  return text + char.repeat(need);
}

export function padLeft(text: string, width: number, char = " "): string {
  const need = Math.max(0, width - visibleLength(text));
  return char.repeat(need) + text;
}

export function center(text: string, width: number, char = " "): string {
  const need = Math.max(0, width - visibleLength(text));
  const leftPad = Math.floor(need / 2);
  const rightPad = need - leftPad;
  return char.repeat(leftPad) + text + char.repeat(rightPad);
}

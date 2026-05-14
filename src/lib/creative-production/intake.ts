import type { CreativeAssetType } from "./types";

export type CreativeProductionRequestConfidence = "high" | "medium" | "low";
export type CreativeProductionInitialApprovalStatus = "required" | "already-approved";

export interface CreativeProductionRequestDraft {
  rawRequest: string;
  assetType: CreativeAssetType;
  name: string;
  brief: string;
  runId: string;
  confidence: CreativeProductionRequestConfidence;
  routingReason: string;
  matchedSignals: string[];
  initialApprovalStatus: CreativeProductionInitialApprovalStatus;
}

interface RouteSignal {
  assetType: CreativeAssetType;
  label: string;
  weight: number;
  patterns: readonly RegExp[];
}

const KNOWN_CHARACTER_NAMES = [
  "Otis Vale",
  "Mara Voss",
  "Rafe Calder",
  "Priya Sen",
  "Dylan Shorts",
  "Vera Bloom",
  "Sol Navarro",
  "Dr. Inez Park",
  "Inez Park",
  "Mina Rook",
  "Etta Knox",
  "Rowan Vale",
  "Nadia Flint",
] as const;

const ROUTE_SIGNALS: readonly RouteSignal[] = [
  {
    assetType: "character",
    label: "character identity, cast, outfit, pose, or sprite language",
    weight: 8,
    patterns: [
      /\bcharacter\b/i,
      /\bcast\b/i,
      /\bperson\b/i,
      /\bconcierge\b/i,
      /\bceo\b/i,
      /\bcro\b/i,
      /\bpose\b/i,
      /\boutfit\b/i,
      /\bsprite\b/i,
      /\bturnaround\b/i,
      /\bexpression\b/i,
      ...KNOWN_CHARACTER_NAMES.map((name) => new RegExp(`\\b${escapeRegExp(name.split(" ").at(0) ?? name)}\\b`, "i")),
    ],
  },
  {
    assetType: "environment",
    label: "environment, background, room, floor, or screen language",
    weight: 4,
    patterns: [
      /\bbackground\b/i,
      /\bbackdrop\b/i,
      /\benvironment\b/i,
      /\broom\b/i,
      /\bfloor\b/i,
      /\blobby\b/i,
      /\bwar room\b/i,
      /\bscreen\b/i,
      /\bwall\b/i,
      /\boffice\b/i,
    ],
  },
  {
    assetType: "ui-texture",
    label: "ui-texture surface, button, panel, control, or material language",
    weight: 4,
    patterns: [
      /\bui\b/i,
      /\bbutton\b/i,
      /\bcontrol\b/i,
      /\bpanel\b/i,
      /\bcard\b/i,
      /\bbadge\b/i,
      /\btexture\b/i,
      /\bsurface\b/i,
      /\bdivider\b/i,
      /\bcomponent\b/i,
      /\binterface\b/i,
      /\bwebsite ui\b/i,
      /\bapp ui\b/i,
      /\bhover effect\b/i,
    ],
  },
  {
    assetType: "animation",
    label: "animation, motion, loop, transition, or moving-state language",
    weight: 5,
    patterns: [
      /\banimat(?:e|ed|ion)\b/i,
      /\bmotion\b/i,
      /\bloop\b/i,
      /\btransition\b/i,
      /\bmovement\b/i,
      /\barrival\b/i,
      /\breduced motion\b/i,
      /\bgsap\b/i,
      /\btimeline\b/i,
      /\beasing\b/i,
    ],
  },
  {
    assetType: "prop",
    label: "prop, object, desk item, or transparent item language",
    weight: 3,
    patterns: [
      /\bprop\b/i,
      /\bobject\b/i,
      /\bbell\b/i,
      /\bkeycard\b/i,
      /\bpen\b/i,
      /\bfolder\b/i,
      /\bdossier\b/i,
      /\bdevice\b/i,
    ],
  },
  {
    assetType: "scene",
    label: "scene, moment, shot, or composed beat language",
    weight: 3,
    patterns: [
      /\bscene\b/i,
      /\bmoment\b/i,
      /\bshot\b/i,
      /\bcutscene\b/i,
      /\bonboarding\b/i,
      /\bcomposition\b/i,
      /\bthree(?:\.js)?\b/i,
      /\b3d\b/i,
      /\bwebgpu\b/i,
      /\bwebgl\b/i,
      /\bshader\b/i,
      /\bimmersive\b/i,
    ],
  },
  {
    assetType: "icon-system",
    label: "icon, symbol, pictogram, or custom symbol language",
    weight: 3,
    patterns: [
      /\bicon\b/i,
      /\bsymbol\b/i,
      /\bpictogram\b/i,
      /\bglyph\b/i,
    ],
  },
  {
    assetType: "marketing-hero",
    label: "marketing, hero, landing, or promotional image language",
    weight: 3,
    patterns: [
      /\bhero\b/i,
      /\blanding\b/i,
      /\bmarketing\b/i,
      /\bpromo(?:tional)?\b/i,
      /\bpublic page\b/i,
    ],
  },
];

export function inferCreativeProductionRequest(
  request: string,
  now = new Date(),
): CreativeProductionRequestDraft {
  const rawRequest = request.trim().replace(/\s+/g, " ");

  if (!rawRequest) {
    throw new Error("--request requires a non-empty natural-language brief.");
  }

  const route = routeRequest(rawRequest);
  const name = inferName(rawRequest, route.assetType);
  const runId = `${formatDate(now)}-${slugify(name)}`;

  return {
    rawRequest,
    assetType: route.assetType,
    name,
    brief: rawRequest,
    runId,
    confidence: route.confidence,
    routingReason: `Routed to ${route.assetType} because the request matched ${route.reason}.`,
    matchedSignals: route.matchedSignals,
    initialApprovalStatus: inferInitialApprovalStatus(rawRequest),
  };
}

function inferInitialApprovalStatus(request: string): CreativeProductionInitialApprovalStatus {
  if (
    /\b(same|existing|current|already|previously)\s+approved\b/i.test(request) ||
    /\bapproved\s+(design|direction|identity|reference|look)\b/i.test(request) ||
    /\bdesign\s+is\s+already\s+approved\b/i.test(request)
  ) {
    return "already-approved";
  }

  return "required";
}

function routeRequest(request: string): {
  assetType: CreativeAssetType;
  confidence: CreativeProductionRequestConfidence;
  reason: string;
  matchedSignals: string[];
} {
  const scored = ROUTE_SIGNALS.map((signal) => {
    const matchedSignals = signal.patterns
      .filter((pattern) => pattern.test(request))
      .map((pattern) => pattern.source.replace(/\\b/g, "").replace(/\\/g, ""));

    return {
      assetType: signal.assetType,
      label: signal.label,
      score: matchedSignals.length * signal.weight,
      matchedSignals,
    };
  }).sort((left, right) => right.score - left.score);
  const winner = scored[0];

  if (!winner || winner.score === 0) {
    return {
      assetType: "scene",
      confidence: "low",
      reason: "no strong asset-type signal, so the engine will treat it as a general composed Tower scene",
      matchedSignals: [],
    };
  }

  return {
    assetType: winner.assetType,
    confidence: winner.score >= 8 ? "high" : "medium",
    reason: winner.label,
    matchedSignals: winner.matchedSignals,
  };
}

function inferName(request: string, assetType: CreativeAssetType): string {
  const knownCharacter = inferKnownCharacterName(request);

  if (assetType === "character" && knownCharacter) {
    return knownCharacter.split(" ")[0] ?? knownCharacter;
  }

  const normalized = request
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const context = extractForContext(normalized);
  const descriptor = extractDescriptor(normalized, assetType, context);
  const nameParts = [context, descriptor].filter(Boolean);
  const candidate = nameParts.join(" ").trim() || descriptor || normalized;

  return titleCase(cleanName(candidate));
}

function inferKnownCharacterName(request: string): string | undefined {
  return KNOWN_CHARACTER_NAMES.find((name) => {
    const firstName = name.split(" ")[0];
    return new RegExp(`\\b${escapeRegExp(firstName)}\\b`, "i").test(request);
  });
}

function extractForContext(request: string): string | undefined {
  const context = request.match(/\bfor (?:the |a |an )?(.+)$/i)?.[1];

  if (!context) return undefined;

  return cleanName(context);
}

function extractDescriptor(
  request: string,
  assetType: CreativeAssetType,
  context?: string,
): string {
  const beforeContext = context
    ? request.replace(new RegExp(`\\bfor (?:the |a |an )?${escapeRegExp(context)}$`, "i"), "")
    : request;
  const cleaned = cleanName(beforeContext);

  if (assetType === "environment") {
    if (/\bbackground screen\b/i.test(request)) return "background screen";
    if (/\bbackground\b/i.test(request)) return "background";
    if (/\bbackdrop\b/i.test(request)) return "backdrop";
    if (/\bscreen\b/i.test(request)) return "screen";
    return "environment";
  }

  if (assetType === "ui-texture") {
    if (/\bbutton texture\b/i.test(request)) return "button texture";
    if (/\bbutton\b/i.test(request)) return "button texture";
    if (/\bpanel\b/i.test(request)) return "panel texture";
    if (/\bcard\b/i.test(request)) return "card texture";
    return "ui texture";
  }

  if (assetType === "animation") {
    return cleaned
      .replace(/\banimated\b/gi, "")
      .replace(/\banimation\b/gi, "")
      .trim() || "animation loop";
  }

  if (assetType === "prop") {
    return cleaned.replace(/\bprop\b/gi, "").trim() || "prop";
  }

  if (assetType === "icon-system") {
    return cleaned.replace(/\bicon system\b/gi, "icon system").trim() || "icon system";
  }

  if (assetType === "marketing-hero") {
    return cleaned.replace(/\bmarketing\b/gi, "").trim() || "marketing hero";
  }

  return cleaned;
}

function cleanName(value: string): string {
  return value
    .replace(/\b(create|make|generate|build|design|redo|replace|update|new|fresh|immersive|premium|small|final|production|ready|from scratch|same approved design|approved design|with|but)\b/gi, " ")
    .replace(/\b(a|an|the|please|for|to|of|and)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      return `${lower[0]?.toUpperCase() ?? ""}${lower.slice(1)}`;
    })
    .join(" ");
}

function slugify(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  if (!slug) throw new Error("Could not infer a safe run id from the request.");

  return slug;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

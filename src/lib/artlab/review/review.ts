import {
  REQUIRED_PROMOTION_PHRASE,
  type RequiredPromotionPhrase,
} from "../promotion/constants";

export const CREATIVE_REVIEW_ACTION_IDS = [
  "approve-direction",
  "regenerate-named-slots",
  "revise-brief",
  "approve-for-app",
  "reject-archive",
] as const;

export type CreativeReviewActionId = (typeof CREATIVE_REVIEW_ACTION_IDS)[number];
export type CreativeReviewBoardType = "initial-concept" | "final-upload-ready" | "app-preview";
export type CreativeReviewSlotStatus = "candidate" | "qa-passed" | "warning" | "blocked";
export type CreativePreviewCheckStatus = "passed" | "warning" | "blocked";

export interface CreativeReviewAction {
  id: CreativeReviewActionId;
  label: string;
  requiresExactPhrase: false | RequiredPromotionPhrase;
  slots?: readonly string[];
  input?: "plain English";
}

export interface CreativeReviewActionManifest {
  schemaVersion: "tower.creative-review-actions.v1";
  runId: string;
  boardType: CreativeReviewBoardType;
  actions: readonly CreativeReviewAction[];
  localImagePaths: readonly string[];
  promotesOnAction: boolean;
  previewChecks: readonly CreativePreviewCheck[];
  forbiddenShortcuts: readonly ["external-image-url", "data-uri"];
}

export interface CreativeReviewBoardArtifact {
  html: string;
  actionManifest: CreativeReviewActionManifest;
}

export interface CreativeConceptSlot {
  slotId: string;
  label: string;
  localImagePath: string;
  status: Extract<CreativeReviewSlotStatus, "candidate" | "warning" | "blocked">;
  notes: string;
}

export interface CreativeFinalAsset {
  slotId: string;
  label: string;
  localImagePath: string;
  status: "qa-passed";
  receipts: readonly string[];
  evidence: readonly string[];
  warnings: readonly string[];
  blockers: readonly string[];
}

export interface CreativePreviewCheck {
  id: "desktop" | "mobile" | "reduced-motion" | "fallback" | "broken-image" | "crop" | "overlap";
  label: string;
  status: CreativePreviewCheckStatus;
  evidence: string;
}

export interface CreativeAppPreviewChecks {
  desktop: Omit<CreativePreviewCheck, "id" | "label">;
  mobile: Omit<CreativePreviewCheck, "id" | "label">;
  reducedMotion: Omit<CreativePreviewCheck, "id" | "label">;
  fallback: Omit<CreativePreviewCheck, "id" | "label">;
  brokenImage: Omit<CreativePreviewCheck, "id" | "label">;
  crop: Omit<CreativePreviewCheck, "id" | "label">;
  overlap: Omit<CreativePreviewCheck, "id" | "label">;
}

function assertLocalImagePath(path: string): void {
  if (/^data:/i.test(path)) {
    throw new Error("Review boards cannot use data URI shortcuts.");
  }

  if (/^(https?:)?\/\//i.test(path)) {
    throw new Error("Review boards cannot use external image URLs.");
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function action(
  id: CreativeReviewActionId,
  label: string,
  input?: CreativeReviewAction["input"],
  slots?: readonly string[],
): CreativeReviewAction {
  return {
    id,
    label,
    requiresExactPhrase: id === "approve-for-app" ? REQUIRED_PROMOTION_PHRASE : false,
    ...(input ? { input } : {}),
    ...(slots ? { slots } : {}),
  };
}

function manifest(input: {
  runId: string;
  boardType: CreativeReviewBoardType;
  actions: readonly CreativeReviewAction[];
  localImagePaths: readonly string[];
  promotesOnAction: boolean;
  previewChecks?: readonly CreativePreviewCheck[];
}): CreativeReviewActionManifest {
  return {
    schemaVersion: "tower.creative-review-actions.v1",
    runId: input.runId,
    boardType: input.boardType,
    actions: input.actions,
    localImagePaths: input.localImagePaths,
    promotesOnAction: input.promotesOnAction,
    previewChecks: input.previewChecks ?? [],
    forbiddenShortcuts: ["external-image-url", "data-uri"],
  };
}

function renderPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f6f4ef; color: #171717; }
    body { margin: 0; padding: 32px; }
    main { max-width: 1120px; margin: 0 auto; }
    h1, h2, p { margin-top: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .card { border: 1px solid #d8d2c4; border-radius: 8px; background: #fffefa; padding: 16px; }
    img { display: block; width: 100%; max-height: 420px; object-fit: contain; background: #ebe7dc; border-radius: 6px; }
    .actions, .evidence { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; list-style: none; }
    .pill { border: 1px solid #bdb5a5; border-radius: 999px; padding: 6px 10px; background: #ffffff; }
    .blocked { border-color: #9d1c1c; color: #7f1414; }
    .warning { border-color: #996d00; color: #6d4e00; }
  </style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
}

function renderActions(actions: readonly CreativeReviewAction[]): string {
  const items = actions.map((item) => {
    const exact = item.requiresExactPhrase ? ` exact phrase: ${item.requiresExactPhrase}` : "";
    return `<li class="pill">${escapeHtml(item.label + exact)}</li>`;
  });

  return `<ul class="actions">${items.join("")}</ul>`;
}

export function buildInitialConceptReviewBoard(input: {
  runId: string;
  recommendation: string;
  projectedCostCents: number;
  slots: readonly CreativeConceptSlot[];
}): CreativeReviewBoardArtifact {
  input.slots.forEach((slot) => assertLocalImagePath(slot.localImagePath));
  const slotIds = input.slots.map((slot) => slot.slotId);
  const actions = [
    action("approve-direction", "Approve direction"),
    action("regenerate-named-slots", "Regenerate named slots", undefined, slotIds),
    action("revise-brief", "Revise brief", "plain English"),
    action("reject-archive", "Reject and archive"),
  ];
  const cards = input.slots.map((slot) => `<article class="card">
    <h2>${escapeHtml(slot.label)}</h2>
    <img src="${escapeHtml(slot.localImagePath)}" alt="${escapeHtml(slot.label)}">
    <p><strong>Status:</strong> ${escapeHtml(slot.status)}</p>
    <p>${escapeHtml(slot.notes)}</p>
  </article>`);

  return {
    html: renderPage("Initial Concept Board", `
      <h1>Initial Concept Board</h1>
      <p><strong>Run:</strong> ${escapeHtml(input.runId)}</p>
      <p><strong>Recommendation:</strong> ${escapeHtml(input.recommendation)}</p>
      <p><strong>Projected production cost:</strong> ${input.projectedCostCents} cents</p>
      ${renderActions(actions)}
      <section class="grid">${cards.join("")}</section>
    `),
    actionManifest: manifest({
      runId: input.runId,
      boardType: "initial-concept",
      actions,
      localImagePaths: input.slots.map((slot) => slot.localImagePath),
      promotesOnAction: false,
    }),
  };
}

export function buildFinalUploadReadyReviewBoard(input: {
  runId: string;
  assets: readonly CreativeFinalAsset[];
}): CreativeReviewBoardArtifact {
  for (const asset of input.assets) {
    assertLocalImagePath(asset.localImagePath);

    if (asset.status !== "qa-passed" || asset.blockers.length > 0) {
      throw new Error("Final upload-ready board can only include QA-passed assets without blockers.");
    }
  }

  const slotIds = input.assets.map((asset) => asset.slotId);
  const actions = [
    action("approve-for-app", "Approve for app"),
    action("regenerate-named-slots", "Regenerate named slots", undefined, slotIds),
    action("revise-brief", "Revise brief", "plain English"),
    action("reject-archive", "Reject and archive"),
  ];
  const cards = input.assets.map((asset) => `<article class="card">
    <h2>${escapeHtml(asset.label)}</h2>
    <img src="${escapeHtml(asset.localImagePath)}" alt="${escapeHtml(asset.label)}">
    <p><strong>Status:</strong> ${escapeHtml(asset.status)}</p>
    <p><strong>Receipts:</strong> ${asset.receipts.map(escapeHtml).join(", ") || "none"}</p>
    <ul class="evidence">${asset.evidence.map((item) => `<li class="pill">${escapeHtml(item)}</li>`).join("")}</ul>
    ${asset.warnings.length ? `<p class="warning">Warnings: ${asset.warnings.map(escapeHtml).join(", ")}</p>` : ""}
  </article>`);

  return {
    html: renderPage("Final Upload-Ready Board", `
      <h1>Final Upload-Ready Board</h1>
      <p><strong>Run:</strong> ${escapeHtml(input.runId)}</p>
      <p>Only QA-passed assets are represented as ready.</p>
      ${renderActions(actions)}
      <section class="grid">${cards.join("")}</section>
    `),
    actionManifest: manifest({
      runId: input.runId,
      boardType: "final-upload-ready",
      actions,
      localImagePaths: input.assets.map((asset) => asset.localImagePath),
      promotesOnAction: false,
    }),
  };
}

function previewChecksFromInput(input: CreativeAppPreviewChecks): CreativePreviewCheck[] {
  return [
    { id: "desktop", label: "Desktop", ...input.desktop },
    { id: "mobile", label: "Mobile", ...input.mobile },
    { id: "reduced-motion", label: "Reduced motion", ...input.reducedMotion },
    { id: "fallback", label: "Fallback", ...input.fallback },
    { id: "broken-image", label: "Broken image", ...input.brokenImage },
    { id: "crop", label: "Crop", ...input.crop },
    { id: "overlap", label: "Overlap", ...input.overlap },
  ];
}

export function buildAppPreviewBoard(input: {
  runId: string;
  previewTitle: string;
  assetLocalPath: string;
  checks: CreativeAppPreviewChecks;
}): CreativeReviewBoardArtifact {
  assertLocalImagePath(input.assetLocalPath);
  const checks = previewChecksFromInput(input.checks);
  const actions = [
    action("approve-for-app", "Approve for app"),
    action("regenerate-named-slots", "Regenerate named slots"),
    action("revise-brief", "Revise brief", "plain English"),
    action("reject-archive", "Reject and archive"),
  ];
  const checkCards = checks.map((check) => `<article class="card ${escapeHtml(check.status)}">
    <h2>${escapeHtml(check.label)}</h2>
    <p><strong>Status:</strong> ${escapeHtml(check.status)}</p>
    <p>${escapeHtml(check.evidence)}</p>
  </article>`);

  return {
    html: renderPage("App Preview Board", `
      <h1>App Preview Board</h1>
      <p><strong>Run:</strong> ${escapeHtml(input.runId)}</p>
      <p><strong>Preview:</strong> ${escapeHtml(input.previewTitle)}</p>
      <article class="card">
        <img src="${escapeHtml(input.assetLocalPath)}" alt="${escapeHtml(input.previewTitle)}">
      </article>
      ${renderActions(actions)}
      <section class="grid">${checkCards.join("")}</section>
    `),
    actionManifest: manifest({
      runId: input.runId,
      boardType: "app-preview",
      actions,
      localImagePaths: [input.assetLocalPath],
      promotesOnAction: false,
      previewChecks: checks,
    }),
  };
}

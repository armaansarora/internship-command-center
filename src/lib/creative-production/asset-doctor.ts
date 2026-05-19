import { readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import sharp from "sharp";

export type CreativeAssetDoctorSeverity = "warning" | "blocker";

export type CreativeAssetDoctorIssueCode =
  | "missing-generated-image"
  | "undecodable-image"
  | "image-long-edge-below-minimum"
  | "image-short-edge-below-minimum"
  | "image-missing-alpha"
  | "missing-generation-receipt"
  | "receipt-quality-warning"
  | "missing-review-image"
  | "external-review-image"
  | "inline-review-image";

export interface CreativeAssetDoctorIssue {
  code: CreativeAssetDoctorIssueCode;
  severity: CreativeAssetDoctorSeverity;
  path?: string;
  src?: string;
  message: string;
}

export interface CreativeImageFileInspection {
  path: string;
  ok: boolean;
  width?: number;
  height?: number;
  format?: string;
  hasAlpha?: boolean;
  issues: CreativeAssetDoctorIssue[];
}

export interface CreativeReviewBoardImageInspection {
  src: string;
  resolvedPath?: string;
  width?: number;
  height?: number;
  format?: string;
  hasAlpha?: boolean;
}

export interface CreativeReviewBoardValidation {
  boardPath: string;
  ok: boolean;
  checkedImages: CreativeReviewBoardImageInspection[];
  issues: CreativeAssetDoctorIssue[];
}

export interface ValidateCreativeImageFileOptions {
  path: string;
  issueCodeForMissing?: Extract<CreativeAssetDoctorIssueCode, "missing-generated-image" | "missing-review-image">;
  minimumLongEdge?: number;
  minimumShortEdge?: number;
  requireAlpha?: boolean;
}

export function extractReviewBoardImageSources(html: string): string[] {
  const sources: string[] = [];
  const imageTagPattern = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  let match = imageTagPattern.exec(html);

  while (match) {
    const source = match[1] ?? match[2] ?? match[3];

    if (source) sources.push(source);
    match = imageTagPattern.exec(html);
  }

  return sources;
}

function createIssue(input: {
  code: CreativeAssetDoctorIssueCode;
  severity?: CreativeAssetDoctorSeverity;
  path?: string;
  src?: string;
  message: string;
}): CreativeAssetDoctorIssue {
  return {
    code: input.code,
    severity: input.severity ?? "blocker",
    ...(input.path ? { path: input.path } : {}),
    ...(input.src ? { src: input.src } : {}),
    message: input.message,
  };
}

export async function validateCreativeImageFile(
  input: ValidateCreativeImageFileOptions,
): Promise<CreativeImageFileInspection> {
  const issues: CreativeAssetDoctorIssue[] = [];

  try {
    await stat(input.path);
  } catch {
    issues.push(createIssue({
      code: input.issueCodeForMissing ?? "missing-generated-image",
      path: input.path,
      message: `Image file is missing: ${input.path}`,
    }));

    return {
      path: input.path,
      ok: false,
      issues,
    };
  }

  let metadata: sharp.Metadata;

  try {
    metadata = await sharp(input.path).metadata();
  } catch (error) {
    issues.push(createIssue({
      code: "undecodable-image",
      path: input.path,
      message: `Image file could not be decoded: ${error instanceof Error ? error.message : String(error)}`,
    }));

    return {
      path: input.path,
      ok: false,
      issues,
    };
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);

  if (input.minimumLongEdge && longEdge < input.minimumLongEdge) {
    issues.push(createIssue({
      code: "image-long-edge-below-minimum",
      path: input.path,
      message: `Image long edge ${longEdge}px is below required ${input.minimumLongEdge}px.`,
    }));
  }

  if (input.minimumShortEdge && shortEdge < input.minimumShortEdge) {
    issues.push(createIssue({
      code: "image-short-edge-below-minimum",
      path: input.path,
      message: `Image short edge ${shortEdge}px is below required ${input.minimumShortEdge}px.`,
    }));
  }

  if (input.requireAlpha && !metadata.hasAlpha) {
    issues.push(createIssue({
      code: "image-missing-alpha",
      path: input.path,
      message: "Image is missing an alpha channel required for production sprites.",
    }));
  }

  return {
    path: input.path,
    ok: issues.length === 0,
    width,
    height,
    format: metadata.format,
    hasAlpha: metadata.hasAlpha,
    issues,
  };
}

function resolveReviewBoardImagePath(boardPath: string, src: string): string {
  if (isAbsolute(src)) {
    const absolutePath = resolve(src);
    const relativeToProject = relative(process.cwd(), absolutePath);

    if (!relativeToProject.startsWith("..") && !isAbsolute(relativeToProject)) {
      return absolutePath;
    }
  }

  if (src.startsWith("/")) {
    return join(process.cwd(), "public", src.replace(/^\//, ""));
  }

  return resolve(dirname(boardPath), src);
}

export async function validateReviewBoardImageReferences(input: {
  boardPath: string;
  html?: string;
}): Promise<CreativeReviewBoardValidation> {
  const boardPath = isAbsolute(input.boardPath) ? input.boardPath : resolve(input.boardPath);
  const html = input.html ?? await readFile(boardPath, "utf8");
  const sources = extractReviewBoardImageSources(html);
  const issues: CreativeAssetDoctorIssue[] = [];
  const checkedImages: CreativeReviewBoardImageInspection[] = [];

  for (const src of sources) {
    if (/^https?:\/\//i.test(src)) {
      issues.push(createIssue({
        code: "external-review-image",
        src,
        message: `Review board image uses an external URL instead of a local audited file: ${src}`,
      }));
      continue;
    }

    if (/^data:/i.test(src)) {
      issues.push(createIssue({
        code: "inline-review-image",
        src,
        message: "Review board image uses an inline data URI instead of a local audited file.",
      }));
      continue;
    }

    const resolvedPath = resolveReviewBoardImagePath(boardPath, src);
    const inspection = await validateCreativeImageFile({
      path: resolvedPath,
      issueCodeForMissing: "missing-review-image",
    });

    checkedImages.push({
      src,
      resolvedPath,
      width: inspection.width,
      height: inspection.height,
      format: inspection.format,
      hasAlpha: inspection.hasAlpha,
    });
    issues.push(...inspection.issues.map((issue) => ({
      ...issue,
      src,
    })));
  }

  return {
    boardPath,
    ok: issues.length === 0,
    checkedImages,
    issues,
  };
}

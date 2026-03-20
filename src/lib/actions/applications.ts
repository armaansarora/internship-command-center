"use server";

import { requireUser } from "@/lib/supabase/server";
import {
  createApplicationSchema,
  updateApplicationSchema,
  moveApplicationSchema,
  bulkMoveSchema,
} from "@/lib/validators/application";
import {
  createApplicationRest,
  updateApplicationRest,
  deleteApplicationRest,
  moveApplicationRest,
  bulkUpdateStatusRest,
} from "@/lib/db/queries/applications-rest";
import type { Application } from "@/db/schema";

// ---------------------------------------------------------------------------
// ActionResult type
// ---------------------------------------------------------------------------

export type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse FormData into a plain object.
 * Numeric fields are coerced where needed; empty strings become undefined
 * so Zod optional/default handling works correctly.
 */
function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && value !== "") {
      obj[key] = value;
    }
  }
  // Coerce tier to number if present
  if (typeof obj["tier"] === "string") {
    const parsed = Number(obj["tier"]);
    obj["tier"] = isNaN(parsed) ? undefined : parsed;
  }
  return obj;
}

function unknownToActionError(err: unknown): { code: string; message: string } {
  if (err instanceof Error) {
    return { code: "UNEXPECTED_ERROR", message: err.message };
  }
  return { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred." };
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Create a new application from FormData.
 *
 * Sets appliedAt if status is not "discovered".
 * Sets position as lexicographic end of the status column.
 */
export async function createApplicationAction(
  formData: FormData,
): Promise<ActionResult<Application>> {
  try {
    const user = await requireUser();

    const raw = formDataToObject(formData);
    const parsed = createApplicationSchema.safeParse(raw);

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => i.message)
        .join("; ");
      return { data: null, error: { code: "VALIDATION_ERROR", message } };
    }

    const application = await createApplicationRest({
      userId: user.id,
      ...parsed.data,
    });

    return { data: application, error: null };
  } catch (err) {
    return { data: null, error: unknownToActionError(err) };
  }
}

/**
 * Update an existing application from FormData.
 */
export async function updateApplicationAction(
  id: string,
  formData: FormData,
): Promise<ActionResult<Application>> {
  try {
    const user = await requireUser();

    const raw = formDataToObject(formData);
    const parsed = updateApplicationSchema.safeParse(raw);

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => i.message)
        .join("; ");
      return { data: null, error: { code: "VALIDATION_ERROR", message } };
    }

    const application = await updateApplicationRest(user.id, id, parsed.data);

    return { data: application, error: null };
  } catch (err) {
    return { data: null, error: unknownToActionError(err) };
  }
}

/**
 * Delete an application by id.
 */
export async function deleteApplicationAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const user = await requireUser();

    if (!id) {
      return {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Application id is required." },
      };
    }

    await deleteApplicationRest(user.id, id);

    return { data: undefined, error: null };
  } catch (err) {
    return { data: null, error: unknownToActionError(err) };
  }
}

/**
 * Move an application to a new status column and position (drag-and-drop).
 * Also stamps lastActivityAt.
 */
export async function moveApplicationAction(
  id: string,
  newStatus: string,
  newPosition: string,
): Promise<ActionResult<Application>> {
  try {
    const user = await requireUser();

    const parsed = moveApplicationSchema.safeParse({ id, newStatus, newPosition });

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => i.message)
        .join("; ");
      return { data: null, error: { code: "VALIDATION_ERROR", message } };
    }

    const application = await moveApplicationRest(
      user.id,
      parsed.data.id,
      parsed.data.newStatus,
      parsed.data.newPosition,
    );

    return { data: application, error: null };
  } catch (err) {
    return { data: null, error: unknownToActionError(err) };
  }
}

/**
 * Bulk move multiple applications to a new status.
 */
export async function bulkMoveAction(
  ids: string[],
  newStatus: string,
): Promise<ActionResult<void>> {
  try {
    const user = await requireUser();

    const parsed = bulkMoveSchema.safeParse({ ids, newStatus });

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => i.message)
        .join("; ");
      return { data: null, error: { code: "VALIDATION_ERROR", message } };
    }

    await bulkUpdateStatusRest(user.id, parsed.data.ids, parsed.data.newStatus);

    return { data: undefined, error: null };
  } catch (err) {
    return { data: null, error: unknownToActionError(err) };
  }
}

import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Status constants
// ---------------------------------------------------------------------------

export const APPLICATION_STATUSES = [
  "discovered",
  "applied",
  "screening",
  "interview_scheduled",
  "interviewing",
  "under_review",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// ---------------------------------------------------------------------------
// Create schema
// ---------------------------------------------------------------------------

export const createApplicationSchema = z.object({
  companyName: z.string().min(1, "Company name required"),
  role: z.string().min(1, "Role required"),
  url: z.url().optional().or(z.literal("")),
  status: z.enum(APPLICATION_STATUSES).default("discovered"),
  source: z.string().optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  sector: z.string().optional(),
  tier: z.number().min(1).max(5).optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

// ---------------------------------------------------------------------------
// Update schema (all fields optional)
// ---------------------------------------------------------------------------

export const updateApplicationSchema = createApplicationSchema.partial();

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

// ---------------------------------------------------------------------------
// Move schema (for drag-and-drop)
// ---------------------------------------------------------------------------

export const moveApplicationSchema = z.object({
  id: z.string().uuid(),
  newStatus: z.enum(APPLICATION_STATUSES),
  newPosition: z.string(),
});

export type MoveApplicationInput = z.infer<typeof moveApplicationSchema>;

// ---------------------------------------------------------------------------
// Bulk move schema
// ---------------------------------------------------------------------------

export const bulkMoveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  newStatus: z.enum(APPLICATION_STATUSES),
});

export type BulkMoveInput = z.infer<typeof bulkMoveSchema>;

import { z } from "zod";

export const TaskStatus = z.enum([
  "not_started",
  "in_progress",
  "complete",
  "blocked",
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const PhaseStatus = z.enum([
  "not_started",
  "in_progress",
  "complete",
  "blocked",
]);
export type PhaseStatus = z.infer<typeof PhaseStatus>;

export const IsoTs = z.string().datetime().nullable();

export const LockSchema = z
  .object({
    holder: z.string(),
    acquired: z.string().datetime(),
    expires: z.string().datetime(),
  })
  .nullable();

export const TaskSchema = z.object({
  title: z.string(),
  status: TaskStatus,
  started: IsoTs.optional(),
  completed: IsoTs.optional(),
  commit: z.string().nullable().optional(),
  notes: z.string().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const BlockerSchema = z.object({
  id: z.string(),
  task: z.string(),
  opened: z.string().datetime(),
  text: z.string(),
  resolved: z.string().datetime().nullable(),
});
export type Blocker = z.infer<typeof BlockerSchema>;

export const DecisionSchema = z.object({
  date: z.string(),
  text: z.string(),
  why: z.string().optional(),
});

export const AcceptanceSchema = z.object({
  criteria: z.array(z.string()),
  met: z.boolean(),
  verified_by_commit: z.string().nullable(),
});

export const LedgerSchema = z.object({
  phase: z.string(),
  name: z.string(),
  status: PhaseStatus,
  intent: z.string(),
  started: IsoTs,
  completed: IsoTs,
  lock: LockSchema.optional().default(null),
  acceptance: AcceptanceSchema.optional().default({
    criteria: [],
    met: false,
    verified_by_commit: null,
  }),
  tasks: z.record(z.string(), TaskSchema),
  blockers: z.array(BlockerSchema),
  decisions: z.array(DecisionSchema),
  history: z.array(z.record(z.string(), z.string())),
});
export type Ledger = z.infer<typeof LedgerSchema>;

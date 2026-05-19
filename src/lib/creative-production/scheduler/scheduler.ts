import type {
  CreativeBudgetLedger,
  CreativeBudgetReceipt,
  CreativeFailureClassification,
  CreativeProductionProviderId,
} from "../budget/ledger";
import {
  getCreativeBudgetReceiptsForSlot,
  getLatestCreativeBudgetReceipt,
  getNextCreativeAttemptId,
  recordCreativeBudgetSpend,
  releaseCreativeBudgetReservation,
} from "../budget/ledger";
import type {
  CreativeProviderAdapter,
  CreativeProviderGenerationResult,
  CreativeProviderSlotRequest,
} from "../providers/adapters";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
export type CreativeSlotStage =
  | "pending"
  | "provider-running"
  | "local-cutout-running"
  | "clean"
  | "failed"
  | "skipped-clean-receipt"
  | "skipped-warning-receipt";
export interface CreativeSchedulerSlot {
  slotId: string;
  providerId: CreativeProductionProviderId;
  prompt: string;
  sourceHash: string;
  promptHash?: string;
  referenceHash?: string;
  providerModel?: string;
  attemptId?: string;
  metadata?: Record<string, unknown>;
}
export interface CreativeSchedulerPolicy {
  perRunMaxConcurrency: number;
  perProviderMaxConcurrency: Partial<Record<CreativeProductionProviderId, number>>;
  localStageMaxConcurrency: number;
  slotLeaseTimeoutMs: number;
}
export interface CreativeSchedulerRetryPolicy {
  namedSlotIds?: string[];
  retryWarnings?: boolean;
}
export interface CreativeSchedulerSlotProgress {
  slotId: string;
  attemptId: string;
  stage: CreativeSlotStage;
  providerId: CreativeProductionProviderId;
  failureClassification?: CreativeFailureClassification;
}
export interface CreativeSchedulerProgressSnapshot {
  runId: string;
  phase: "running" | "completed" | "completed-with-failures";
  slots: Record<string, CreativeSchedulerSlotProgress>;
  runningProviderSlots: string[];
  runningLocalSlots: string[];
  completed: number;
  failed: number;
  pending: number;
}

export interface CreativeSchedulerResult {
  status: "completed" | "completed-with-failures";
  budgetLedger: CreativeBudgetLedger;
  receipts: CreativeBudgetReceipt[];
  slotResults: Record<string, CreativeSchedulerSlotProgress>;
  snapshots: CreativeSchedulerProgressSnapshot[];
}

export interface CreativeSlotLease {
  leaseId: string;
  runId: string;
  slotId: string;
  attemptId: string;
  stage: "provider" | "local-cutout";
  workerId: string;
  acquiredAtMs: number;
  heartbeatAtMs: number;
  timeoutMs: number;
}

export interface CreativeSlotLeaseStore {
  get(input: Pick<CreativeSlotLease, "runId" | "slotId" | "stage">): CreativeSlotLease | undefined;
  set(lease: CreativeSlotLease): void;
  setIfAbsent?(lease: CreativeSlotLease): boolean;
  delete(lease: CreativeSlotLease): void;
}

export class InMemorySlotLeaseStore implements CreativeSlotLeaseStore {
  private readonly leases = new Map<string, CreativeSlotLease>();

  key(input: Pick<CreativeSlotLease, "runId" | "slotId" | "stage">): string {
    return `${input.runId}:${input.slotId}:${input.stage}`;
  }

  get(input: Pick<CreativeSlotLease, "runId" | "slotId" | "stage">): CreativeSlotLease | undefined {
    return this.leases.get(this.key(input));
  }

  set(lease: CreativeSlotLease): void {
    this.leases.set(this.key(lease), lease);
  }

  setIfAbsent(lease: CreativeSlotLease): boolean {
    const key = this.key(lease);
    if (this.leases.has(key)) return false;
    this.leases.set(key, lease);
    return true;
  }

  delete(lease: CreativeSlotLease): void {
    this.leases.delete(this.key(lease));
  }
}

function safeLeasePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export class FileCreativeSlotLeaseStore implements CreativeSlotLeaseStore {
  constructor(private readonly root: string) {}

  private path(input: Pick<CreativeSlotLease, "runId" | "slotId" | "stage">): string {
    return join(
      this.root,
      `${safeLeasePathPart(input.runId)}__${safeLeasePathPart(input.slotId)}__${safeLeasePathPart(input.stage)}.lease.json`,
    );
  }

  get(input: Pick<CreativeSlotLease, "runId" | "slotId" | "stage">): CreativeSlotLease | undefined {
    const path = this.path(input);

    if (!existsSync(path)) return undefined;

    return JSON.parse(readFileSync(path, "utf8")) as CreativeSlotLease;
  }

  set(lease: CreativeSlotLease): void {
    const path = this.path(lease);
    const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(tempPath, `${JSON.stringify(lease, null, 2)}\n`);
    renameSync(tempPath, path);
  }

  setIfAbsent(lease: CreativeSlotLease): boolean {
    const path = this.path(lease);

    mkdirSync(dirname(path), { recursive: true });
    try {
      writeFileSync(path, `${JSON.stringify(lease, null, 2)}\n`, { flag: "wx" });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
      throw error;
    }
  }

  delete(lease: CreativeSlotLease): void {
    rmSync(this.path(lease), { force: true });
  }
}

export function acquireCreativeSlotLease(
  store: CreativeSlotLeaseStore,
  input: {
    runId: string;
    slotId: string;
    attemptId: string;
    stage: CreativeSlotLease["stage"];
    workerId: string;
    timeoutMs: number;
    nowMs?: number;
    verifyStaleLease?: (lease: CreativeSlotLease) => boolean;
  },
): CreativeSlotLease {
  const nowMs = input.nowMs ?? Date.now();
  const existing = store.get(input);

  if (existing) {
    const expired = nowMs - existing.heartbeatAtMs > existing.timeoutMs;
    if (!expired) {
      throw new Error(`Slot ${input.slotId} is already leased for ${input.stage}.`);
    }

    if (!input.verifyStaleLease?.(existing)) {
      throw new Error(`Slot ${input.slotId} lease timed out but stale-worker verification did not pass.`);
    }
  }

  const lease: CreativeSlotLease = {
    leaseId: `${input.slotId}-${input.stage}-${nowMs}-${input.workerId}`,
    runId: input.runId,
    slotId: input.slotId,
    attemptId: input.attemptId,
    stage: input.stage,
    workerId: input.workerId,
    acquiredAtMs: nowMs,
    heartbeatAtMs: nowMs,
    timeoutMs: input.timeoutMs,
  };
  if (existing || !store.setIfAbsent) {
    store.set(lease);
  } else if (!store.setIfAbsent(lease)) {
    throw new Error(`Slot ${input.slotId} is already leased for ${input.stage}.`);
  }

  return lease;
}

export function heartbeatCreativeSlotLease(
  store: CreativeSlotLeaseStore,
  lease: CreativeSlotLease,
  nowMs = Date.now(),
): CreativeSlotLease {
  const current = store.get(lease);
  if (!current || current.leaseId !== lease.leaseId) {
    throw new Error(`Cannot heartbeat missing lease ${lease.leaseId}.`);
  }

  const updated = { ...current, heartbeatAtMs: nowMs };
  store.set(updated);
  return updated;
}

export function releaseCreativeSlotLease(
  store: CreativeSlotLeaseStore,
  lease: CreativeSlotLease,
): void {
  const current = store.get(lease);
  if (current?.leaseId === lease.leaseId) store.delete(current);
}

function createLimiter(concurrency: number) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Scheduler concurrency must be at least 1.");
  }

  let active = 0;
  const queue: Array<() => void> = [];
  const pump = () => {
    if (active >= concurrency) return;
    const next = queue.shift();
    if (!next) return;
    active += 1;
    next();
  };

  return async function limit<T>(work: () => Promise<T>): Promise<T> {
    await new Promise<void>((resolve) => {
      queue.push(resolve);
      pump();
    });

    try {
      return await work();
    } finally {
      active -= 1;
      pump();
    }
  };
}

function latestStatus(receipts: CreativeBudgetReceipt[]): CreativeBudgetReceipt["status"] | undefined {
  return receipts.at(-1)?.status;
}

function assertRetryPolicy(input: {
  slots: CreativeSchedulerSlot[];
  ledger: CreativeBudgetLedger;
  retry?: CreativeSchedulerRetryPolicy;
}): void {
  const named = new Set(input.retry?.namedSlotIds ?? []);
  const knownSlotIds = new Set(input.slots.map((slot) => slot.slotId));

  for (const slotId of named) {
    if (!knownSlotIds.has(slotId)) {
      throw new Error(`Named retry slot ${slotId} is not present in this scheduler run.`);
    }
  }

  const hasRetryableReceipt = input.slots.some((slot) => {
    const status = latestStatus(getCreativeBudgetReceiptsForSlot(input.ledger, slot.slotId));
    return status === "warning" || status === "failed";
  });

  if (input.retry?.retryWarnings && named.size === 0 && hasRetryableReceipt) {
    throw new Error("Whole-pack warning retries are banned; retry only named failed or warning slots.");
  }
}

function createSnapshot(input: {
  runId: string;
  slots: Record<string, CreativeSchedulerSlotProgress>;
}): CreativeSchedulerProgressSnapshot {
  const slots = Object.fromEntries(
    Object.entries(input.slots).map(([slotId, progress]) => [slotId, { ...progress }]),
  );
  const allSlots = Object.values(slots);
  const failed = allSlots.filter((slot) => slot.stage === "failed").length;

  return {
    runId: input.runId,
    phase: failed > 0 ? "completed-with-failures" : "running",
    slots,
    runningProviderSlots: allSlots
      .filter((slot) => slot.stage === "provider-running")
      .map((slot) => slot.slotId),
    runningLocalSlots: allSlots
      .filter((slot) => slot.stage === "local-cutout-running")
      .map((slot) => slot.slotId),
    completed: allSlots.filter((slot) =>
      slot.stage === "clean" || slot.stage === "skipped-clean-receipt"
    ).length,
    failed,
    pending: allSlots.filter((slot) => slot.stage === "pending").length,
  };
}

export async function runCreativeSlotScheduler(input: {
  runId: string;
  slots: CreativeSchedulerSlot[];
  provider: CreativeProviderAdapter;
  budgetLedger: CreativeBudgetLedger;
  policy: CreativeSchedulerPolicy;
  retry?: CreativeSchedulerRetryPolicy;
  leaseStore?: CreativeSlotLeaseStore;
  workerId?: string;
  processLocalOutput?: (input: {
    slot: CreativeSchedulerSlot;
    providerResult: CreativeProviderGenerationResult;
  }) => Promise<{ status: "clean" | "warning" | "failed"; outputHash?: string; failureClassification?: CreativeFailureClassification }>;
  onProgress?: (snapshot: CreativeSchedulerProgressSnapshot) => void;
}): Promise<CreativeSchedulerResult> {
  assertRetryPolicy({ slots: input.slots, ledger: input.budgetLedger, retry: input.retry });

  let ledger = input.budgetLedger;
  const leaseStore = input.leaseStore ?? new InMemorySlotLeaseStore();
  const workerId = input.workerId ?? `scheduler-${input.runId}`;
  const namedRetries = new Set(input.retry?.namedSlotIds ?? []);
  const slotResults: Record<string, CreativeSchedulerSlotProgress> = {};
  const runnable: Array<{ slot: CreativeSchedulerSlot; attemptId: string; namedRetryAuthorized: boolean }> = [];
  const snapshots: CreativeSchedulerProgressSnapshot[] = [];

  const emit = () => {
    const snapshot = createSnapshot({ runId: input.runId, slots: slotResults });
    snapshots.push(snapshot);
    input.onProgress?.(snapshot);
  };

  for (const slot of input.slots) {
    if (slot.providerId !== input.provider.providerId) {
      throw new Error(`Slot ${slot.slotId} uses provider ${slot.providerId}, but scheduler received ${input.provider.providerId}.`);
    }

    const latest = getLatestCreativeBudgetReceipt(ledger, slot.slotId);
    const attemptId = slot.attemptId ?? getNextCreativeAttemptId(ledger, slot.slotId);

    if (latest?.status === "clean") {
      slotResults[slot.slotId] = {
        slotId: slot.slotId,
        attemptId: latest.attemptId,
        stage: "skipped-clean-receipt",
        providerId: slot.providerId,
      };
      continue;
    }

    if ((latest?.status === "warning" || latest?.status === "failed") && !namedRetries.has(slot.slotId)) {
      slotResults[slot.slotId] = {
        slotId: slot.slotId,
        attemptId: latest.attemptId,
        stage: "skipped-warning-receipt",
        providerId: slot.providerId,
        failureClassification: latest.failureClassification,
      };
      continue;
    }

    slotResults[slot.slotId] = {
      slotId: slot.slotId,
      attemptId,
      stage: "pending",
      providerId: slot.providerId,
    };
    runnable.push({ slot, attemptId, namedRetryAuthorized: namedRetries.has(slot.slotId) });
  }
  emit();

  const providerConcurrency = Math.min(
    input.policy.perRunMaxConcurrency,
    input.policy.perProviderMaxConcurrency[input.provider.providerId] ?? input.provider.maxSafeConcurrency(),
    input.provider.maxSafeConcurrency(),
  );
  const providerLimit = createLimiter(providerConcurrency);
  const localLimit = createLimiter(input.policy.localStageMaxConcurrency);
  const localTasks: Array<Promise<void>> = [];

  const runLocalStage = async (
    slot: CreativeSchedulerSlot,
    attemptId: string,
    providerResult: CreativeProviderGenerationResult,
  ): Promise<void> => {
    const lease = acquireCreativeSlotLease(leaseStore, {
      runId: input.runId,
      slotId: slot.slotId,
      attemptId,
      stage: "local-cutout",
      workerId,
      timeoutMs: input.policy.slotLeaseTimeoutMs,
    });

    try {
      slotResults[slot.slotId] = {
        slotId: slot.slotId,
        attemptId,
        stage: "local-cutout-running",
        providerId: slot.providerId,
      };
      emit();
      const localResult = input.processLocalOutput
        ? await input.processLocalOutput({ slot, providerResult })
        : { status: "clean" as const, outputHash: providerResult.outputHash };

      slotResults[slot.slotId] = {
        slotId: slot.slotId,
        attemptId,
        stage: localResult.status === "failed" ? "failed" : "clean",
        providerId: slot.providerId,
        ...(localResult.failureClassification ? { failureClassification: localResult.failureClassification } : {}),
      };
    } catch (error) {
      slotResults[slot.slotId] = {
        slotId: slot.slotId,
        attemptId,
        stage: "failed",
        providerId: slot.providerId,
        failureClassification: {
          code: error instanceof Error ? error.message : "local-cutout-failed",
          retryable: true,
          paid: false,
          severity: "blocked",
        },
      };
    } finally {
      releaseCreativeSlotLease(leaseStore, lease);
      emit();
    }
  };

  const runProviderStage = async (entry: typeof runnable[number]): Promise<void> => {
    const { slot, attemptId, namedRetryAuthorized } = entry;
    const lease = acquireCreativeSlotLease(leaseStore, {
      runId: input.runId,
      slotId: slot.slotId,
      attemptId,
      stage: "provider",
      workerId,
      timeoutMs: input.policy.slotLeaseTimeoutMs,
    });
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    let reservationId: string | undefined;

    try {
      heartbeatTimer = setInterval(() => {
        heartbeatCreativeSlotLease(leaseStore, lease);
      }, Math.max(1, Math.floor(input.policy.slotLeaseTimeoutMs / 4)));
      const request: CreativeProviderSlotRequest = {
        runId: input.runId,
        slotId: slot.slotId,
        attemptId,
        prompt: slot.prompt,
        sourceHash: slot.sourceHash,
        ...(slot.promptHash ? { promptHash: slot.promptHash } : {}),
        ...(slot.referenceHash ? { referenceHash: slot.referenceHash } : {}),
        ...(slot.providerModel ? { providerModel: slot.providerModel } : {}),
        ...(slot.metadata ? { metadata: slot.metadata } : {}),
      };
      const estimate = await input.provider.estimateCost(request);
      const reserved = input.provider.reserveBudget(ledger, {
        ...request,
        estimateCents: estimate.estimatedCostCents,
        namedRetryAuthorized,
      });
      ledger = reserved.ledger;
      reservationId = reserved.reservation.reservationId;
      slotResults[slot.slotId] = {
        slotId: slot.slotId,
        attemptId,
        stage: "provider-running",
        providerId: slot.providerId,
      };
      emit();
      const providerResult = await input.provider.generateSlot(request);
      const spent = recordCreativeBudgetSpend(ledger, {
        reservationId,
        actualCostCents: providerResult.actualCostCents,
        responseMetadata: providerResult.responseMetadata,
        status: providerResult.status,
        outputHash: providerResult.outputHash,
        failureClassification: providerResult.failureClassification,
      });
      ledger = spent.ledger;

      if (providerResult.status === "failed") {
        slotResults[slot.slotId] = {
          slotId: slot.slotId,
          attemptId,
          stage: "failed",
          providerId: slot.providerId,
          failureClassification: providerResult.failureClassification,
        };
        emit();
        return;
      }

      localTasks.push(localLimit(() => runLocalStage(slot, attemptId, providerResult)));
    } catch (error) {
      const failureClassification = input.provider.classifyFailure(error);

      if (reservationId && !failureClassification.paid) {
        ledger = releaseCreativeBudgetReservation(ledger, {
          reservationId,
          reason: failureClassification.code,
        });
      } else if (reservationId && failureClassification.paid) {
        const spent = recordCreativeBudgetSpend(ledger, {
          reservationId,
          actualCostCents: 0,
          responseMetadata: { schedulerFailure: true },
          status: "failed",
          failureClassification,
        });
        ledger = spent.ledger;
      }

      slotResults[slot.slotId] = {
        slotId: slot.slotId,
        attemptId,
        stage: "failed",
        providerId: slot.providerId,
        failureClassification,
      };
      emit();
    } finally {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      releaseCreativeSlotLease(leaseStore, lease);
    }
  };

  await Promise.all(runnable.map((entry) => providerLimit(() => runProviderStage(entry))));
  await Promise.all(localTasks);

  const failed = Object.values(slotResults).some((slot) => slot.stage === "failed");
  const finalStatus = failed ? "completed-with-failures" : "completed";
  const finalSnapshot = createSnapshot({ runId: input.runId, slots: slotResults });
  finalSnapshot.phase = finalStatus;
  snapshots.push(finalSnapshot);
  input.onProgress?.(finalSnapshot);

  return {
    status: finalStatus,
    budgetLedger: ledger,
    receipts: ledger.receipts,
    slotResults,
    snapshots,
  };
}

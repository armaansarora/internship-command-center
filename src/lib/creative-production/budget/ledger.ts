export type CreativeProductionProviderId =
  | "gemini-api"
  | "subscription-manual-bridge"
  | "local-mock"
  | "openai-api";

export type CreativeBudgetReceiptStatus = "clean" | "warning" | "failed";

export interface CreativeFailureClassification {
  code: string;
  retryable: boolean;
  paid: boolean;
  severity?: "warning" | "blocked";
}

export interface CreativeBudgetReservation {
  reservationId: string;
  runId: string;
  slotId: string;
  attemptId: string;
  providerId: CreativeProductionProviderId;
  estimateCents: number;
  sourceHash: string;
  status: "reserved" | "spent" | "released";
  namedRetryAuthorized: boolean;
  createdAt: string;
  updatedAt: string;
  releaseReason?: string;
}

export interface CreativeBudgetReceipt {
  schemaVersion: "tower-creative-budget-receipt-v1";
  receiptId: string;
  runId: string;
  slotId: string;
  attemptId: string;
  providerId: CreativeProductionProviderId;
  reservationId: string;
  status: CreativeBudgetReceiptStatus;
  costEstimateCents: number;
  actualCostCents: number;
  sourceHash: string;
  outputHash?: string;
  responseMetadata: Record<string, unknown>;
  failureClassification?: CreativeFailureClassification;
  startedAt: string;
  completedAt: string;
}

export interface CreativeBudgetTotals {
  estimatedCents: number;
  reservedCents: number;
  spentCents: number;
  releasedCents: number;
  refundedCents: number;
  remainingCents: number;
}

export interface CreativeBudgetLedger {
  schemaVersion: "tower-creative-budget-ledger-v1";
  runId: string;
  approvedBudgetCents: number;
  createdAt: string;
  updatedAt: string;
  totals: CreativeBudgetTotals;
  reservations: CreativeBudgetReservation[];
  receipts: CreativeBudgetReceipt[];
}

export interface CreativeBudgetReservationResult {
  ledger: CreativeBudgetLedger;
  reservation: CreativeBudgetReservation;
}

export interface CreativeBudgetSpendResult {
  ledger: CreativeBudgetLedger;
  receipt: CreativeBudgetReceipt;
}

function isoNow(now?: string | Date): string {
  if (typeof now === "string") return now;
  return (now ?? new Date()).toISOString();
}

function assertLedger(
  ledger: CreativeBudgetLedger | undefined,
): asserts ledger is CreativeBudgetLedger {
  if (!ledger || ledger.schemaVersion !== "tower-creative-budget-ledger-v1") {
    throw new Error("Budget ledger is required before creative provider work can start.");
  }
}

function assertCents(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite cent value.`);
  }
}

function calculateTotals(ledger: Omit<CreativeBudgetLedger, "totals">): CreativeBudgetTotals {
  const estimatedCents = ledger.reservations.reduce(
    (sum, reservation) => sum + reservation.estimateCents,
    0,
  );
  const reservedCents = ledger.reservations
    .filter((reservation) => reservation.status === "reserved")
    .reduce((sum, reservation) => sum + reservation.estimateCents, 0);
  const spentCents = ledger.receipts.reduce(
    (sum, receipt) => sum + receipt.actualCostCents,
    0,
  );
  const releasedCents = ledger.reservations
    .filter((reservation) => reservation.status === "released")
    .reduce((sum, reservation) => sum + reservation.estimateCents, 0);
  const refundedCents = 0;

  return {
    estimatedCents,
    reservedCents,
    spentCents,
    releasedCents,
    refundedCents,
    remainingCents: ledger.approvedBudgetCents - spentCents - reservedCents + refundedCents,
  };
}

function withTotals(ledger: Omit<CreativeBudgetLedger, "totals">): CreativeBudgetLedger {
  return {
    ...ledger,
    totals: calculateTotals(ledger),
  };
}

function paidReceiptsForSlot(
  ledger: CreativeBudgetLedger,
  slotId: string,
): CreativeBudgetReceipt[] {
  return ledger.receipts.filter((receipt) =>
    receipt.slotId === slotId && receipt.actualCostCents > 0,
  );
}

export function createCreativeBudgetLedger(input: {
  runId: string;
  approvedBudgetCents: number;
  createdAt?: string | Date;
}): CreativeBudgetLedger {
  assertCents(input.approvedBudgetCents, "approvedBudgetCents");
  if (!input.runId.trim()) throw new Error("Budget ledger runId is required.");
  const createdAt = isoNow(input.createdAt);

  return withTotals({
    schemaVersion: "tower-creative-budget-ledger-v1",
    runId: input.runId,
    approvedBudgetCents: input.approvedBudgetCents,
    createdAt,
    updatedAt: createdAt,
    reservations: [],
    receipts: [],
  });
}

export function reserveCreativeBudget(
  ledger: CreativeBudgetLedger | undefined,
  input: {
    providerId: CreativeProductionProviderId;
    slotId: string;
    attemptId: string;
    estimateCents: number;
    sourceHash: string;
    now?: string | Date;
    namedRetryAuthorized?: boolean;
  },
): CreativeBudgetReservationResult {
  assertLedger(ledger);
  assertCents(input.estimateCents, "estimateCents");

  const activeDuplicate = ledger.reservations.find((reservation) =>
    reservation.slotId === input.slotId &&
    reservation.attemptId === input.attemptId &&
    reservation.status === "reserved",
  );
  if (activeDuplicate) {
    throw new Error(`Budget reservation already exists for ${input.slotId} ${input.attemptId}.`);
  }

  const priorPaidReceipts = paidReceiptsForSlot(ledger, input.slotId);
  const hasPriorAttempt = priorPaidReceipts.some((receipt) => receipt.attemptId !== input.attemptId);
  const hasSameAttemptReceipt = priorPaidReceipts.some((receipt) => receipt.attemptId === input.attemptId);

  if (hasSameAttemptReceipt) {
    throw new Error(`Duplicate spend blocked for ${input.slotId} ${input.attemptId}.`);
  }

  if (hasPriorAttempt && !input.namedRetryAuthorized) {
    throw new Error(`Paid retry for ${input.slotId} requires named-slot retry authorization.`);
  }

  const projectedReserved = ledger.totals.spentCents + ledger.totals.reservedCents + input.estimateCents;
  if (projectedReserved > ledger.approvedBudgetCents) {
    throw new Error(`Creative provider reservation would exceed approved budget ${ledger.approvedBudgetCents} cents.`);
  }

  const now = isoNow(input.now);
  const reservation: CreativeBudgetReservation = {
    reservationId: `${input.slotId}__${input.attemptId}__reservation-${ledger.reservations.length + 1}`,
    runId: ledger.runId,
    slotId: input.slotId,
    attemptId: input.attemptId,
    providerId: input.providerId,
    estimateCents: input.estimateCents,
    sourceHash: input.sourceHash,
    status: "reserved",
    namedRetryAuthorized: input.namedRetryAuthorized ?? false,
    createdAt: now,
    updatedAt: now,
  };

  return {
    reservation,
    ledger: withTotals({
      ...ledger,
      updatedAt: now,
      reservations: [...ledger.reservations, reservation],
    }),
  };
}

export function recordCreativeBudgetSpend(
  ledger: CreativeBudgetLedger | undefined,
  input: {
    reservationId: string;
    actualCostCents: number;
    responseMetadata: Record<string, unknown>;
    status: CreativeBudgetReceiptStatus;
    now?: string | Date;
    outputHash?: string;
    failureClassification?: CreativeFailureClassification;
  },
): CreativeBudgetSpendResult {
  assertLedger(ledger);
  assertCents(input.actualCostCents, "actualCostCents");

  const reservation = ledger.reservations.find((entry) => entry.reservationId === input.reservationId);
  if (!reservation || reservation.status !== "reserved") {
    throw new Error(`Active budget reservation ${input.reservationId} was not found.`);
  }

  const projectedSpent = ledger.totals.spentCents + input.actualCostCents;
  if (projectedSpent > ledger.approvedBudgetCents) {
    throw new Error(`Creative provider spend would exceed approved budget ${ledger.approvedBudgetCents} cents.`);
  }

  const completedAt = isoNow(input.now);
  const receipt: CreativeBudgetReceipt = {
    schemaVersion: "tower-creative-budget-receipt-v1",
    receiptId: `${reservation.slotId}__${reservation.attemptId}__receipt-${ledger.receipts.length + 1}`,
    runId: ledger.runId,
    slotId: reservation.slotId,
    attemptId: reservation.attemptId,
    providerId: reservation.providerId,
    reservationId: reservation.reservationId,
    status: input.status,
    costEstimateCents: reservation.estimateCents,
    actualCostCents: input.actualCostCents,
    sourceHash: reservation.sourceHash,
    ...(input.outputHash ? { outputHash: input.outputHash } : {}),
    responseMetadata: input.responseMetadata,
    failureClassification: input.failureClassification,
    startedAt: reservation.createdAt,
    completedAt,
  };
  const reservations = ledger.reservations.map((entry) =>
    entry.reservationId === reservation.reservationId
      ? { ...entry, status: "spent" as const, updatedAt: completedAt }
      : entry,
  );

  return {
    receipt,
    ledger: withTotals({
      ...ledger,
      updatedAt: completedAt,
      reservations,
      receipts: [...ledger.receipts, receipt],
    }),
  };
}

export function releaseCreativeBudgetReservation(
  ledger: CreativeBudgetLedger | undefined,
  input: {
    reservationId: string;
    reason: string;
    now?: string | Date;
  },
): CreativeBudgetLedger {
  assertLedger(ledger);
  const reservation = ledger.reservations.find((entry) => entry.reservationId === input.reservationId);
  if (!reservation || reservation.status !== "reserved") {
    throw new Error(`Active budget reservation ${input.reservationId} was not found.`);
  }

  const now = isoNow(input.now);
  const reservations = ledger.reservations.map((entry) =>
    entry.reservationId === reservation.reservationId
      ? { ...entry, status: "released" as const, updatedAt: now, releaseReason: input.reason }
      : entry,
  );

  return withTotals({
    ...ledger,
    updatedAt: now,
    reservations,
  });
}

export function getCreativeBudgetReceiptsForSlot(
  ledger: CreativeBudgetLedger,
  slotId: string,
): CreativeBudgetReceipt[] {
  return ledger.receipts.filter((receipt) => receipt.slotId === slotId);
}

export function getLatestCreativeBudgetReceipt(
  ledger: CreativeBudgetLedger,
  slotId: string,
): CreativeBudgetReceipt | undefined {
  return getCreativeBudgetReceiptsForSlot(ledger, slotId).at(-1);
}

export function getNextCreativeAttemptId(
  ledger: CreativeBudgetLedger,
  slotId: string,
): string {
  return `${slotId}-attempt-${getCreativeBudgetReceiptsForSlot(ledger, slotId).length + 1}`;
}

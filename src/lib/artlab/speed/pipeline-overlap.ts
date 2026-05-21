export interface PipelineOverlapInput<T> {
  conceptOk: boolean;
  runConceptQa(): Promise<T>;
  prepCanary(): Promise<void>;
}

export interface PipelineOverlapResult<T> {
  qaResult: T;
}

/**
 * SPEED: Phase 5 — run concept QA and canary prep in parallel when concept
 * succeeded. If concept failed, do NOT prep canary (canary is wasted work
 * on a board that won't be approved). Quality preservation: canary prep
 * artifacts are not consumed until concept QA passes downstream, so the
 * overlap is purely a wall-clock optimization.
 */
export async function runWithCanaryPrepOverlap<T>(input: PipelineOverlapInput<T>): Promise<PipelineOverlapResult<T>> {
  if (!input.conceptOk) {
    const qaResult = await input.runConceptQa();
    return { qaResult };
  }
  const [qaResult] = await Promise.all([
    input.runConceptQa(),
    input.prepCanary(),
  ]);
  return { qaResult };
}

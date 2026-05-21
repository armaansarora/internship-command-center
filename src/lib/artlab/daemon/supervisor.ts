// src/lib/artlab/daemon/supervisor.ts
export const MAX_CHILDREN = 2;

export interface SupervisorChild {
  runId: string;
  pid: number;
}

export interface RegisterChildResult {
  accepted: boolean;
  reason?: string;
}

export interface Supervisor {
  canSpawn(): boolean;
  registerChild(child: SupervisorChild): RegisterChildResult;
  releaseChild(runId: string): boolean;
  activeChildren(): SupervisorChild[];
  findChildByRunId(runId: string): SupervisorChild | null;
}

export function createSupervisor(): Supervisor {
  const children = new Map<string, SupervisorChild>();
  return {
    canSpawn(): boolean { return children.size < MAX_CHILDREN; },
    registerChild(child: SupervisorChild): RegisterChildResult {
      if (children.size >= MAX_CHILDREN) return { accepted: false, reason: `parallelism cap reached (${MAX_CHILDREN})` };
      children.set(child.runId, child);
      return { accepted: true };
    },
    releaseChild(runId: string): boolean { return children.delete(runId); },
    activeChildren(): SupervisorChild[] { return Array.from(children.values()); },
    findChildByRunId(runId: string): SupervisorChild | null { return children.get(runId) ?? null; },
  };
}

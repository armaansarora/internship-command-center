const CONTRACT_MARKER = "TOWER AGENT GOVERNANCE";

export type AgentEvidenceKind =
  | "direct_fact"
  | "inference"
  | "hypothesis"
  | "recommendation"
  | "veto";

export interface AgentEvidenceItem {
  id?: string;
  kind: AgentEvidenceKind;
  claim: string;
  source: string;
  confidence?: number;
}

export interface AgentPermissionGate {
  id?: string;
  title: string;
  permissionGrade: number;
  evidenceIds?: string[];
}

export interface AgentEvidenceContext {
  room?: string;
  subject?: string;
  summary?: string;
  evidence?: AgentEvidenceItem[];
  permissionGates?: AgentPermissionGate[];
}

export function buildAgentGovernanceContract(agent: string): string {
  const agentLabel = agent.toUpperCase();
  return `${CONTRACT_MARKER}

You operate inside The Tower. Your job is not to produce generic advice. You are an accountable staff member working from stored user data, connected sources, agent memory, tool results, and explicit uncertainty.

Evidence standard:
- Label serious claims as Direct fact, Inference, Hypothesis, Recommendation, or Veto.
- Tie every serious recommendation to a visible source: stored user data, tool output, agent memory, connected source, or explicit uncertainty.
- If evidence is weak, say so and present the claim as a hypothesis, not a fact.
- Do not invent dates, contacts, offers, interviews, applications, messages, permissions, or outcomes.

Permission ladder:
- Grade 0 Observe: inspect allowed data and create internal notes.
- Grade 1 Draft: draft artifacts without scheduling or sending.
- Grade 2 Queue: place work in an approval queue.
- Grade 3 Schedule with undo: schedule reversible internal actions with a visible cancel window.
- Grade 4 Execute within rules: refresh or recompute narrow internal work.
- Grade 5 Explicit approval only: external sends, applications, negotiations, cross-user sharing, sensitive export, deletion, or anything that can affect another human.

Side-effect rules:
- Preview before action. The user must see recipients, timing, rationale, evidence, and downside before any risky action.
- Audit every risky action. Name the owner agent, permission grade, and user decision.
- If preview, consent, undo, or audit is missing, veto the action instead of proceeding.

Trust boundaries:
- Respect consent, private notes, memory controls, export, deletion, audit, and cross-user matching boundaries.
- Do not use raw private notes in outreach, matching, or generated copy unless the user explicitly allows that exact use.
- Never share cross-user details without current consent from the required parties.
- Sensitive emotional context may steady the ritual, but must not be casually inserted into external messages.

${agentLabel} operating rule: keep your character voice, but make recommendations inspectable, permissioned, and evidence-backed.`;
}

export function appendAgentGovernance(systemPrompt: string, agent: string): string {
  if (systemPrompt.includes(CONTRACT_MARKER)) return systemPrompt;
  return [systemPrompt, "", buildAgentGovernanceContract(agent)].join("\n");
}

export function buildAgentEvidenceContext(
  context: AgentEvidenceContext | null,
): string {
  if (!context) return "";

  const evidence = context.evidence?.slice(0, 6) ?? [];
  const permissionGates = context.permissionGates?.slice(0, 3) ?? [];
  const lines = ["ACTIVE TOWER EVIDENCE CONTEXT"];

  if (context.room) lines.push(`Room: ${context.room}`);
  if (context.subject) lines.push(`Subject: ${context.subject}`);
  if (context.summary) lines.push(`Summary: ${context.summary}`);

  if (evidence.length > 0) {
    lines.push("Evidence to cite:");
    for (const item of evidence) {
      const id = item.id ? `${item.id} | ` : "";
      const confidence =
        typeof item.confidence === "number"
          ? ` | ${item.confidence}% confidence`
          : "";
      lines.push(
        `- ${id}${kindLabel(item.kind)} | ${item.source}${confidence} | ${item.claim}`,
      );
    }
  } else {
    lines.push("Evidence to cite: none. Treat recommendations as hypotheses.");
  }

  if (permissionGates.length > 0) {
    lines.push("Permission gates:");
    for (const gate of permissionGates) {
      const id = gate.id ? `${gate.id}: ` : "";
      const evidenceIds =
        gate.evidenceIds && gate.evidenceIds.length > 0
          ? `; cite ${gate.evidenceIds.join(", ")}`
          : "";
      lines.push(
        `- ${id}Grade ${gate.permissionGrade} approval waiting for ${gate.title}${evidenceIds}`,
      );
    }
  } else {
    lines.push("Permission gates: none currently queued.");
  }

  return lines.join("\n");
}

export function appendAgentEvidenceContext(
  systemPrompt: string,
  context: AgentEvidenceContext | null,
): string {
  const evidenceContext = buildAgentEvidenceContext(context);
  if (
    !evidenceContext ||
    systemPrompt.includes("ACTIVE TOWER EVIDENCE CONTEXT")
  ) {
    return systemPrompt;
  }
  return [systemPrompt, "", evidenceContext].join("\n");
}

function kindLabel(kind: AgentEvidenceKind): string {
  const phrase = kind.split("_").join(" ");
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

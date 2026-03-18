/** Agent department identifiers */
export type AgentId = "CEO" | "CRO" | "CIO" | "COO" | "CMO" | "CPO" | "CNO" | "CFO";

/** Agent status during execution */
export type AgentStatus = "idle" | "thinking" | "executing" | "complete" | "error";

/** Agent configuration */
export interface AgentConfig {
  id: AgentId;
  name: string;
  title: string;
  floor: string;
  personality: string;
  systemPrompt: string;
}

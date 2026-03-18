import type { z } from "zod/v4";
import type { DepartmentId } from "./events";
import type { SSEEvent, NotificationSSEEvent } from "./api";

export interface BellButtonProps {
  onRing: (prompt?: string) => Promise<string>; // returns executionId
  isRinging: boolean;
  disabled?: boolean;
}

export interface AgentExecutionPanelProps {
  executionId: string | null;
  onClose: () => void;
}

export interface DepartmentStatusRow {
  department: DepartmentId;
  label: string;
  status: "idle" | "running" | "complete" | "error";
  currentStep?: string;
  progress?: number;
  summary?: string;
  durationMs?: number;
}

export interface BriefingCardProps {
  briefingId: string;
  headline: string;
  sections: Array<{
    department: DepartmentId;
    title: string;
    content: string;
    highlights: string[];
    pendingActions: Array<{
      description: string;
      actionType: string;
      entityId?: string;
    }>;
  }>;
  metrics: {
    totalTokensUsed: number;
    totalDurationMs: number;
    departmentsInvolved: DepartmentId[];
  };
  createdAt: string;
}

export interface NotificationBellProps {
  unreadCount: number;
}

export interface NotificationItemProps {
  id: string;
  type: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  body: string;
  sourceAgent?: string;
  isRead: boolean;
  actions?: Array<{ label: string; href?: string; action?: string }>;
  createdAt: string;
  onRead: (id: string) => void;
  onAction: (action: string, entityId?: string) => void;
}

export interface OutreachApprovalCardProps {
  outreachId: string;
  type: string;
  contactName?: string;
  company?: string;
  subject: string;
  body: string;
  generatedBy: DepartmentId;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
  onEdit: (id: string) => void;
}

export interface DashboardBriefingProps {
  latestBriefing: BriefingCardProps | null;
  isLoading: boolean;
  onRingBell: () => void;
}

export interface UseAgentStreamReturn {
  events: Array<z.infer<typeof SSEEvent>>;
  isConnected: boolean;
  error: Error | null;
}

export interface UseNotificationStreamReturn {
  unreadCount: number;
  latestNotification: z.infer<typeof NotificationSSEEvent> | null;
  isConnected: boolean;
}

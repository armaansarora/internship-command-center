// Event contracts
export {
  DepartmentId,
  AgentPriority,
  ExecutionId,
  BellRingEvent,
  CeoDispatchEvent,
  AgentCompleteEvent,
  AgentErrorEvent,
  BriefingCompileEvent,
  BriefingReadyEvent,
  OutreachDraftEvent,
  OutreachApprovedEvent,
  OutreachSentEvent,
  AgentStartEvent,
  AgentProgressEvent,
  NotificationCreateEvent,
  ScheduledBriefingEvent,
  ScheduledSnapshotEvent,
  EventMap,
} from "./events";

// Agent protocol
export {
  AgentDefinition,
  AgentTask,
  AgentResult,
  CeoDecision,
  BriefingSummary,
} from "./agent-protocol";

// Department-specific
export { CroResultData, CroTools } from "./departments/cro";
export { CioResultData, CioTools } from "./departments/cio";
export { CooResultData, CooTools, EmailClassification } from "./departments/coo";

// API route contracts
export {
  BellRingRequest,
  BellRingResponse,
  AgentStreamParams,
  SSEEvent,
  BriefingResponse,
  LatestBriefingResponse,
  NotificationSSEEvent,
  NotificationListParams,
  NotificationListResponse,
  MarkReadResponse,
  OutreachApproveResponse,
  OutreachRejectRequest,
  OutreachRejectResponse,
  ROUTE_MANIFEST,
} from "./api";

// UI component contracts
export type {
  BellButtonProps,
  AgentExecutionPanelProps,
  DepartmentStatusRow,
  BriefingCardProps,
  NotificationBellProps,
  NotificationItemProps,
  OutreachApprovalCardProps,
  DashboardBriefingProps,
  UseAgentStreamReturn,
  UseNotificationStreamReturn,
} from "./ui";

// Notification contracts
export {
  NotificationType,
  PushPayload,
  PushSubscription,
  CHANNEL_ROUTING,
} from "./notifications";

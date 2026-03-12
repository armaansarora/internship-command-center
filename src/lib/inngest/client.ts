import { Inngest, EventSchemas } from "inngest";
import type { z } from "zod/v4";
import type {
  BellRingEvent,
  CeoDispatchEvent,
  AgentStartEvent,
  AgentProgressEvent,
  AgentCompleteEvent,
  AgentErrorEvent,
  BriefingCompileEvent,
  BriefingReadyEvent,
  OutreachDraftEvent,
  OutreachApprovedEvent,
  OutreachSentEvent,
  NotificationCreateEvent,
  ScheduledBriefingEvent,
  ScheduledSnapshotEvent,
} from "@/contracts";

// Inngest event type map — keys are event names, values are { data: ... }
type IccEvents = {
  "bell/ring": z.infer<typeof BellRingEvent>["data"];
  "ceo/dispatch": z.infer<typeof CeoDispatchEvent>["data"];
  "agent/start": z.infer<typeof AgentStartEvent>["data"];
  "agent/progress": z.infer<typeof AgentProgressEvent>["data"];
  "agent/complete": z.infer<typeof AgentCompleteEvent>["data"];
  "agent/error": z.infer<typeof AgentErrorEvent>["data"];
  "briefing/compile": z.infer<typeof BriefingCompileEvent>["data"];
  "briefing/ready": z.infer<typeof BriefingReadyEvent>["data"];
  "outreach/draft": z.infer<typeof OutreachDraftEvent>["data"];
  "outreach/approved": z.infer<typeof OutreachApprovedEvent>["data"];
  "outreach/sent": z.infer<typeof OutreachSentEvent>["data"];
  "notification/create": z.infer<typeof NotificationCreateEvent>["data"];
  "cron/daily-briefing": z.infer<typeof ScheduledBriefingEvent>["data"];
  "cron/daily-snapshot": z.infer<typeof ScheduledSnapshotEvent>["data"];
};

export const inngest = new Inngest({
  id: "icc",
  schemas: new EventSchemas().fromRecord<{
    [K in keyof IccEvents]: { data: IccEvents[K] };
  }>(),
});

import { z } from "zod/v4";

export const NotificationType = z.enum([
  "agent_started",
  "agent_completed",
  "agent_error",
  "briefing_ready",
  "outreach_pending",
  "outreach_sent",
  "status_change",
  "interview_scheduled",
  "deadline_approaching",
]);

export const PushPayload = z.object({
  title: z.string(),
  body: z.string(),
  icon: z.string().default("/icons/icc-192.png"),
  badge: z.string().default("/icons/icc-badge.png"),
  tag: z.string(),
  data: z.object({
    url: z.string(),
    notificationId: z.string(),
    type: NotificationType,
  }),
  actions: z
    .array(z.object({ action: z.string(), title: z.string() }))
    .max(2)
    .optional(),
});

export const PushSubscription = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export const CHANNEL_ROUTING: Record<string, string[]> = {
  briefing_ready: ["in_app", "push"],
  outreach_pending: ["in_app", "push"],
  interview_scheduled: ["in_app", "push"],
  deadline_approaching: ["in_app", "push"],
  agent_error: ["in_app", "push"],
  agent_started: ["in_app"],
  agent_completed: ["in_app"],
  outreach_sent: ["in_app"],
  status_change: ["in_app"],
};

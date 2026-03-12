import { db } from "@/db";
import { notifications } from "@/db/schema";
import { notificationBus } from "./notification-bus";
import type { z } from "zod/v4";
import type { NotificationCreateEvent } from "@/contracts/events";

const randomHex = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

type NotifData = z.infer<typeof NotificationCreateEvent>["data"];

export async function routeNotification(data: NotifData) {
  const id = randomHex();
  const now = new Date().toISOString();

  // Write to DB
  await db.insert(notifications).values({
    id,
    type: data.type,
    priority: data.priority,
    title: data.title,
    body: data.body,
    sourceAgent: data.sourceAgent ?? null,
    sourceEntityId: data.sourceEntityId ?? null,
    sourceEntityType: data.sourceEntityType ?? null,
    channels: JSON.stringify(data.channels),
    actions: data.actions ? JSON.stringify(data.actions) : null,
    createdAt: now,
  });

  // Push to in-app SSE stream
  if (data.channels.includes("in_app")) {
    notificationBus.publish({
      type: "new_notification",
      id,
      title: data.title,
      body: data.body,
      priority: data.priority,
      sourceAgent: data.sourceAgent,
      actions: data.actions,
      timestamp: now,
    });
  }

  return id;
}

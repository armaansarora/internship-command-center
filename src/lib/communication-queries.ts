"use server";

import { db } from "@/db";
import { emails, outreachQueue, contacts, companies } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export type EmailWithMeta = typeof emails.$inferSelect;
export type OutreachWithMeta = typeof outreachQueue.$inferSelect & {
  contactName?: string | null;
  companyName?: string | null;
};

export async function getEmails(classification?: string) {
  try {
    if (classification && classification !== "all") {
      return await db
        .select()
        .from(emails)
        .where(eq(emails.classification, classification as EmailWithMeta["classification"] & string))
        .orderBy(desc(emails.receivedAt))
        .limit(100);
    }

    return await db
      .select()
      .from(emails)
      .orderBy(desc(emails.receivedAt))
      .limit(100);
  } catch {
    return [];
  }
}

export async function getEmailThread(threadId: string) {
  try {
    return await db
      .select()
      .from(emails)
      .where(eq(emails.threadId, threadId))
      .orderBy(emails.receivedAt);
  } catch {
    return [];
  }
}

export async function getOutreachQueue() {
  try {
    const rows = await db
      .select({
        id: outreachQueue.id,
        applicationId: outreachQueue.applicationId,
        contactId: outreachQueue.contactId,
        companyId: outreachQueue.companyId,
        type: outreachQueue.type,
        subject: outreachQueue.subject,
        body: outreachQueue.body,
        status: outreachQueue.status,
        generatedBy: outreachQueue.generatedBy,
        approvedAt: outreachQueue.approvedAt,
        sentAt: outreachQueue.sentAt,
        resendMessageId: outreachQueue.resendMessageId,
        createdAt: outreachQueue.createdAt,
        contactName: contacts.name,
        companyName: companies.name,
      })
      .from(outreachQueue)
      .leftJoin(contacts, eq(outreachQueue.contactId, contacts.id))
      .leftJoin(companies, eq(outreachQueue.companyId, companies.id))
      .where(eq(outreachQueue.status, "pending_approval"))
      .orderBy(desc(outreachQueue.createdAt));

    return rows;
  } catch {
    return [];
  }
}

export async function approveOutreach(id: string) {
  await db
    .update(outreachQueue)
    .set({
      status: "approved",
      approvedAt: new Date().toISOString(),
    })
    .where(eq(outreachQueue.id, id));
}

export async function rejectOutreach(id: string) {
  await db
    .update(outreachQueue)
    .set({ status: "rejected" })
    .where(eq(outreachQueue.id, id));
}

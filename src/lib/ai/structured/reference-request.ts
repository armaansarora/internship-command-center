/**
 * R10.14 — CNO reference-request draft helper.
 *
 * Single `generateObject` call. Mirrors `draftNegotiationEmail`'s shape
 * but with CNO warmth voice: relationship-first, specific to the target
 * company + role, references prior-interaction notes when the contact
 * record carries them, ends with a zero-pressure close.
 *
 * Caller: POST /api/contacts/[id]/reference-request.
 * Inserts the returned {subject, body} into `outreach_queue` as
 * `type='reference_request'`, `status='pending_approval'`. The existing
 * /api/outreach/approve flow picks it up and enforces the 24h send-hold
 * (reused via the type→seconds map extended in the sibling task).
 */
import { generateObject } from "ai";
import { z } from "zod/v4";
import { getAgentModel } from "../model";
import type { ContactForAgent } from "@/lib/db/queries/contacts-rest";
import type { OfferRow } from "@/lib/db/queries/offers-rest";

const RefReqSchema = z.object({
  subject: z.string().min(3).max(120),
  body: z.string().min(40).max(4000),
});

export type ReferenceRequestDraft = z.infer<typeof RefReqSchema>;

export async function draftReferenceRequest(input: {
  userFirstName: string;
  contact: ContactForAgent;
  offer: OfferRow;
}): Promise<ReferenceRequestDraft> {
  const contactJson = JSON.stringify(input.contact, null, 2);
  const offerJson = JSON.stringify(input.offer, null, 2);

  const { object } = await generateObject({
    model: getAgentModel(),
    schema: RefReqSchema,
    schemaName: "reference_request",
    system: `You are the CNO of The Tower. You draft a reference-request email on behalf of ${input.userFirstName} to ${input.contact.name} about the offer from ${input.offer.company_name}.

Rules:
- Warm, not formal. ${input.contact.name} is a relationship, not a customer.
- Specific. Name the company (${input.offer.company_name}) and role (${input.offer.role}). Reference any prior-interaction note from the contact record if present (notes field).
- Clear ask: "Would you be open to serving as a reference — short phone call or written note?" (both options, recipient's pick).
- End with: "No pressure if now isn't the right time" + offer to share more context on the role.
- Max 180 words. Plain prose, no bullet lists.
- No cliches — "I hope this email finds you well" is banned.
- Sign off with "— ${input.userFirstName}" — nothing more elaborate.`,
    prompt:
      `CONTACT:\n${contactJson}\n\nOFFER:\n${offerJson}\n\n` +
      `Draft the reference-request email. Weave any prior-interaction detail from the notes field into the body so this reads as personal, not a template.`,
  });

  return object;
}

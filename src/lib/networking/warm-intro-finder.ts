/**
 * R8 §6 — intra-user warm-intro finder.
 *
 * Given a user's contacts (each at a company), companies (each with an
 * embedding), and active applications (each at a target company), return
 * up to `perUserCap` proposals where the contact's company is cosine-
 * similar to the target company above `threshold`.
 *
 * This is purely intra-user.  Cross-user matching ships in R8.x after the
 * Red Team pass; R8 serves only "one of your own contacts is close to
 * your own target" proposals, which leaks zero information.
 */

export interface ContactShape {
  id: string;
  name: string;
  companyId: string | null;
  /** If the contact is already linked to an application, we skip them. */
  applicationId: string | null;
}

export interface CompanyEmbeddingShape {
  id: string;
  embedding: number[] | null;
}

export interface ActiveApplication {
  id: string;
  companyId: string | null;
}

export interface WarmIntroProposal {
  contactId: string;
  contactName: string;
  applicationId: string;
  similarity: number;
  fromCompanyId: string;
  toCompanyId: string;
}

export function findWarmIntros(args: {
  contacts: ContactShape[];
  companies: CompanyEmbeddingShape[];
  activeApps: ActiveApplication[];
  threshold: number;
  perUserCap: number;
}): WarmIntroProposal[] {
  const { contacts, companies, activeApps, threshold, perUserCap } = args;
  const byId = new Map(companies.map((c) => [c.id, c]));
  const proposals: WarmIntroProposal[] = [];

  for (const app of activeApps) {
    if (!app.companyId) continue;
    const target = byId.get(app.companyId);
    if (!target?.embedding) continue;

    for (const contact of contacts) {
      if (!contact.companyId) continue;
      if (contact.applicationId === app.id) continue;
      const from = byId.get(contact.companyId);
      if (!from?.embedding) continue;

      const sim = cosine(from.embedding, target.embedding);
      if (sim >= threshold) {
        proposals.push({
          contactId: contact.id,
          contactName: contact.name,
          applicationId: app.id,
          similarity: sim,
          fromCompanyId: contact.companyId,
          toCompanyId: app.companyId,
        });
      }
    }
  }

  proposals.sort((a, b) => b.similarity - a.similarity);
  return proposals.slice(0, perUserCap);
}

/** Cosine similarity between two equal-length numeric vectors. */
export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

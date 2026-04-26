/**
 * Offers REST helpers.
 *
 * Typed Supabase REST surface for the `offers` table shipped in migration
 * 0020 (R10.1). The Parlor's door-materialization gate, pin-stack comp chart,
 * and CFO quip selector all read through these helpers; the Ring-the-Bell
 * offer-intake flow writes through `insertOffer`.
 *
 * Shape note: this module differs from the older `*-rest.ts` family —
 * functions take an injected `SupabaseClient` as their first arg and throw
 * on error. That's intentional: R10.4+ unit tests mock the client directly
 * and rely on throw-on-error semantics for their error-path assertions.
 *
 * Schema definition: src/db/schema.ts → offers.
 * Migration: src/db/migrations/0020_r10_negotiation_parlor.sql.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type OfferRow = {
  id: string;
  user_id: string;
  application_id: string | null;
  company_name: string;
  role: string;
  level: string | null;
  location: string;
  base: number;
  bonus: number;
  equity: number;
  sign_on: number;
  housing: number;
  start_date: string | null;
  benefits: Record<string, unknown>;
  received_at: string;
  deadline_at: string | null;
  status:
    | "received"
    | "negotiating"
    | "accepted"
    | "declined"
    | "expired"
    | "withdrawn";
  created_at: string;
  updated_at: string;
};

export interface InsertOfferInput {
  userId: string;
  applicationId?: string | null;
  companyName: string;
  role: string;
  level?: string | null;
  location: string;
  base: number;
  bonus?: number;
  equity?: number;
  signOn?: number;
  housing?: number;
  startDate?: string | null;
  benefits?: Record<string, unknown>;
  deadlineAt?: string | null;
}

/**
 * Normalize a company name into the cache key shape used by comp-band lookups.
 * Lowercased, trimmed, whitespace-collapsed, common corporate suffixes stripped.
 *
 * "Acme, Inc." → "acme"; "Meta Platforms Inc" → "meta platforms".
 */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,.]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+(inc|corp|corporation|llc|ltd|limited|holdings|co)$/i, "")
    .trim();
}

export async function countOffersForUser(
  client: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await client
    .from("offers")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(`countOffersForUser: ${error.message}`);
  return count ?? 0;
}

export async function getOffersForUser(
  client: SupabaseClient,
  userId: string,
  opts: { limit?: number } = {},
): Promise<OfferRow[]> {
  const base = client
    .from("offers")
    .select("*")
    .eq("user_id", userId)
    .order("received_at", { ascending: false });
  const final = opts.limit ? base.limit(opts.limit) : base;
  const { data, error } = await final;
  if (error) throw new Error(`getOffersForUser: ${error.message}`);
  return (data ?? []) as OfferRow[];
}

export async function getOfferById(
  client: SupabaseClient,
  userId: string,
  offerId: string,
): Promise<OfferRow | null> {
  const { data, error } = await client
    .from("offers")
    .select("*")
    .eq("user_id", userId)
    .eq("id", offerId)
    .maybeSingle();
  if (error) throw new Error(`getOfferById: ${error.message}`);
  return (data as OfferRow | null) ?? null;
}

export async function insertOffer(
  client: SupabaseClient,
  input: InsertOfferInput,
): Promise<OfferRow> {
  const row = {
    user_id: input.userId,
    application_id: input.applicationId ?? null,
    company_name: input.companyName,
    role: input.role,
    level: input.level ?? null,
    location: input.location,
    base: input.base,
    bonus: input.bonus ?? 0,
    equity: input.equity ?? 0,
    sign_on: input.signOn ?? 0,
    housing: input.housing ?? 0,
    start_date: input.startDate ?? null,
    benefits: input.benefits ?? {},
    deadline_at: input.deadlineAt ?? null,
  };
  const { data, error } = await client
    .from("offers")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(`insertOffer: ${error.message}`);
  return data as OfferRow;
}

export async function updateOfferStatus(
  client: SupabaseClient,
  userId: string,
  offerId: string,
  status: OfferRow["status"],
): Promise<void> {
  const { error } = await client
    .from("offers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", offerId);
  if (error) throw new Error(`updateOfferStatus: ${error.message}`);
}

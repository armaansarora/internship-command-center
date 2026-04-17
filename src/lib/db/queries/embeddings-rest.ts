/**
 * Embeddings queries using Supabase REST client + AI SDK.
 * Vercel-compatible — uses Supabase REST for storage, AI SDK for embedding generation.
 *
 * Handles:
 * - Company research embedding (for CIO similarity search)
 * - Job description embedding (for application matching)
 * - Vector similarity search via Supabase RPC
 */

import { createClient } from "@/lib/supabase/server";
import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const EMBEDDING_MODEL = openai.embedding("text-embedding-3-small");
const SIMILARITY_THRESHOLD = 0.7;
const DEFAULT_MATCH_COUNT = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompanyEmbeddingRow {
  id: string;
  user_id: string;
  company_id: string;
  content: string | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface JobEmbeddingRow {
  id: string;
  user_id: string;
  application_id: string;
  content: string | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface SimilarityResult {
  id: string;
  content: string;
  similarity: number;
}

export interface SimilarCompanyResult extends SimilarityResult {
  companyId: string;
  companyName: string;
}

export interface SimilarJobResult extends SimilarityResult {
  applicationId: string;
  role: string;
  companyName: string;
}

// ---------------------------------------------------------------------------
// Embedding generation
// ---------------------------------------------------------------------------

/**
 * Generate a single embedding vector for a text string.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  });
  return embedding;
}

/**
 * Generate embeddings for multiple text strings in batch.
 */
async function generateEmbeddings(
  texts: string[]
): Promise<Array<{ text: string; embedding: number[] }>> {
  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: texts,
  });
  return texts.map((text, i) => ({ text, embedding: embeddings[i] }));
}

// ---------------------------------------------------------------------------
// Company embeddings
// ---------------------------------------------------------------------------

/**
 * Build a text representation of company data for embedding.
 */
function buildCompanyEmbeddingText(company: {
  name: string;
  sector?: string | null;
  industry?: string | null;
  description?: string | null;
  cultureSummary?: string | null;
  recentNews?: string | null;
  internshipIntel?: string | null;
}): string {
  const parts: string[] = [`Company: ${company.name}`];
  if (company.sector) parts.push(`Sector: ${company.sector}`);
  if (company.industry) parts.push(`Industry: ${company.industry}`);
  if (company.description) parts.push(`Overview: ${company.description}`);
  if (company.cultureSummary) parts.push(`Culture: ${company.cultureSummary}`);
  if (company.recentNews) parts.push(`Recent News: ${company.recentNews}`);
  if (company.internshipIntel)
    parts.push(`Internship Intel: ${company.internshipIntel}`);
  return parts.join("\n");
}

/**
 * Upsert a company embedding. If one already exists for this company, replace it.
 */
export async function upsertCompanyEmbedding(
  userId: string,
  companyId: string,
  companyData: {
    name: string;
    sector?: string | null;
    industry?: string | null;
    description?: string | null;
    cultureSummary?: string | null;
    recentNews?: string | null;
    internshipIntel?: string | null;
  }
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const content = buildCompanyEmbeddingText(companyData);

  let embedding: number[];
  try {
    embedding = await generateEmbedding(content);
  } catch {
    return {
      success: false,
      message:
        "Failed to generate embedding. Ensure OPENAI_API_KEY is configured.",
    };
  }

  // Delete existing embedding for this company (upsert pattern)
  await supabase
    .from("company_embeddings")
    .delete()
    .eq("user_id", userId)
    .eq("company_id", companyId);

  // Pass the native number[] directly. PostgREST serializes it to a JSON
  // array, which pgvector parses natively for `vector(1536)` columns.
  // Avoid JSON.stringify here — it would double-encode and prevent reads from
  // returning a typed array.
  const { error } = await supabase.from("company_embeddings").insert({
    user_id: userId,
    company_id: companyId,
    content,
    embedding,
  });

  if (error) {
    return { success: false, message: `Insert failed: ${error.message}` };
  }

  return {
    success: true,
    message: `Embedding generated for ${companyData.name} (${content.length} chars).`,
  };
}

/**
 * Find companies similar to a query string using vector similarity.
 * Uses Supabase RPC function `match_company_embeddings`.
 */
export async function findSimilarCompanies(
  userId: string,
  query: string,
  matchCount: number = DEFAULT_MATCH_COUNT,
  threshold: number = SIMILARITY_THRESHOLD
): Promise<SimilarCompanyResult[]> {
  const supabase = await createClient();

  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(query);
  } catch {
    return [];
  }

  // pgvector accepts a JSON array — pass the native number[] and let
  // PostgREST handle the encoding.
  const { data, error } = await supabase.rpc("match_company_embeddings", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    match_threshold: threshold,
    p_user_id: userId,
  });

  if (error || !data) return [];

  return (data as Array<{
    id: string;
    company_id: string;
    content: string;
    similarity: number;
    company_name: string;
  }>).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    content: row.content,
    similarity: row.similarity,
  }));
}

// ---------------------------------------------------------------------------
// Job description embeddings
// ---------------------------------------------------------------------------

/**
 * Build a text representation of a job for embedding.
 */
function buildJobEmbeddingText(job: {
  role: string;
  companyName?: string | null;
  sector?: string | null;
  location?: string | null;
  notes?: string | null;
}): string {
  const parts: string[] = [`Role: ${job.role}`];
  if (job.companyName) parts.push(`Company: ${job.companyName}`);
  if (job.sector) parts.push(`Sector: ${job.sector}`);
  if (job.location) parts.push(`Location: ${job.location}`);
  if (job.notes) parts.push(`Details: ${job.notes}`);
  return parts.join("\n");
}

/**
 * Upsert a job embedding for an application.
 */
export async function upsertJobEmbedding(
  userId: string,
  applicationId: string,
  jobData: {
    role: string;
    companyName?: string | null;
    sector?: string | null;
    location?: string | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const content = buildJobEmbeddingText(jobData);

  let embedding: number[];
  try {
    embedding = await generateEmbedding(content);
  } catch {
    return {
      success: false,
      message:
        "Failed to generate embedding. Ensure OPENAI_API_KEY is configured.",
    };
  }

  // Delete existing embedding for this application
  await supabase
    .from("job_embeddings")
    .delete()
    .eq("user_id", userId)
    .eq("application_id", applicationId);

  // Pass the native number[] directly — pgvector parses it as a vector(1536).
  const { error } = await supabase.from("job_embeddings").insert({
    user_id: userId,
    application_id: applicationId,
    content,
    embedding,
  });

  if (error) {
    return { success: false, message: `Insert failed: ${error.message}` };
  }

  return {
    success: true,
    message: `Job embedding generated for ${jobData.role} (${content.length} chars).`,
  };
}

/**
 * Find jobs similar to a query using vector similarity.
 * Uses Supabase RPC function `match_job_embeddings`.
 */
export async function findSimilarJobs(
  userId: string,
  query: string,
  matchCount: number = DEFAULT_MATCH_COUNT,
  threshold: number = SIMILARITY_THRESHOLD
): Promise<SimilarJobResult[]> {
  const supabase = await createClient();

  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(query);
  } catch {
    return [];
  }

  const { data, error } = await supabase.rpc("match_job_embeddings", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    match_threshold: threshold,
    p_user_id: userId,
  });

  if (error || !data) return [];

  return (data as Array<{
    id: string;
    application_id: string;
    content: string;
    similarity: number;
    role: string;
    company_name: string;
  }>).map((row) => ({
    id: row.id,
    applicationId: row.application_id,
    role: row.role,
    companyName: row.company_name,
    content: row.content,
    similarity: row.similarity,
  }));
}

// ---------------------------------------------------------------------------
// Batch operations
// ---------------------------------------------------------------------------

/**
 * Re-embed all companies for a user. Useful after bulk research updates.
 */
export async function reembedAllCompanies(
  userId: string
): Promise<{ success: boolean; count: number; message: string }> {
  const supabase = await createClient();

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, sector, industry, description, culture_summary, recent_news, internship_intel")
    .eq("user_id", userId);

  if (error || !companies || companies.length === 0) {
    return { success: false, count: 0, message: "No companies found to embed." };
  }

  const texts = companies.map((c) =>
    buildCompanyEmbeddingText({
      name: c.name as string,
      sector: c.sector as string | null,
      industry: c.industry as string | null,
      description: c.description as string | null,
      cultureSummary: c.culture_summary as string | null,
      recentNews: c.recent_news as string | null,
      internshipIntel: c.internship_intel as string | null,
    })
  );

  let embeddings: Array<{ text: string; embedding: number[] }>;
  try {
    embeddings = await generateEmbeddings(texts);
  } catch {
    return {
      success: false,
      count: 0,
      message: "Failed to generate embeddings in batch.",
    };
  }

  // Clear existing embeddings
  await supabase
    .from("company_embeddings")
    .delete()
    .eq("user_id", userId);

  // Insert all at once. Pass native number[] embeddings — pgvector parses
  // them as vector(1536). Avoid JSON.stringify (would double-encode).
  const rows = companies.map((c, i) => ({
    user_id: userId,
    company_id: c.id as string,
    content: embeddings[i].text,
    embedding: embeddings[i].embedding,
  }));

  const { error: insertError } = await supabase
    .from("company_embeddings")
    .insert(rows);

  if (insertError) {
    return {
      success: false,
      count: 0,
      message: `Batch insert failed: ${insertError.message}`,
    };
  }

  return {
    success: true,
    count: companies.length,
    message: `Embedded ${companies.length} companies.`,
  };
}

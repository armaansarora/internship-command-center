"use client";

import { useState, useMemo, useCallback } from "react";
import type { Company } from "@/db/schema";
import { cn } from "@/lib/utils";
import { Search, Building2, Zap, Loader2 } from "lucide-react";

const tierLabels: Record<number, { label: string; className: string }> = {
  1: {
    label: "T1",
    className:
      "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
  },
  2: {
    label: "T2",
    className:
      "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30",
  },
  3: {
    label: "T3",
    className:
      "bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/30",
  },
  4: {
    label: "T4",
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  },
};

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

interface CompanyListProps {
  companies: Company[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CompanyList({ companies, selectedId, onSelect }: CompanyListProps) {
  const [search, setSearch] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);

  const selectedCompany = companies.find((c) => c.id === selectedId);

  const handleDeepDive = useCallback(async () => {
    if (!selectedCompany || isDispatching) return;
    setIsDispatching(true);
    try {
      const res = await fetch("/api/agents/bell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Run a deep dive research report on ${selectedCompany.name}${selectedCompany.domain ? ` (${selectedCompany.domain})` : ""}. Focus on company culture, recent news, key people, financial health, and internship/hiring intel.`,
          trigger: "manual",
          priority: "normal",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Deep dive dispatch failed:", err);
      }
    } catch (err) {
      console.error("Deep dive dispatch error:", err);
    } finally {
      setIsDispatching(false);
    }
  }, [selectedCompany, isDispatching]);

  const filtered = useMemo(() => {
    if (!search.trim()) return companies;
    const q = search.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.industry ?? "").toLowerCase().includes(q)
    );
  }, [companies, search]);

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="p-4 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-white/5 border border-white/10 py-2 pl-9 pr-3 text-sm text-ivory placeholder:text-slate focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-colors"
          />
        </div>
        <p className="mt-2 text-xs text-slate">
          {filtered.length} of {companies.length} companies
        </p>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-8 w-8 text-slate/40 mb-2" />
            <p className="text-sm text-slate">No companies found</p>
          </div>
        ) : (
          filtered.map((company) => {
            const isActive = company.id === selectedId;
            const tierInfo = company.tier ? tierLabels[company.tier] : null;

            return (
              <button
                key={company.id}
                onClick={() => onSelect(company.id)}
                className={cn(
                  "w-full text-left rounded-lg px-3 py-3 transition-all duration-200 group",
                  isActive
                    ? "bg-gold/10 border border-gold/30 shadow-[0_0_20px_rgba(201,168,76,0.08)]"
                    : "bg-transparent border border-transparent hover:bg-white/5 hover:border-white/10"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3
                      className={cn(
                        "font-heading text-sm font-medium truncate",
                        isActive ? "text-gold" : "text-ivory group-hover:text-ivory"
                      )}
                    >
                      {company.name}
                    </h3>
                    <p className="text-xs text-slate mt-0.5 truncate">
                      {company.industry ?? "No industry"}
                    </p>
                  </div>
                  {tierInfo && (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium shrink-0",
                        tierInfo.className
                      )}
                    >
                      {tierInfo.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-slate font-data">
                    Researched: {formatRelativeDate(company.updatedAt)}
                  </span>
                  {company.researchFreshness && (
                    <span
                      className={cn(
                        "text-[10px] font-data px-1.5 py-0.5 rounded",
                        company.researchFreshness === "fresh"
                          ? "bg-emerald/10 text-emerald"
                          : company.researchFreshness === "stale"
                            ? "bg-amber/10 text-amber"
                            : "bg-ruby/10 text-ruby"
                      )}
                    >
                      {company.researchFreshness}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Deep Dive Button */}
      <div className="p-4 border-t border-white/10">
        <button
          disabled={!selectedCompany || isDispatching}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors duration-200",
            selectedCompany && !isDispatching
              ? "bg-gold/10 border-gold/30 text-gold hover:bg-gold/20"
              : "bg-white/5 border-white/10 text-slate cursor-not-allowed"
          )}
          onClick={handleDeepDive}
        >
          {isDispatching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {isDispatching
            ? "Dispatching..."
            : selectedCompany
              ? `Deep Dive: ${selectedCompany.name}`
              : "Select a company first"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import type { Company } from "@/db/schema";
import { getCompanyById } from "@/lib/research-queries";
import { CompanyList } from "./company-list";
import { CompanyProfile } from "./company-profile";

interface ResearchLayoutProps {
  initialCompanies: Company[];
}

export function ResearchLayout({ initialCompanies }: ResearchLayoutProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = useCallback(async (id: string) => {
    setSelectedId(id);
    setLoading(true);
    try {
      const company = await getCompanyById(id);
      setSelectedCompany(company);
    } catch {
      setSelectedCompany(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="flex h-full gap-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      {/* Left Panel — Company List */}
      <div className="w-[30%] min-w-[280px] max-w-[380px] border-r border-white/10 bg-white/[0.01]">
        <CompanyList
          companies={initialCompanies}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </div>

      {/* Right Panel — Company Profile */}
      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
              <p className="text-sm text-slate">Loading company data...</p>
            </div>
          </div>
        ) : (
          <CompanyProfile company={selectedCompany} />
        )}
      </div>
    </div>
  );
}

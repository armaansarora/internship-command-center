"use client";

import type { Company } from "@/db/schema";
import { cn } from "@/lib/utils";
import {
  Globe,
  Users,
  MapPin,
  Briefcase,
  ExternalLink,
  Building2,
  Newspaper,
  DollarSign,
  UserCircle,
  BookOpen,
} from "lucide-react";

const sizeLabels: Record<string, string> = {
  startup: "Startup (<50)",
  mid: "Mid-size (50-500)",
  large: "Large (500-5K)",
  enterprise: "Enterprise (5K+)",
};

interface KeyPerson {
  name: string;
  title?: string;
  linkedin?: string;
}

function GlassCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/10 p-5",
        "shadow-[0_4px_16px_rgba(0,0,0,0.3)]",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-gold" />
        <h3 className="font-heading text-sm font-semibold text-ivory tracking-wide">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function LinkPill({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-parchment hover:bg-white/10 hover:border-white/20 transition-colors"
    >
      <Icon className="h-3 w-3" />
      {label}
      <ExternalLink className="h-2.5 w-2.5 text-slate" />
    </a>
  );
}

interface CompanyProfileProps {
  company: Company | null;
}

export function CompanyProfile({ company }: CompanyProfileProps) {
  if (!company) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center px-8">
        <div className="h-20 w-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <Building2 className="h-10 w-10 text-slate/30" />
        </div>
        <h2 className="font-heading text-lg font-semibold text-ivory mb-1">
          Select a Company
        </h2>
        <p className="text-sm text-slate max-w-xs">
          Choose a company from the list to view its research profile, key
          people, and market context.
        </p>
      </div>
    );
  }

  const keyPeople: KeyPerson[] = Array.isArray(company.keyPeople)
    ? (company.keyPeople as KeyPerson[])
    : [];

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ivory tracking-wide">
              {company.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {company.industry && (
                <span className="inline-flex items-center gap-1 text-xs text-parchment">
                  <Briefcase className="h-3 w-3" />
                  {company.industry}
                </span>
              )}
              {company.size && (
                <span className="inline-flex items-center gap-1 text-xs text-parchment">
                  <Users className="h-3 w-3" />
                  {sizeLabels[company.size] ?? company.size}
                </span>
              )}
              {company.headquarters && (
                <span className="inline-flex items-center gap-1 text-xs text-parchment">
                  <MapPin className="h-3 w-3" />
                  {company.headquarters}
                </span>
              )}
            </div>
          </div>

          {company.tier && (
            <span
              className={cn(
                "inline-flex items-center rounded-lg border px-3 py-1 text-sm font-data font-medium",
                company.tier === 1
                  ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30"
                  : company.tier === 2
                    ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30"
                    : company.tier === 3
                      ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/30"
                      : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
              )}
            >
              Tier {company.tier}
            </span>
          )}
        </div>

        {/* External Links */}
        <div className="flex flex-wrap gap-2 mt-4">
          {company.domain && (
            <LinkPill
              href={
                company.domain.startsWith("http")
                  ? company.domain
                  : `https://${company.domain}`
              }
              label="Website"
              icon={Globe}
            />
          )}
          {company.careersUrl && (
            <LinkPill href={company.careersUrl} label="Careers" icon={Briefcase} />
          )}
          {company.linkedinUrl && (
            <LinkPill href={company.linkedinUrl} label="LinkedIn" icon={Users} />
          )}
          {company.glassdoorUrl && (
            <LinkPill href={company.glassdoorUrl} label="Glassdoor" icon={Building2} />
          )}
        </div>
      </div>

      {/* Content Sections */}
      <div className="px-6 py-5 space-y-5">
        {/* Overview */}
        <GlassCard title="Overview" icon={BookOpen}>
          {company.description ? (
            <p className="text-sm text-parchment/90 leading-relaxed">
              {company.description}
            </p>
          ) : (
            <p className="text-sm text-slate italic">
              No overview available. Request a deep dive to generate one.
            </p>
          )}
          {company.cultureSummary && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-xs font-medium text-gold/80 mb-1">Culture</p>
              <p className="text-sm text-parchment/80 leading-relaxed">
                {company.cultureSummary}
              </p>
            </div>
          )}
        </GlassCard>

        {/* Key People */}
        <GlassCard title="Key People" icon={UserCircle}>
          {keyPeople.length > 0 ? (
            <div className="space-y-3">
              {keyPeople.map((person, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-ivory">{person.name}</p>
                    {person.title && (
                      <p className="text-xs text-slate mt-0.5">{person.title}</p>
                    )}
                  </div>
                  {person.linkedin && (
                    <a
                      href={person.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sapphire hover:text-sapphire/80 transition-colors"
                    >
                      LinkedIn
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate italic">
              No key people recorded yet.
            </p>
          )}
        </GlassCard>

        {/* Recent News */}
        <GlassCard title="Recent News" icon={Newspaper}>
          {company.recentNews ? (
            <p className="text-sm text-parchment/90 leading-relaxed whitespace-pre-line">
              {company.recentNews}
            </p>
          ) : (
            <p className="text-sm text-slate italic">
              No recent news available.
            </p>
          )}
        </GlassCard>

        {/* Market Context */}
        <GlassCard title="Market Context" icon={DollarSign}>
          {company.financialsSummary ? (
            <p className="text-sm text-parchment/90 leading-relaxed whitespace-pre-line">
              {company.financialsSummary}
            </p>
          ) : (
            <p className="text-sm text-slate italic">
              No financial data available.
            </p>
          )}
          {company.sector && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <span className="text-xs text-slate">Sector: </span>
              <span className="text-xs font-data text-parchment">
                {company.sector}
              </span>
            </div>
          )}
        </GlassCard>

        {/* Internship Intel */}
        {company.internshipIntel && (
          <GlassCard title="Internship Intelligence" icon={Briefcase}>
            <p className="text-sm text-parchment/90 leading-relaxed whitespace-pre-line">
              {company.internshipIntel}
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

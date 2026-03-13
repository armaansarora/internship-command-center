// @ts-nocheck
'use client';

import type { ContactWithWarmth } from '@/lib/contacts';
import { WarmthBadge } from '@/components/contacts/warmth-badge';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, User, Users } from 'lucide-react';
import Link from 'next/link';

const WARMTH_BORDER: Record<string, string> = {
  hot: 'border-l-emerald-500',
  warm: 'border-l-amber-500',
  cold: 'border-l-zinc-500',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  recruiter: 'Recruiter',
  referral: 'Referral',
  alumni: 'Alumni',
  cold_contact: 'Cold Contact',
};

interface CompanyContactsProps {
  contacts: ContactWithWarmth[];
}

export function CompanyContacts({ contacts }: CompanyContactsProps) {
  if (contacts.length === 0) {
    return (
      <div className="text-sm text-muted-foreground space-y-2">
        <p className="italic">No contacts at this company yet</p>
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1.5 text-blue-400 hover:underline transition-colors duration-150 text-xs"
        >
          <Users className="h-3.5 w-3.5" />
          Add a contact
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          className={`border-l-2 ${WARMTH_BORDER[contact.warmth.level]} pl-3 py-2 space-y-1.5`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">{contact.name}</span>
            <WarmthBadge level={contact.warmth.level} />
            {contact.relationshipType && (
              <Badge
                variant="outline"
                className="text-xs text-muted-foreground"
              >
                {RELATIONSHIP_LABELS[contact.relationshipType] ||
                  contact.relationshipType}
              </Badge>
            )}
          </div>

          {contact.role && (
            <p className="text-xs text-muted-foreground ml-5.5">
              {contact.role}
            </p>
          )}

          <div className="flex items-center gap-4 ml-5.5">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline transition-colors duration-150"
              >
                <Mail className="h-3 w-3" />
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                {contact.phone}
              </span>
            )}
          </div>

          {contact.introducedBy && (
            <p className="text-xs text-muted-foreground ml-5.5">
              Referred by contact #{contact.introducedBy}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

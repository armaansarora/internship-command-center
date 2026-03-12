import { Mail, User, Briefcase } from 'lucide-react';

interface ContactInfoProps {
  contactName: string | null;
  contactEmail: string | null;
  contactRole: string | null;
}

export function ContactInfo({
  contactName,
  contactEmail,
  contactRole,
}: ContactInfoProps) {
  if (!contactName && !contactEmail && !contactRole) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No contact info added
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {contactName && (
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{contactName}</span>
        </div>
      )}
      {contactRole && (
        <div className="flex items-center gap-2 text-sm">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{contactRole}</span>
        </div>
      )}
      {contactEmail && (
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <a
            href={`mailto:${contactEmail}`}
            className="text-blue-400 hover:underline transition-colors duration-150"
          >
            {contactEmail}
          </a>
        </div>
      )}
    </div>
  );
}

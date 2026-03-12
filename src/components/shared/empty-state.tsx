import type { LucideIcon } from 'lucide-react';
import type React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
  /** Optional variant for contextual SVG illustration */
  variant?: 'applications' | 'follow-ups' | 'cover-letters' | 'contacts' | 'generic';
}

function IllustrationApplications() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-[fadeFloat_3s_ease-in-out_infinite]" aria-hidden="true">
      {/* Abstract list/grid with plus */}
      <rect x="20" y="15" width="80" height="12" rx="3" className="fill-primary/10" />
      <rect x="20" y="33" width="80" height="12" rx="3" className="fill-primary/8" />
      <rect x="20" y="51" width="80" height="12" rx="3" className="fill-primary/5" />
      <circle cx="95" cy="65" r="10" className="fill-primary/15" />
      <line x1="91" y1="65" x2="99" y2="65" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
      <line x1="95" y1="61" x2="95" y2="69" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IllustrationFollowUps() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-[fadeFloat_3s_ease-in-out_infinite]" aria-hidden="true">
      {/* Checkmark circle - all done */}
      <circle cx="60" cy="40" r="28" className="fill-primary/8" />
      <circle cx="60" cy="40" r="20" className="fill-primary/12" />
      <path d="M50 40 L57 47 L70 34" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Decorative dots */}
      <circle cx="25" cy="20" r="3" className="fill-primary/10" />
      <circle cx="95" cy="60" r="4" className="fill-primary/10" />
      <circle cx="90" cy="18" r="2" className="fill-primary/8" />
    </svg>
  );
}

function IllustrationCoverLetters() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-[fadeFloat_3s_ease-in-out_infinite]" aria-hidden="true">
      {/* Document shape */}
      <rect x="35" y="8" width="50" height="64" rx="4" className="fill-primary/8" />
      <rect x="35" y="8" width="50" height="64" rx="4" className="stroke-primary/20" strokeWidth="1.5" />
      {/* Lines */}
      <line x1="43" y1="24" x2="77" y2="24" className="stroke-primary/15" strokeWidth="2" strokeLinecap="round" />
      <line x1="43" y1="32" x2="72" y2="32" className="stroke-primary/12" strokeWidth="2" strokeLinecap="round" />
      <line x1="43" y1="40" x2="75" y2="40" className="stroke-primary/10" strokeWidth="2" strokeLinecap="round" />
      <line x1="43" y1="48" x2="68" y2="48" className="stroke-primary/8" strokeWidth="2" strokeLinecap="round" />
      {/* Sparkle */}
      <circle cx="82" cy="14" r="6" className="fill-primary/15" />
      <path d="M82 9 L82 19 M77 14 L87 14" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IllustrationContacts() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-[fadeFloat_3s_ease-in-out_infinite]" aria-hidden="true">
      {/* People silhouettes */}
      <circle cx="40" cy="30" r="10" className="fill-primary/10" />
      <circle cx="40" cy="30" r="6" className="fill-primary/15" />
      <ellipse cx="40" cy="52" rx="14" ry="8" className="fill-primary/10" />
      {/* Second person */}
      <circle cx="75" cy="28" r="9" className="fill-primary/8" />
      <circle cx="75" cy="28" r="5.5" className="fill-primary/12" />
      <ellipse cx="75" cy="48" rx="12" ry="7" className="fill-primary/8" />
      {/* Connection line */}
      <line x1="52" y1="38" x2="64" y2="36" className="stroke-primary/20" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* Decorative dots */}
      <circle cx="20" cy="55" r="2.5" className="fill-primary/8" />
      <circle cx="100" cy="20" r="3" className="fill-primary/10" />
    </svg>
  );
}

function IllustrationGeneric() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-[fadeFloat_3s_ease-in-out_infinite]" aria-hidden="true">
      {/* Abstract decorative shapes */}
      <circle cx="45" cy="35" r="18" className="fill-primary/8" />
      <circle cx="72" cy="42" r="14" className="fill-primary/10" />
      <circle cx="58" cy="25" r="8" className="fill-primary/12" />
      {/* Small accent dots */}
      <circle cx="25" cy="55" r="3" className="fill-primary/8" />
      <circle cx="95" cy="25" r="4" className="fill-primary/10" />
      <circle cx="88" cy="58" r="2.5" className="fill-primary/6" />
    </svg>
  );
}

const illustrations: Record<NonNullable<EmptyStateProps['variant']>, () => React.JSX.Element> = {
  applications: IllustrationApplications,
  'follow-ups': IllustrationFollowUps,
  'cover-letters': IllustrationCoverLetters,
  contacts: IllustrationContacts,
  generic: IllustrationGeneric,
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'generic',
}: EmptyStateProps) {
  const Illustration = illustrations[variant];

  return (
    <div className="relative flex flex-col items-center justify-center py-16 text-center overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-primary/5 blur-2xl" />

      {/* SVG illustration */}
      <div className="mb-4">
        <Illustration />
      </div>

      {/* Icon badge */}
      <div className="relative rounded-full bg-primary/10 p-4 mb-4 ring-1 ring-primary/10">
        <Icon className="h-8 w-8 text-primary/60" />
      </div>

      <h3 className="relative text-lg font-medium text-foreground mb-1">{title}</h3>
      <p className="relative text-sm text-muted-foreground max-w-sm mb-4">
        {description}
      </p>
      {action && (
        <Button size="sm" asChild className="relative">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}

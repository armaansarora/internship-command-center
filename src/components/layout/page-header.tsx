import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden gradient-header border-b border-border">
      {/* Decorative background shapes */}
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
      <div className="absolute top-1/2 right-1/4 h-24 w-24 rounded-full bg-primary/3 blur-xl" />

      <div className="relative flex items-center justify-between px-4 py-6 md:px-6 md:py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-2">{children}</div>
        )}
      </div>
    </div>
  );
}

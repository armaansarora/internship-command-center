'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { LayoutDashboard, Briefcase, FileText, Bell, Search } from 'lucide-react';
import { getApplicationsForAutocomplete } from '@/lib/cover-letter-actions';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState<{ id: number; company: string; role: string }[]>([]);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open && apps.length === 0) {
      getApplicationsForAutocomplete().then(setApps);
    }
  }, [open, apps.length]);

  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search applications, navigate..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate('/')}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Overview
          </CommandItem>
          <CommandItem onSelect={() => navigate('/applications')}>
            <Briefcase className="mr-2 h-4 w-4" />
            Applications
          </CommandItem>
          <CommandItem onSelect={() => navigate('/cover-letters')}>
            <FileText className="mr-2 h-4 w-4" />
            Cover Letter Lab
          </CommandItem>
          <CommandItem onSelect={() => navigate('/follow-ups')}>
            <Bell className="mr-2 h-4 w-4" />
            Follow-Ups
          </CommandItem>
        </CommandGroup>
        {apps.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Applications">
              {apps.map((app) => (
                <CommandItem
                  key={app.id}
                  onSelect={() => navigate(`/applications/${app.id}`)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  {app.company} - {app.role}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

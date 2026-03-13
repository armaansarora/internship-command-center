// @ts-nocheck
'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search companies or roles..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 bg-background border-border"
      />
    </div>
  );
}

// @ts-nocheck
'use client';

import { AnimatedList, AnimatedItem } from '@/components/shared/animated-list';
import { FollowUpCard } from '@/components/follow-ups/follow-up-card';
import type { FollowUpWithApp } from '@/lib/follow-ups';

interface FollowUpListProps {
  items: FollowUpWithApp[];
}

export function FollowUpList({ items }: FollowUpListProps) {
  return (
    <AnimatedList className="space-y-3">
      {items.map((item) => (
        <AnimatedItem key={item.followUp.id}>
          <FollowUpCard data={item} />
        </AnimatedItem>
      ))}
    </AnimatedList>
  );
}

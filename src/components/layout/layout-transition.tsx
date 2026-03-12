'use client';

import { useSelectedLayoutSegment } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function LayoutTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const segment = useSelectedLayoutSegment();
  const prevSegment = useRef(segment);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prevSegment.current !== segment && containerRef.current) {
      prevSegment.current = segment;
      const el = containerRef.current;
      // Remove any existing transition so the reset is instant
      el.style.transition = 'none';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      // Force reflow, then animate in
      void el.offsetHeight;
      el.style.transition = 'opacity 0.15s ease-in-out, transform 0.15s ease-in-out';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }
  }, [segment]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

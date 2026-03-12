'use client';

import { motion, useMotionValue, useTransform, useAnimation } from 'motion/react';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = 'Dismiss',
  rightLabel = 'Complete',
}: SwipeableCardProps) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);
  const controls = useAnimation();

  async function handleDragEnd(
    _: unknown,
    info: { offset: { x: number } },
  ) {
    if (info.offset.x < -80 && onSwipeLeft) {
      await controls.start({ x: -300, opacity: 0, transition: { duration: 0.2 } });
      onSwipeLeft();
    } else if (info.offset.x > 80 && onSwipeRight) {
      await controls.start({ x: 300, opacity: 0, transition: { duration: 0.2 } });
      onSwipeRight();
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Action labels behind the card */}
      <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
        <span className="text-sm font-medium text-green-400">{rightLabel}</span>
        <span className="text-sm font-medium text-red-400">{leftLabel}</span>
      </div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.1}
        style={{ x, opacity }}
        animate={controls}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}

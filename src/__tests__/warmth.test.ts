import { describe, it, expect } from 'vitest';
import { computeWarmth } from '@/lib/contacts';

describe('computeWarmth', () => {
  it('returns hot with score ~100 for now', () => {
    const result = computeWarmth(new Date());
    expect(result.level).toBe('hot');
    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.daysSince).toBe(0);
  });

  it('returns hot for contact within 7 days', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const result = computeWarmth(fiveDaysAgo);
    expect(result.level).toBe('hot');
    expect(result.score).toBeGreaterThan(50);
  });

  it('returns warm for 15 days ago', () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const result = computeWarmth(fifteenDaysAgo);
    expect(result.level).toBe('warm');
    expect(result.score).toBeLessThan(50);
    expect(result.score).toBeGreaterThan(10);
  });

  it('returns cold for 31 days ago', () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const result = computeWarmth(thirtyOneDaysAgo);
    expect(result.level).toBe('cold');
    expect(result.score).toBeLessThan(15);
  });

  it('returns cold with score 0 for null', () => {
    const result = computeWarmth(null);
    expect(result.level).toBe('cold');
    expect(result.score).toBe(0);
    expect(result.daysSince).toBe(Infinity);
  });

  it('returns warm for exactly 8 days ago', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const result = computeWarmth(eightDaysAgo);
    expect(result.level).toBe('warm');
  });

  it('returns warm for exactly 30 days ago', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = computeWarmth(thirtyDaysAgo);
    expect(result.level).toBe('warm');
  });
});

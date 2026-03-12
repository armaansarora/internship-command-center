// Core palette
export const colors = {
  boardroom: '#1A1A2E',
  charcoal: '#252540',
  navy: '#16213E',
  gold: '#C9A84C',
  ivory: '#F5F0E8',
  parchment: '#D4C5A9',
  slate: '#8B8FA3',
  // Status
  emerald: '#2D8B6F',
  sapphire: '#4A6FA5',
  amber: '#B8860B',
  ruby: '#9B3B3B',
  amethyst: '#7B5EA7',
  pearl: '#C8C8D0',
} as const;

// Tier gradients
export const tierGradients = {
  T1: { from: '#C9A84C', to: '#E8D48B' }, // Gold
  T2: { from: '#9CA3AF', to: '#D1D5DB' }, // Silver
  T3: { from: '#A0785A', to: '#C4A882' }, // Bronze
  T4: { from: '#6B7280', to: '#9CA3AF' }, // Iron
} as const;

// Typography
export const typography = {
  pageTitle: {
    font: 'Playfair Display',
    weight: 700,
    size: '28px',
    tracking: '0.02em',
  },
  sectionHeader: {
    font: 'Playfair Display',
    weight: 600,
    size: '20px',
    tracking: '0.02em',
  },
  cardTitle: {
    font: 'Playfair Display',
    weight: 500,
    size: '16px',
    tracking: '0.02em',
  },
  body: { font: 'Inter', weight: 400, size: '14px', tracking: 'normal' },
  label: { font: 'Inter', weight: 500, size: '13px', tracking: 'normal' },
  tableHeader: {
    font: 'Inter',
    weight: 600,
    size: '12px',
    tracking: '0.08em',
  },
  heroMetric: {
    font: 'JetBrains Mono',
    weight: 500,
    size: '24px',
    tracking: 'normal',
  },
  dataStat: {
    font: 'JetBrains Mono',
    weight: 400,
    size: '13px',
    tracking: 'normal',
  },
} as const;

// Spacing
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
} as const;

// Borders & Shadows
export const borders = {
  radiusSm: '4px',
  radiusMd: '8px',
  radiusLg: '12px',
  radiusFull: '9999px',
} as const;

export const shadows = {
  card: '0 4px 16px rgba(0,0,0,0.3)',
  modal: '0 16px 48px rgba(0,0,0,0.5)',
  glowGold: '0 0 20px rgba(201,168,76,0.15)',
} as const;

// Animation
export const animation = {
  fast: { duration: '150ms', easing: 'ease-out' },
  normal: { duration: '250ms', easing: 'ease-in-out' },
  slow: { duration: '400ms', easing: 'ease-in-out' },
  dramatic: { duration: '800ms', easing: 'cubic-bezier(0.16,1,0.3,1)' },
} as const;

/**
 * MirrorMuse Design System — Tiimo-inspired tokens
 *
 * Calm · Warm · Playful-minimal · Visual-first
 */

/* ── Spacing scale ── */
export const space = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
  screen: 18, // horizontal page padding
} as const;

/* ── Radius ── */
export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
  card: 22,
  button: 16,
  chip: 999,
} as const;

/* ── Typography ── */
export const type = {
  screenTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.4,
  },
  sectionHeader: {
    fontSize: 19,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  small: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  chip: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
} as const;

/* ── Shadows ── */
export const shadow = {
  card: {
    shadowColor: '#8B7E74',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  soft: {
    shadowColor: '#8B7E74',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    shadowColor: '#8B7E74',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
} as const;

/* ── Warm palette ── */
export const palette = {
  /* Base */
  warmWhite: '#FAF8F5',
  warmWhiteDark: '#F3F0EC',
  white: '#FFFFFF',

  /* Text */
  ink: '#2C2825',
  inkLight: '#5C5650',
  inkMuted: '#9A928A',
  inkFaint: '#C4BEB7',

  /* Borders */
  border: '#E8E4DF',
  borderLight: '#F0ECE8',

  /* Primary accent (calm teal-sage) */
  accent: '#5B9A8B',
  accentLight: '#E8F3F0',
  accentDark: '#4A8272',

  /* Secondary (warm amber) */
  secondary: '#D4A574',
  secondaryLight: '#FDF3EA',

  /* Pastel status */
  success: '#7CB87C',
  successLight: '#EDF7ED',
  warning: '#E4B868',
  warningLight: '#FFF8EA',
  error: '#D4636C',
  errorLight: '#FDEDED',
  info: '#6BA3D6',
  infoLight: '#EDF4FB',

  /* Pastels for chips / tags */
  pastelPink: '#F5E0E5',
  pastelBlue: '#DDE9F5',
  pastelGreen: '#DFF0E3',
  pastelYellow: '#FDF3DC',
  pastelLavender: '#E8E0F0',
  pastelPeach: '#FCE8DA',
  pastelMint: '#D8F0EA',
} as const;

/* ── Chip height constant ── */
export const CHIP_HEIGHT = 32;

/* ── Animation constants ── */
export const motion = {
  pressScale: 0.97,
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
} as const;

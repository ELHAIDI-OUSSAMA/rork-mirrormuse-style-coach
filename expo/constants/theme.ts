export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 32,
  xxl: 44,
  screen: 20,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
  card: 16,
  button: 14,
  chip: 999,
} as const;

export const type = {
  screenTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 25,
    letterSpacing: 0.38,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  bodyMedium: {
    fontSize: 17,
    fontWeight: '500' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  chip: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  button: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;

export const palette = {
  warmWhite: '#F2F2F7',
  warmWhiteDark: '#E5E5EA',
  white: '#FFFFFF',

  ink: '#000000',
  inkLight: '#3C3C43',
  inkMuted: '#8E8E93',
  inkFaint: '#C7C7CC',

  border: '#C6C6C8',
  borderLight: '#E5E5EA',

  accent: '#007AFF',
  accentLight: '#E3F0FF',
  accentDark: '#0056CC',

  secondary: '#FF9500',
  secondaryLight: '#FFF4E6',
  secondaryDark: '#CC7700',

  success: '#34C759',
  successLight: '#E8FAE8',
  warning: '#FF9500',
  warningLight: '#FFF4E6',
  error: '#FF3B30',
  errorLight: '#FFE5E5',
  info: '#5AC8FA',
  infoLight: '#E8F7FE',

  pastelPink: '#FFD1DC',
  pastelBlue: '#D1E8FF',
  pastelGreen: '#D1F2D9',
  pastelYellow: '#FFF3CD',
  pastelLavender: '#E8D5F5',
  pastelPeach: '#FFE5D0',
  pastelMint: '#D1F2EA',

  systemGroupedBg: '#F2F2F7',
  secondarySystemGroupedBg: '#FFFFFF',
  tertiarySystemGroupedBg: '#F2F2F7',
  separator: 'rgba(60, 60, 67, 0.12)',
  opaqueSeparator: '#C6C6C8',
} as const;

export const CHIP_HEIGHT = 34;

export const motion = {
  pressScale: 0.97,
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
} as const;

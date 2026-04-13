import { Gender } from '@/types';
import { palette } from './theme';

export const neutralColors = {
  primary: '#007AFF',
  primaryDark: '#0056CC',
  secondary: '#FF9500',
  accent: '#007AFF',

  background: palette.systemGroupedBg,
  backgroundSecondary: palette.warmWhiteDark,
  card: palette.white,

  text: '#000000',
  textSecondary: '#3C3C43',
  textLight: '#8E8E93',
  textInverse: '#FFFFFF',

  border: palette.border,
  borderLight: palette.borderLight,

  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  info: palette.info,

  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow: 'rgba(0, 0, 0, 0.08)',

  chip: {
    selected: '#007AFF',
    unselected: 'rgba(118, 118, 128, 0.12)',
    selectedText: '#FFFFFF',
    unselectedText: '#3C3C43',
  },

  score: {
    excellent: palette.success,
    good: '#30D158',
    okay: palette.warning,
    needsWork: palette.error,
  },
};

export const femaleColors = {
  ...neutralColors,
  primary: '#E8836B',
  primaryDark: '#D06B53',
  secondary: '#7FB685',
  accent: '#E8836B',

  background: '#F7F2EF',
  backgroundSecondary: '#EDE6E1',

  chip: {
    selected: '#E8836B',
    unselected: 'rgba(118, 118, 128, 0.12)',
    selectedText: '#FFFFFF',
    unselectedText: '#3C3C43',
  },

  score: {
    excellent: '#34C759',
    good: '#30D158',
    okay: '#FF9500',
    needsWork: '#E8836B',
  },
};

export const maleColors = {
  ...neutralColors,
  primary: '#4A7C6F',
  primaryDark: '#3A6A5C',
  secondary: '#7A8E90',
  accent: '#4A7C6F',

  background: '#F4F3F1',
  backgroundSecondary: '#E8E7E3',

  chip: {
    selected: '#4A7C6F',
    unselected: 'rgba(118, 118, 128, 0.12)',
    selectedText: '#FFFFFF',
    unselectedText: '#3C3C43',
  },

  score: {
    excellent: '#4A7C6F',
    good: '#34C759',
    okay: '#FF9500',
    needsWork: palette.error,
  },
};

export type ColorTheme = {
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundSecondary: string;
  card: string;
  text: string;
  textSecondary: string;
  textLight: string;
  textInverse: string;
  border: string;
  borderLight: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  overlay: string;
  shadow: string;
  chip: {
    selected: string;
    unselected: string;
    selectedText: string;
    unselectedText: string;
  };
  score: {
    excellent: string;
    good: string;
    okay: string;
    needsWork: string;
  };
};

export function getColorsForGender(gender?: Gender): ColorTheme {
  if (!gender) return neutralColors;
  return gender === 'female' ? femaleColors : maleColors;
}

export const colors = neutralColors;
export default colors;

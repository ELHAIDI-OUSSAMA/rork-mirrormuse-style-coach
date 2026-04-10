import { Gender } from '@/types';
import { palette } from './theme';

export const neutralColors = {
  primary: palette.accent,
  primaryDark: palette.accentDark,
  secondary: palette.secondary,
  accent: palette.accent,

  background: palette.warmWhite,
  backgroundSecondary: palette.warmWhiteDark,
  card: palette.white,

  text: palette.ink,
  textSecondary: palette.inkLight,
  textLight: palette.inkMuted,
  textInverse: '#FFFFFF',

  border: palette.border,
  borderLight: palette.borderLight,

  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  info: palette.info,

  overlay: 'rgba(44, 40, 37, 0.45)',
  shadow: 'rgba(139, 126, 116, 0.08)',

  chip: {
    selected: palette.accent,
    unselected: palette.warmWhiteDark,
    selectedText: '#FFFFFF',
    unselectedText: palette.inkLight,
  },

  score: {
    excellent: palette.success,
    good: '#9AC79A',
    okay: palette.warning,
    needsWork: palette.error,
  },
};

export const femaleColors = {
  ...neutralColors,
  primary: '#C9907D',
  primaryDark: '#B47A68',
  secondary: '#A8B5A2',
  accent: '#C9907D',

  background: '#FBF7F4',
  backgroundSecondary: '#F3EDE8',

  chip: {
    selected: '#C9907D',
    unselected: '#F3EDE8',
    selectedText: '#FFFFFF',
    unselectedText: palette.inkLight,
  },

  score: {
    excellent: '#7CB87C',
    good: '#A8C5A8',
    okay: '#E4B868',
    needsWork: '#C9907D',
  },
};

export const maleColors = {
  ...neutralColors,
  primary: '#5B7A6E',
  primaryDark: '#4A6A5C',
  secondary: '#8B9A9C',
  accent: '#5B7A6E',

  background: '#F8F7F5',
  backgroundSecondary: '#EFEEE9',

  chip: {
    selected: '#5B7A6E',
    unselected: '#EFEEE9',
    selectedText: '#FFFFFF',
    unselectedText: palette.inkLight,
  },

  score: {
    excellent: '#5B7A6E',
    good: '#7CB87C',
    okay: '#E4B868',
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

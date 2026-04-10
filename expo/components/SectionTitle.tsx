import React from 'react';
import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { type as typo, space, palette } from '@/constants/theme';

interface SectionTitleProps {
  children: string;
  style?: StyleProp<TextStyle>;
}

export function SectionTitle({ children, style }: SectionTitleProps) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    ...typo.sectionHeader,
    color: palette.ink,
    marginBottom: space.md,
  },
});

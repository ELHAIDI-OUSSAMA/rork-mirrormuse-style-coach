import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { radius, shadow, space, palette } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: 'none' | 'small' | 'medium' | 'large';
  variant?: 'elevated' | 'flat' | 'outlined' | 'grouped';
}

export function Card({ children, style, padding = 'medium', variant = 'elevated' }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === 'elevated' && shadow.card,
        variant === 'outlined' && styles.outlined,
        variant === 'flat' && styles.flat,
        variant === 'grouped' && styles.grouped,
        styles[padding],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.card,
  },
  outlined: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
  },
  flat: {
    backgroundColor: palette.secondarySystemGroupedBg,
  },
  grouped: {
    backgroundColor: palette.secondarySystemGroupedBg,
    borderRadius: radius.card,
  },
  none: {
    padding: 0,
  },
  small: {
    padding: space.md,
  },
  medium: {
    padding: space.lg,
  },
  large: {
    padding: space.xl,
  },
});

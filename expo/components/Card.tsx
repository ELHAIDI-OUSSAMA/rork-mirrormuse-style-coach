import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { radius, shadow, space, palette } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: 'none' | 'small' | 'medium' | 'large';
  variant?: 'elevated' | 'flat' | 'outlined';
}

export function Card({ children, style, padding = 'medium', variant = 'elevated' }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === 'elevated' && shadow.card,
        variant === 'outlined' && styles.outlined,
        variant === 'flat' && styles.flat,
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
    borderWidth: 1.5,
    borderColor: palette.borderLight,
  },
  flat: {
    backgroundColor: palette.warmWhiteDark,
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

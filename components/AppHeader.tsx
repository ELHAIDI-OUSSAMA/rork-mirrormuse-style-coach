import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { type as typo, space, palette } from '@/constants/theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AppHeader({ title, subtitle, right, style }: AppHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right && <View style={styles.actions}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.screen,
    paddingTop: 10,
    paddingBottom: 6,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    ...typo.screenTitle,
    color: palette.ink,
  },
  subtitle: {
    ...typo.caption,
    color: palette.inkMuted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

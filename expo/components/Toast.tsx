import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { palette, radius, shadow, space, type as typo } from '@/constants/theme';

interface ToastProps {
  visible: boolean;
  message: string;
  tone?: 'info' | 'success' | 'warning';
}

export function Toast({ visible, message, tone = 'info' }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: visible ? 0 : 12,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, visible]);

  const toneStyle =
    tone === 'success'
      ? styles.success
      : tone === 'warning'
        ? styles.warning
        : styles.info;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[styles.toast, toneStyle, { opacity, transform: [{ translateY }] }]}>
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: space.xl,
    alignItems: 'center',
  },
  toast: {
    maxWidth: '88%',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    ...shadow.soft,
  },
  info: {
    backgroundColor: palette.ink,
  },
  success: {
    backgroundColor: palette.accentDark,
  },
  warning: {
    backgroundColor: palette.warning,
  },
  text: {
    ...typo.caption,
    color: palette.white,
    textAlign: 'center',
  },
});


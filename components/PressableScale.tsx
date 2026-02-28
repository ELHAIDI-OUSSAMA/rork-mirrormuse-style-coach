import React from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { withSoftSpring } from '@/lib/motion';

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  activeScale?: number;
  haptic?: boolean;
}

export function PressableScale({
  children,
  onPress,
  disabled = false,
  style,
  activeScale = 0.98,
  haptic = false,
}: PressableScaleProps) {
  const scale = React.useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        disabled={disabled}
        onPressIn={() => {
          if (!disabled) {
            Animated.spring(scale, withSoftSpring(activeScale)).start();
            if (haptic) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }
        }}
        onPressOut={() => {
          Animated.spring(scale, withSoftSpring(1)).start();
        }}
        onPress={onPress}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

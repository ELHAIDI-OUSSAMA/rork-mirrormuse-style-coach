import React, { useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, StyleProp, ViewStyle } from 'react-native';
import { palette, motion } from '@/constants/theme';

interface IconButtonProps {
  onPress: () => void;
  icon: React.ReactNode;
  variant?: 'default' | 'filled';
  fillColor?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function IconButton({
  onPress,
  icon,
  variant = 'default',
  fillColor,
  size = 38,
  style,
  disabled = false,
}: IconButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: motion.pressScale,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor:
              variant === 'filled'
                ? fillColor || palette.accent
                : 'rgba(118, 118, 128, 0.12)',
          },
          disabled && { opacity: 0.4 },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        disabled={disabled}
      >
        {icon}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

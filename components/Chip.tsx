import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { CHIP_HEIGHT, radius, type as typo, motion } from '@/constants/theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  size?: 'small' | 'medium' | 'large';
}

export function Chip({ label, selected, onPress, style, size = 'medium' }: ChipProps) {
  const { themeColors } = useApp();
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

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.chip,
          sizeStyles[size],
          {
            backgroundColor: selected
              ? themeColors.chip.selected
              : themeColors.chip.unselected,
          },
          style,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.label,
            typo.chip,
            {
              color: selected
                ? themeColors.chip.selectedText
                : themeColors.chip.unselectedText,
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const sizeStyles = StyleSheet.create({
  small: {
    height: CHIP_HEIGHT,
    paddingHorizontal: 14,
  },
  medium: {
    height: 38,
    paddingHorizontal: 18,
  },
  large: {
    height: 44,
    paddingHorizontal: 22,
  },
});

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    // typography applied via typo.chip
  },
});

import { AccessibilityInfo, Easing } from 'react-native';
import { useEffect, useState } from 'react';

export const durations = {
  fast: 160,
  normal: 240,
  slow: 420,
  hero: 700,
} as const;

export const easings = {
  outCubic: Easing.bezier(0.22, 1, 0.36, 1) as (value: number) => number,
  outExpo: Easing.bezier(0.16, 1, 0.3, 1) as (value: number) => number,
} as const;

export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

export function withSoftSpring(value: number) {
  return {
    toValue: value,
    tension: 180,
    friction: 16,
    useNativeDriver: true,
  };
}

export function stagger(index: number, base = 40, max = 240) {
  return Math.min(index * base, max);
}

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, type as typo, radius } from '@/constants/theme';

interface ScoreDisplayProps {
  score: number;
  maxScore?: number;
}

export function ScoreDisplay({ score, maxScore = 5 }: ScoreDisplayProps) {
  const pct = score / maxScore;
  const color = pct >= 0.8 ? palette.success
    : pct >= 0.6 ? palette.accent
    : pct >= 0.4 ? palette.warning
    : palette.error;

  const filled = Math.round(score);

  return (
    <View style={s.container}>
      <Text style={s.label}>Fit score</Text>
      <View style={s.dots}>
        {Array.from({ length: maxScore }).map((_, i) => (
          <View
            key={i}
            style={[s.dot, { backgroundColor: i < filled ? color : palette.warmWhiteDark }]}
          />
        ))}
      </View>
      <Text style={[s.value, { color }]}>{score.toFixed(1)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { ...typo.caption, color: palette.inkMuted },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  value: { ...typo.caption, fontWeight: '700' },
});

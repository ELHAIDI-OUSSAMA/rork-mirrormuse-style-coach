import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Card } from './Card';
import { space, radius, palette, type as typo } from '@/constants/theme';

interface SuggestionCardProps {
  title: string;
  icon: React.ReactNode;
  items: string[];
  expandable?: boolean;
  accentColor?: string;
}

export function SuggestionCard({
  title, icon, items, expandable = true, accentColor,
}: SuggestionCardProps) {
  const accent = accentColor || palette.accent;
  const [expanded, setExpanded] = useState(true);

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => expandable && setExpanded(!expanded)}
        activeOpacity={expandable ? 0.7 : 1}
      >
        <View style={[styles.iconWrap, { backgroundColor: accent + '18' }]}>
          {icon}
        </View>
        <Text style={styles.title}>{title}</Text>
        {expandable && (
          expanded
            ? <ChevronUp size={18} color={palette.inkMuted} />
            : <ChevronDown size={18} color={palette.inkMuted} />
        )}
      </TouchableOpacity>
      {expanded && (
        <View style={styles.content}>
          {items.map((item, i) => (
            <View key={i} style={styles.row}>
              <View style={[styles.bullet, { backgroundColor: accent }]} />
              <Text style={styles.text}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.md },
  header: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  title: { ...typo.bodyMedium, fontWeight: '600', color: palette.ink, flex: 1 },
  content: {
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.borderLight,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, marginRight: 12 },
  text: { ...typo.body, fontSize: 14, color: palette.inkLight, flex: 1, lineHeight: 21 },
});

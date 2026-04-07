import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Calendar, Sparkles } from 'lucide-react-native';
import appColors from '@/constants/Colors';
import { LookAnalysis } from '@/types';
import { Card } from './Card';
import { Chip } from './Chip';

interface LookCardProps {
  look: LookAnalysis;
  onPress: () => void;
}

export function LookCard({ look, onPress }: LookCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <Card style={styles.card} padding="none">
        <Image
          source={{ uri: look.imageUri }}
          style={styles.image}
          contentFit="cover"
        />
        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.dateContainer}>
              <Calendar size={14} color={appColors.textLight} />
              <Text style={styles.date}>{formatDate(look.createdAt)}</Text>
            </View>
            <View style={styles.scoreContainer}>
              <Sparkles size={14} color={appColors.primary} />
              <Text style={styles.score}>{look.results.fitScore}/5</Text>
            </View>
          </View>
          <Text style={styles.summary} numberOfLines={2}>
            {look.results.summary}
          </Text>
          <View style={styles.tags}>
            <Chip
              label={look.vibe}
              selected={true}
              onPress={() => {}}
              size="small"
            />
            <Chip
              label={look.occasion}
              selected={false}
              onPress={() => {}}
              size="small"
              style={styles.tagMargin}
            />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: appColors.textLight,
    marginLeft: 4,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  score: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: appColors.primary,
    marginLeft: 4,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    color: appColors.textSecondary,
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
  },
  tagMargin: {
    marginLeft: 8,
  },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CalendarCheck2,
  Flame,
  Shield,
  Shirt,
  LayoutGrid,
  Briefcase,
  Star,
  Compass,
} from 'lucide-react-native';
import { Card } from '@/components/Card';
import { useApp } from '@/contexts/AppContext';
import { getXpProgress } from '@/utils/gamification';
import { BadgeDefinition } from '@/types/gamification';
import { palette, radius, space, type as typo } from '@/constants/theme';

const ICONS = {
  CalendarCheck2,
  Flame,
  Shield,
  Shirt,
  LayoutGrid,
  Briefcase,
  Star,
  Compass,
};

function BadgeIcon({ badge }: { badge: BadgeDefinition }) {
  const Icon = ICONS[badge.iconName];
  return <Icon size={18} color={palette.inkLight} strokeWidth={1.9} />;
}

export default function ProgressScreen() {
  const router = useRouter();
  const { gamificationState, wardrobeCoverageMap, badgeDefinitions } = useApp();
  const xpProgress = getXpProgress(gamificationState.xp, gamificationState.level);

  const sortedBadges = useMemo(() => {
    return [...badgeDefinitions].sort((a, b) => {
      const aUnlocked = gamificationState.badges.includes(a.id) ? 1 : 0;
      const bUnlocked = gamificationState.badges.includes(b.id) ? 1 : 0;
      return bUnlocked - aUnlocked;
    });
  }, [badgeDefinitions, gamificationState.badges]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <ArrowLeft size={18} color={palette.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>Progress</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.block} variant="outlined">
            <Text style={styles.blockLabel}>Style Level</Text>
            <Text style={styles.blockValue}>Level {gamificationState.level}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(4, xpProgress.pct * 100)}%` }]} />
            </View>
            <Text style={styles.meta}>{xpProgress.current} / {xpProgress.needed} XP to next level</Text>
          </Card>

          <Card style={styles.block} variant="outlined">
            <Text style={styles.blockLabel}>Daily Streak</Text>
            <View style={styles.streakRow}>
              <View style={styles.pill}>
                <Flame size={14} color={palette.secondary} />
                <Text style={styles.pillText}>{gamificationState.streak.current} days current</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>Best {gamificationState.streak.best}</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.block} variant="outlined">
            <Text style={styles.blockLabel}>Wardrobe Map</Text>
            {wardrobeCoverageMap.categories.map((category) => (
              <View key={category.key} style={styles.mapRow}>
                <View style={styles.mapRowTop}>
                  <Text style={styles.mapLabel}>{category.label}</Text>
                  <Text style={styles.mapMeta}>
                    {category.count}/{category.target}
                  </Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.max(4, category.coveragePct * 100)}%` }]} />
                </View>
              </View>
            ))}
            <Text style={styles.meta}>
              {wardrobeCoverageMap.missingNext
                ? `Missing next: ${wardrobeCoverageMap.missingNext}`
                : 'Your wardrobe map is complete.'}
            </Text>
          </Card>

          <Card style={styles.block} variant="outlined">
            <Text style={styles.blockLabel}>Badges</Text>
            <View style={styles.badgeGrid}>
              {sortedBadges.map((badge) => {
                const unlocked = gamificationState.badges.includes(badge.id);
                return (
                  <View key={badge.id} style={[styles.badgeCard, !unlocked && styles.badgeCardLocked]}>
                    <View style={styles.badgeIconWrap}>
                      <BadgeIcon badge={badge} />
                    </View>
                    <Text style={[styles.badgeTitle, !unlocked && styles.lockedText]}>{badge.title}</Text>
                    <Text style={[styles.badgeDesc, !unlocked && styles.lockedText]}>{badge.description}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: space.screen,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
  },
  title: { ...typo.sectionHeader, color: palette.ink },
  content: {
    paddingHorizontal: space.screen,
    paddingBottom: space.xxl,
    gap: space.md,
  },
  block: {
    borderColor: palette.border,
    backgroundColor: palette.white,
  },
  blockLabel: { ...typo.small, color: palette.inkMuted, marginBottom: space.xs },
  blockValue: { ...typo.sectionHeader, color: palette.ink, marginBottom: space.sm },
  meta: { ...typo.small, color: palette.inkMuted, marginTop: space.sm },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.borderLight,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
  },
  streakRow: {
    flexDirection: 'row',
    gap: space.sm,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { ...typo.caption, color: palette.inkLight },
  mapRow: { marginBottom: space.sm },
  mapRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  mapLabel: { ...typo.caption, color: palette.ink },
  mapMeta: { ...typo.small, color: palette.inkMuted },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  badgeCard: {
    width: '48%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: space.md,
    backgroundColor: palette.white,
  },
  badgeCardLocked: {
    opacity: 0.45,
  },
  badgeIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.warmWhiteDark,
    marginBottom: 8,
  },
  badgeTitle: {
    ...typo.bodyMedium,
    color: palette.ink,
    marginBottom: 4,
  },
  badgeDesc: {
    ...typo.small,
    color: palette.inkMuted,
    lineHeight: 16,
  },
  lockedText: {
    color: palette.inkFaint,
  },
});


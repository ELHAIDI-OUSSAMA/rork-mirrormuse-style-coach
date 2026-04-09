import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { estimateResaleValue } from '@/lib/resaleEstimator';
import { getCleanupReason } from '@/lib/cleanupCandidates';
import { palette, radius, shadow, space, type as typo } from '@/constants/theme';

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDaysAgo(dateLike?: string): string {
  if (!dateLike) return 'Not worn yet';
  const value = new Date(dateLike).getTime();
  if (!Number.isFinite(value)) return 'Not worn yet';
  const days = Math.max(1, Math.floor((Date.now() - value) / DAY_MS));
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

export default function ClosetCleanupScreen() {
  const router = useRouter();
  const { cleanupCandidates, closetItems, marketplaceListings, updateClosetItem, highDemandSellOpportunities } = useApp();

  const stats = useMemo(() => {
    const estimatedResaleTotal = cleanupCandidates.reduce(
      (sum, item) => sum + (item.estimatedResaleValue || estimateResaleValue(item)),
      0
    );
    const donationReadyCount = cleanupCandidates.filter((item) => item.donationIntent).length;
    return {
      total: cleanupCandidates.length,
      estimatedResaleTotal,
      donationReadyCount,
    };
  }, [cleanupCandidates]);

  const history = useMemo(() => {
    const recentlyListed = [...marketplaceListings]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
      .map((listing) => {
        const item = closetItems.find((candidate) => candidate.id === listing.closetItemId);
        return item ? `${item.color} ${item.category}` : listing.title;
      });
    const recentlyDonated = closetItems
      .filter((item) => item.status === 'donated')
      .sort((a, b) => new Date(b.lifecycleUpdatedAt || b.createdAt).getTime() - new Date(a.lifecycleUpdatedAt || a.createdAt).getTime())
      .slice(0, 3)
      .map((item) => `${item.color} ${item.category}`);
    const recentlySnoozed = closetItems
      .filter((item) => item.cleanupDismissedUntil && new Date(item.cleanupDismissedUntil).getTime() > Date.now())
      .sort((a, b) => new Date(b.cleanupDismissedUntil || b.createdAt).getTime() - new Date(a.cleanupDismissedUntil || a.createdAt).getTime())
      .slice(0, 3)
      .map((item) => `${item.color} ${item.category}`);

    return { recentlyListed, recentlyDonated, recentlySnoozed };
  }, [closetItems, marketplaceListings]);

  const keepItem = (itemId: string) => {
    updateClosetItem(itemId, {
      status: 'active',
      cleanupDismissedUntil: new Date(Date.now() + 90 * DAY_MS).toISOString(),
      donationIntent: false,
      lifecycleUpdatedAt: new Date().toISOString(),
    });
  };

  const remindLater = (itemId: string) => {
    updateClosetItem(itemId, {
      status: 'cleanup_candidate',
      cleanupDismissedUntil: new Date(Date.now() + 30 * DAY_MS).toISOString(),
      lifecycleUpdatedAt: new Date().toISOString(),
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={<ArrowLeft size={18} color={palette.ink} />} onPress={() => router.back()} size={38} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Closet Cleanup</Text>
            <Text style={styles.subtitle}>Items you may not be wearing anymore</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.summaryCard} variant="flat">
            <View style={styles.summaryRow}>
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Candidates</Text>
              </View>
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>${stats.estimatedResaleTotal}</Text>
                <Text style={styles.statLabel}>Est. resale total</Text>
              </View>
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{stats.donationReadyCount}</Text>
                <Text style={styles.statLabel}>Donation ready</Text>
              </View>
            </View>
          </Card>

          {cleanupCandidates.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Sparkles size={18} color={palette.accent} />
              </View>
              <Text style={styles.emptyTitle}>Your closet is in a great place</Text>
              <Text style={styles.emptySubtitle}>
                We will gently suggest items here whenever something looks ready for a second life.
              </Text>
            </Card>
          ) : (
            cleanupCandidates.map((item) => {
              const lastWorn = item.lastWornAt || item.lastUsedAt || item.createdAt;
              const similarCount = closetItems.filter(
                (candidate) =>
                  candidate.id !== item.id &&
                  candidate.category === item.category &&
                  candidate.color.toLowerCase() === item.color.toLowerCase()
              ).length + 1;
              const resaleValue = item.estimatedResaleValue || estimateResaleValue(item);
              return (
                <Card key={item.id} style={styles.itemCard}>
                  <View style={styles.itemTop}>
                    <Image source={{ uri: item.stickerPngUri || item.imageUri }} style={styles.itemImage} contentFit="cover" />
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemTitle}>{item.color} {item.category}</Text>
                    <Text style={styles.itemInfo}>Last worn: {formatDaysAgo(lastWorn)}</Text>
                      <Text style={styles.itemInfo}>Wear count: {item.usageCount || 0}</Text>
                      <Text style={styles.itemValue}>Est. resale value: ${resaleValue}</Text>
                    </View>
                  </View>
                  <Text style={styles.insightText}>{getCleanupReason(item, closetItems)}</Text>
                  {similarCount > 2 ? (
                    <Text style={styles.secondaryHint}>
                      You own a few similar options, so this one could be a good candidate for a second life.
                    </Text>
                  ) : null}
                  <View style={styles.actionRow}>
                    <Button title="Keep" variant="outline" size="small" onPress={() => keepItem(item.id)} style={styles.actionBtn} />
                    <Button
                      title="Sell"
                      variant="secondary"
                      size="small"
                      onPress={() => router.push({ pathname: '/marketplace/create-listing', params: { closetItemId: item.id } } as any)}
                      style={styles.actionBtn}
                    />
                  </View>
                  <View style={styles.actionRow}>
                    <Button
                      title="Donate"
                      variant="ghost"
                      size="small"
                      onPress={() => router.push({ pathname: '/donate-item', params: { closetItemId: item.id } } as any)}
                      style={styles.actionBtn}
                    />
                    <Button title="Later" variant="ghost" size="small" onPress={() => remindLater(item.id)} style={styles.actionBtn} />
                  </View>
                </Card>
              );
            })
          )}

          {highDemandSellOpportunities.length > 0 ? (
            <Card style={styles.historyCard} variant="flat">
              <Text style={styles.historyTitle}>High-demand items in your closet</Text>
              <Text style={styles.historyText}>
                {highDemandSellOpportunities
                  .slice(0, 3)
                  .map((item) => {
                    const closet = closetItems.find((row) => row.id === item.closetItemId);
                    return closet ? `${closet.color} ${closet.category}` : item.title;
                  })
                  .join(' • ')}
              </Text>
              <Button
                title="Review opportunities"
                variant="outline"
                size="small"
                onPress={() => router.push('/sell-opportunities' as any)}
              />
            </Card>
          ) : null}

          <Card style={styles.historyCard} variant="flat">
            <Text style={styles.historyTitle}>Recent cleanup activity</Text>
            <Text style={styles.historyLabel}>Recently listed</Text>
            <Text style={styles.historyText}>
              {history.recentlyListed.length > 0 ? history.recentlyListed.join(' • ') : 'No recent listings yet'}
            </Text>
            <Text style={styles.historyLabel}>Recently donated</Text>
            <Text style={styles.historyText}>
              {history.recentlyDonated.length > 0 ? history.recentlyDonated.join(' • ') : 'No donations yet'}
            </Text>
            <Text style={styles.historyLabel}>Recently snoozed</Text>
            <Text style={styles.historyText}>
              {history.recentlySnoozed.length > 0 ? history.recentlySnoozed.join(' • ') : 'No snoozed items right now'}
            </Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.screen,
    gap: space.sm,
    paddingBottom: space.sm,
  },
  headerText: { flex: 1 },
  title: { ...typo.screenTitle, fontSize: 30, lineHeight: 36, color: palette.ink },
  subtitle: { ...typo.caption, color: palette.inkMuted },
  content: { paddingHorizontal: space.screen, paddingBottom: 120, gap: space.md },
  summaryCard: { marginBottom: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { ...typo.sectionHeader, color: palette.ink },
  statLabel: { ...typo.small, color: palette.inkMuted, textAlign: 'center' },
  emptyCard: { alignItems: 'center', gap: space.sm },
  emptyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...typo.sectionHeader, color: palette.ink },
  emptySubtitle: { ...typo.body, color: palette.inkMuted, textAlign: 'center' },
  itemCard: { ...shadow.soft },
  itemTop: { flexDirection: 'row', gap: space.sm },
  itemImage: {
    width: 84,
    height: 106,
    borderRadius: radius.md,
    backgroundColor: palette.warmWhiteDark,
  },
  itemMeta: { flex: 1 },
  itemTitle: { ...typo.bodyMedium, color: palette.ink, textTransform: 'capitalize' },
  itemInfo: { ...typo.small, color: palette.inkMuted, marginTop: 2 },
  itemValue: { ...typo.caption, color: palette.accentDark, marginTop: 6 },
  insightText: {
    ...typo.caption,
    color: palette.ink,
    marginTop: space.sm,
    marginBottom: 4,
    backgroundColor: palette.accentLight,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  secondaryHint: { ...typo.small, color: palette.inkMuted, marginBottom: space.sm },
  actionRow: { flexDirection: 'row', gap: space.sm, marginTop: 2 },
  actionBtn: { flex: 1 },
  historyCard: { marginTop: space.sm },
  historyTitle: { ...typo.bodyMedium, color: palette.ink, marginBottom: 8 },
  historyLabel: { ...typo.small, color: palette.inkMuted, marginTop: 6 },
  historyText: { ...typo.caption, color: palette.inkLight, marginTop: 2 },
});

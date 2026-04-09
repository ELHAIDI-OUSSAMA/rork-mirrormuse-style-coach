import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, TrendingUp } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { palette, radius, space, type as typo } from '@/constants/theme';

const demandTone: Record<'low' | 'medium' | 'high', { bg: string; text: string }> = {
  low: { bg: palette.warmWhiteDark, text: palette.inkMuted },
  medium: { bg: palette.secondaryLight, text: palette.secondaryDark },
  high: { bg: palette.accentLight, text: palette.accentDark },
};

export default function SellOpportunitiesScreen() {
  const router = useRouter();
  const { sellOpportunities, getClosetItemById, dismissSellOpportunity } = useApp();

  const visibleOpportunities = sellOpportunities.filter(
    (item) => !item.dismissedUntil || new Date(item.dismissedUntil).getTime() <= Date.now()
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={<ArrowLeft size={18} color={palette.ink} />} onPress={() => router.back()} size={38} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Sell Opportunities</Text>
            <Text style={styles.subtitle}>Items in your closet that may sell quickly</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {visibleOpportunities.length === 0 ? (
            <Card style={styles.emptyCard} variant="flat">
              <View style={styles.emptyIcon}><TrendingUp size={18} color={palette.accent} /></View>
              <Text style={styles.emptyTitle}>No active sell opportunities right now</Text>
              <Text style={styles.emptySubtitle}>
                As marketplace demand grows, we will suggest pieces that are likely to sell.
              </Text>
            </Card>
          ) : (
            visibleOpportunities.map((opportunity) => {
              const item = getClosetItemById(opportunity.closetItemId);
              if (!item) return null;
              const tone = demandTone[opportunity.demandLevel];
              return (
                <Card key={opportunity.id} style={styles.card}>
                  <View style={styles.topRow}>
                    <Image source={{ uri: item.stickerPngUri || item.imageUri }} style={styles.image} contentFit="cover" />
                    <View style={styles.meta}>
                      <Text style={styles.itemTitle}>{item.color} {item.category}</Text>
                      <Text style={styles.valueText}>Est. resale value: ${Math.round(opportunity.estimatedResaleValue || 0)}</Text>
                      <TouchableOpacity activeOpacity={0.9} style={[styles.badge, { backgroundColor: tone.bg }]}>
                        <Text style={[styles.badgeText, { color: tone.text }]}>Demand: {opportunity.demandLevel.toUpperCase()}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.message}>{opportunity.message}</Text>
                  <Text style={styles.reason}>{opportunity.reason}</Text>
                  <View style={styles.actions}>
                    <Button
                      title="List now"
                      variant="secondary"
                      size="small"
                      style={{ flex: 1 }}
                      onPress={() =>
                        router.push({
                          pathname: '/marketplace/create-listing',
                          params: {
                            closetItemId: item.id,
                            suggestedPrice: String(Math.round(opportunity.estimatedResaleValue || 0)),
                            demandLevel: opportunity.demandLevel,
                          },
                        } as any)
                      }
                    />
                    <Button
                      title="Not now"
                      variant="outline"
                      size="small"
                      style={{ flex: 1 }}
                      onPress={() => dismissSellOpportunity(opportunity.id, 30)}
                    />
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.screen, paddingBottom: space.sm },
  headerText: { flex: 1 },
  title: { ...typo.screenTitle, color: palette.ink, fontSize: 30, lineHeight: 36 },
  subtitle: { ...typo.caption, color: palette.inkMuted },
  content: { paddingHorizontal: space.screen, paddingBottom: 120, gap: space.md },
  emptyCard: { alignItems: 'center' },
  emptyIcon: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.accentLight, marginBottom: space.xs,
  },
  emptyTitle: { ...typo.sectionHeader, color: palette.ink, textAlign: 'center' },
  emptySubtitle: { ...typo.body, color: palette.inkMuted, textAlign: 'center' },
  card: {},
  topRow: { flexDirection: 'row', gap: space.sm },
  image: { width: 84, height: 106, borderRadius: radius.md, backgroundColor: palette.warmWhiteDark },
  meta: { flex: 1 },
  itemTitle: { ...typo.bodyMedium, color: palette.ink, textTransform: 'capitalize' },
  valueText: { ...typo.caption, color: palette.accentDark, marginTop: 4 },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6, marginTop: 8 },
  badgeText: { ...typo.caption },
  message: { ...typo.bodyMedium, color: palette.ink, marginTop: 10 },
  reason: { ...typo.small, color: palette.inkMuted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: 12 },
});

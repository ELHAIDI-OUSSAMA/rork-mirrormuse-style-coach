import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Search, TrendingUp, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { palette, radius, space, type as typo } from '@/constants/theme';
import { MarketplaceListing } from '@/types';

const PAGE_SIZE = 12;

function scoreListing(listing: MarketplaceListing): number {
  const ageMs = Date.now() - new Date(listing.createdAt).getTime();
  const ageScore = Math.max(0, 1 - ageMs / (1000 * 60 * 60 * 24 * 30));
  return ageScore + (listing.price < 120 ? 0.4 : 0.1);
}

export default function MarketplaceTabScreen() {
  const router = useRouter();
  const { marketplaceListings, trackMarketplaceSearch, userId } = useApp();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const activeListings = useMemo(
    () => marketplaceListings.filter((item) => item.status === 'active'),
    [marketplaceListings]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return activeListings;
    return activeListings.filter((listing) =>
      `${listing.title} ${listing.description} ${listing.brand || ''} ${listing.category} ${listing.color || ''}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [activeListings, query]);

  const trending = useMemo(() => [...filtered].sort((a, b) => scoreListing(b) - scoreListing(a)).slice(0, 8), [filtered]);
  const recentlyListed = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [filtered]
  );
  const recommended = useMemo(
    () => [...filtered].sort((a, b) => a.price - b.price).slice(0, 6),
    [filtered]
  );
  const paginated = recentlyListed.slice(0, page * PAGE_SIZE);

  const onSearchSubmit = () => {
    if (!query.trim()) return;
    trackMarketplaceSearch(query.trim(), { userId: userId || undefined });
  };

  const renderListing = ({ item }: { item: MarketplaceListing }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/marketplace/listing/[id]', params: { id: item.id } } as any);
      }}
    >
      <Image source={{ uri: item.images[0] }} style={styles.cardImage} contentFit="cover" />
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.cardPrice}>${item.price}</Text>
      <Text style={styles.cardMeta} numberOfLines={1}>{item.brand || 'Unbranded'} · {item.condition}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AppHeader
          title="Marketplace"
          right={
            <IconButton
              icon={<Plus size={18} color={palette.white} />}
              variant="filled"
              fillColor={palette.accent}
              onPress={() => router.push('/(tabs)/closet' as any)}
            />
          }
        />

        <View style={styles.searchWrap}>
          <Search size={16} color={palette.inkMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search marketplace"
            placeholderTextColor={palette.inkMuted}
            returnKeyType="search"
            onSubmitEditing={onSearchSubmit}
          />
        </View>

        <Card style={styles.sectionCard} variant="flat">
          <View style={styles.sectionHeader}>
            <TrendingUp size={16} color={palette.secondary} />
            <Text style={styles.sectionTitle}>Trending items</Text>
          </View>
          <Text style={styles.sectionSubtitle}>{trending.length} items right now</Text>
        </Card>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillSection}
          style={{ marginBottom: space.sm }}
        >
          <View style={styles.pill}>
            <Text style={styles.pillTitle}>Recently listed</Text>
            <Text style={styles.pillMeta}>{recentlyListed.length}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillTitle}>Recommended</Text>
            <Text style={styles.pillMeta}>{recommended.length}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillTitle}>Trending</Text>
            <Text style={styles.pillMeta}>{trending.length}</Text>
          </View>
        </ScrollView>

        <FlatList
          data={paginated}
          renderItem={renderListing}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (paginated.length < recentlyListed.length) setPage((prev) => prev + 1);
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No active listings yet</Text>
              <Text style={styles.emptySubtitle}>List from your closet to start selling.</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.systemGroupedBg },
  safeArea: { flex: 1 },
  searchWrap: {
    marginHorizontal: space.screen,
    marginBottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.card,
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: { flex: 1, ...typo.body, color: palette.ink, fontSize: 16 },
  sectionCard: { marginHorizontal: space.screen, marginBottom: space.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { ...typo.bodyMedium, color: palette.ink, fontSize: 16 },
  sectionSubtitle: { ...typo.caption, color: palette.inkMuted, marginTop: 2 },
  pillSection: { paddingHorizontal: space.screen, gap: 8 },
  pill: {
    borderRadius: radius.pill,
    backgroundColor: palette.secondarySystemGroupedBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillTitle: { ...typo.caption, color: palette.inkLight },
  pillMeta: { ...typo.caption, fontWeight: '600' as const, color: palette.accent },
  listContent: { paddingHorizontal: space.screen, paddingBottom: 120 },
  column: { justifyContent: 'space-between' as const, marginBottom: space.sm },
  card: {
    width: '48.5%',
    backgroundColor: palette.secondarySystemGroupedBg,
    borderRadius: radius.card,
    padding: space.sm,
  },
  cardImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    backgroundColor: palette.warmWhiteDark,
    marginBottom: 8,
  },
  cardTitle: { ...typo.bodyMedium, color: palette.ink, fontSize: 15 },
  cardPrice: { ...typo.bodyMedium, color: palette.accent, marginTop: 2, fontSize: 15 },
  cardMeta: { ...typo.caption, color: palette.inkMuted, marginTop: 2 },
  emptyWrap: { alignItems: 'center' as const, paddingTop: 60 },
  emptyTitle: { ...typo.sectionHeader, color: palette.ink },
  emptySubtitle: { ...typo.body, color: palette.inkMuted, marginTop: 6, textAlign: 'center' as const, fontSize: 15 },
});

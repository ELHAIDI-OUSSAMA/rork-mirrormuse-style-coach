import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Search, Bookmark, BookmarkCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { InspirationItem } from '@/types';
import { fetchInspirationFeed, getInspirationChips } from '@/lib/inspirationProvider';
import { space, radius, palette, type as typo, CHIP_HEIGHT, motion } from '@/constants/theme';
import { AppHeader } from '@/components/AppHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const GAP = 10;
const COLUMN_WIDTH = (SCREEN_WIDTH - space.screen * 2 - GAP) / NUM_COLUMNS;

export default function InspirationScreen() {
  const router = useRouter();
  const { preferences, isInspirationItemSaved, saveInspirationItem } = useApp();

  const isMale = preferences.gender === 'male';
  const gender = isMale ? 'men' : 'women';
  const chips = useMemo(() => getInspirationChips(gender as any), [gender]);

  const [items, setItems] = useState<InspirationItem[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = useCallback(async (
    pageNum: number,
    chip: string | null,
    append: boolean = false,
  ) => {
    if (!append) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const result = await fetchInspirationFeed(
        gender as 'men' | 'women',
        pageNum,
        chip || undefined,
      );

      if (result.length === 0) {
        setHasMore(false);
      }

      if (append) {
        setItems(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const newItems = result.filter(i => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      } else {
        setItems(result);
        setHasMore(true);
      }
    } catch (e) {
      console.log('[Inspiration] Error fetching feed:', e);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [gender]);

  useEffect(() => {
    fetchFeed(1, selectedChip);
  }, [selectedChip, gender, fetchFeed]);

  const handleChipPress = useCallback((chip: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPage(1);
    if (selectedChip === chip) {
      setSelectedChip(null);
    } else {
      setSelectedChip(chip);
    }
  }, [selectedChip]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(1);
    fetchFeed(1, selectedChip);
  }, [fetchFeed, selectedChip]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFeed(nextPage, selectedChip, true);
  }, [page, isLoadingMore, hasMore, fetchFeed, selectedChip]);

  const handleItemPress = useCallback((item: InspirationItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/inspiration-detail' as any,
      params: { itemData: JSON.stringify(item) },
    });
  }, [router]);

  const handleQuickSave = useCallback((item: InspirationItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    saveInspirationItem(item);
  }, [saveInspirationItem]);

  /* ── Masonry layout ── */
  const { leftColumn, rightColumn } = useMemo(() => {
    const left: InspirationItem[] = [];
    const right: InspirationItem[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    for (const item of items) {
      const ratio = item.height / item.width;
      const displayHeight = COLUMN_WIDTH * Math.min(Math.max(ratio, 0.9), 1.6);

      if (leftHeight <= rightHeight) {
        left.push(item);
        leftHeight += displayHeight + GAP;
      } else {
        right.push(item);
        rightHeight += displayHeight + GAP;
      }
    }

    return { leftColumn: left, rightColumn: right };
  }, [items]);

  const subtitle = isMale ? "Men's outfit ideas" : "Women's outfit ideas";

  return (
    <View style={s.container}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <AppHeader title="Inspiration" subtitle={subtitle} />

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipRow}
          style={s.chipScroll}
        >
          {chips.map(chip => {
            const isActive = selectedChip === chip;
            return (
              <TouchableOpacity
                key={chip}
                style={[s.chip, isActive && s.chipActive]}
                onPress={() => handleChipPress(chip)}
                activeOpacity={0.85}
              >
                <Text style={[s.chipText, isActive && s.chipTextActive]}>{chip}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Feed */}
        {isLoading && items.length === 0 ? (
          <SkeletonGrid />
        ) : items.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <Search size={40} color={palette.inkMuted} />
            </View>
            <Text style={s.emptyTitle}>No results found</Text>
            <Text style={s.emptySubtitle}>
              Try a different filter or pull to refresh
            </Text>
          </View>
        ) : (
          <ScrollView
            style={s.feed}
            contentContainerStyle={s.feedContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={palette.accent}
              />
            }
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const isNearEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 500;
              if (isNearEnd) handleLoadMore();
            }}
            scrollEventThrottle={400}
          >
            <View style={s.masonry}>
              <View style={s.column}>
                {leftColumn.map(item => (
                  <MasonryCard
                    key={item.id}
                    item={item}
                    onPress={handleItemPress}
                    onSave={handleQuickSave}
                    isSaved={isInspirationItemSaved(item.id)}
                  />
                ))}
              </View>
              <View style={s.column}>
                {rightColumn.map(item => (
                  <MasonryCard
                    key={item.id}
                    item={item}
                    onPress={handleItemPress}
                    onSave={handleQuickSave}
                    isSaved={isInspirationItemSaved(item.id)}
                  />
                ))}
              </View>
            </View>

            {isLoadingMore && (
              <View style={s.loadingMore}>
                <ActivityIndicator size="small" color={palette.accent} />
                <Text style={s.loadingMoreText}>Loading more...</Text>
              </View>
            )}

            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function formatOutfitLabel(item: InspirationItem): string {
  const style = item.styleTags[0] || '';
  const pieces = item.aiDetectedPieces && item.aiDetectedPieces.length > 0
    ? item.aiDetectedPieces
    : item.keyPieces;
  const topTwo = pieces.slice(0, 2).map(p =>
    p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
  );
  if (style && topTwo.length > 0) {
    return `${style} · ${topTwo.join(' + ')}`;
  }
  if (style) return style;
  return topTwo.join(' + ');
}

/* ── Masonry Card ── */
function MasonryCard({
  item,
  onPress,
  onSave,
  isSaved,
}: {
  item: InspirationItem;
  onPress: (item: InspirationItem) => void;
  onSave: (item: InspirationItem) => void;
  isSaved: boolean;
}) {
  const ratio = item.height / item.width;
  const displayHeight = COLUMN_WIDTH * Math.min(Math.max(ratio, 0.9), 1.6);
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
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, s.cardWrap]}>
      <TouchableOpacity
        style={[s.card, { height: displayHeight }]}
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={s.cardImage}
          contentFit="cover"
          transition={300}
        />

        {/* Save button */}
        <TouchableOpacity
          style={[s.saveBtn, isSaved && s.saveBtnActive]}
          onPress={(e) => {
            e.stopPropagation?.();
            onSave(item);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isSaved ? (
            <BookmarkCheck size={16} color={palette.white} />
          ) : (
            <Bookmark size={16} color={palette.white} />
          )}
        </TouchableOpacity>

        {/* Outfit label: "Style • piece + piece" */}
        {(item.styleTags[0] || (item.aiDetectedPieces && item.aiDetectedPieces.length > 0)) && (
          <View style={s.outfitLabel}>
            <Text style={s.outfitLabelText} numberOfLines={1}>
              {formatOutfitLabel(item)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ── Skeleton Grid ── */
function SkeletonGrid() {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const heights = [220, 280, 240, 200, 260, 230, 250, 210];

  return (
    <View style={s.skeletonContainer}>
      <View style={s.masonry}>
        <View style={s.column}>
          {heights.slice(0, 4).map((h, i) => (
            <Animated.View
              key={`l-${i}`}
              style={[s.skeleton, { height: h, opacity: pulseAnim }]}
            />
          ))}
        </View>
        <View style={s.column}>
          {heights.slice(4, 8).map((h, i) => (
            <Animated.View
              key={`r-${i}`}
              style={[s.skeleton, { height: h, opacity: pulseAnim }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

/* ── Styles ── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safe: { flex: 1 },

  /* Chips */
  chipScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.screen,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: palette.warmWhiteDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: palette.accent },
  chipText: { ...typo.chip, color: palette.inkLight },
  chipTextActive: { ...typo.chip, color: palette.white },

  /* Feed */
  feed: { flex: 1 },
  feedContent: { paddingHorizontal: space.screen },

  /* Masonry */
  masonry: { flexDirection: 'row', gap: GAP },
  column: { flex: 1, gap: GAP },

  /* Card */
  cardWrap: { marginBottom: 0 },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: palette.warmWhiteDark,
  },
  cardImage: { width: '100%', height: '100%' },
  saveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(44, 40, 37, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnActive: { backgroundColor: palette.accent },
  outfitLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(20, 18, 16, 0.55)',
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  outfitLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.white,
    letterSpacing: 0.2,
  },

  /* Loading more */
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingMoreText: { ...typo.caption, color: palette.inkMuted },

  /* Empty */
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxl,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: palette.warmWhiteDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  emptyTitle: { ...typo.sectionHeader, color: palette.ink, marginBottom: space.sm },
  emptySubtitle: { ...typo.body, fontSize: 14, color: palette.inkMuted, textAlign: 'center' },

  /* Skeleton */
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: space.screen,
    paddingTop: 4,
  },
  skeleton: {
    backgroundColor: palette.warmWhiteDark,
    borderRadius: radius.lg,
  },
});

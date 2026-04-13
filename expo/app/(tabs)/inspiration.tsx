import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Bookmark, ExternalLink, Heart } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { rankAndShuffleInspiration } from '@/lib/inspirationRanking';
import { loadSeedDataset } from '@/lib/inspirationSeed';
import { applyLikeToMap, applySaveToMap, getPinFeedbackMap, persistPinFeedbackMap } from '@/lib/pinFeedbackStore';
import {
  getTopPreferences,
  getUserStyleProfile,
  TopPreferences,
  updatePreferencesFromLike,
  updatePreferencesFromUnlike,
} from '@/lib/preferenceModel';
import { Gender, InspirationItem, PinFeedback } from '@/types/inspiration';
import { palette, radius, shadow, space, type as typo } from '@/constants/theme';
import { Toast } from '@/components/Toast';

const { width } = Dimensions.get('window');
const PADDING = 10;
const GAP = 8;
const NUM_COLUMNS = 2;
const ITEM_WIDTH = (width - PADDING * 2 - GAP) / NUM_COLUMNS;

const FILTER_CHIPS = ['Minimal', 'Work', 'Date', 'Streetwear', 'Old Money', 'Formal', 'Summer', 'Winter'] as const;
const SESSION_SEEDS: Partial<Record<Gender, string>> = {};

type FilterChip = typeof FILTER_CHIPS[number] | null;

type MasonryItem = InspirationItem & { cardHeight: number };

const EMPTY_TOP_PREFERENCES: TopPreferences = {
  topVibes: [],
  topOccasion: null,
  topSeason: null,
};

const InspirationCardTile = React.memo(function InspirationCardTile({
  item,
  liked,
  saved,
  onPress,
}: {
  item: MasonryItem;
  liked: boolean;
  saved: boolean;
  onPress: (item: InspirationItem) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { height: item.cardHeight }]}
      activeOpacity={0.86}
      onPress={() => onPress(item)}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.cardImage} contentFit="cover" />
      <View style={styles.cardStateRow}>
        <View style={[styles.cardStateBadge, liked && styles.cardStateBadgeActive]}>
          <Heart size={13} color={liked ? palette.white : palette.ink} fill={liked ? palette.white : 'transparent'} />
        </View>
        <View style={[styles.cardStateBadge, saved && styles.cardStateBadgeActive]}>
          <Bookmark size={13} color={saved ? palette.white : palette.ink} fill={saved ? palette.white : 'transparent'} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

function getHeightForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const variants = [1.42, 1.62, 1.86, 2.14, 2.38];
  return Math.round(ITEM_WIDTH * variants[Math.abs(hash) % variants.length]);
}

function matchesChip(item: InspirationItem, chip: FilterChip) {
  if (!chip) return true;
  const normalizedTags = item.vibeTags.map((tag) => tag.toLowerCase());
  const lowerChip = chip.toLowerCase();
  if (chip === 'Work') return item.occasion === 'work';
  if (chip === 'Date') return item.occasion === 'date';
  if (chip === 'Streetwear') return item.occasion === 'streetwear' || normalizedTags.includes('streetwear');
  if (chip === 'Formal') return item.occasion === 'formal';
  if (chip === 'Summer') return item.season === 'summer';
  if (chip === 'Winter') return item.season === 'winter';
  return normalizedTags.includes(lowerChip);
}

function buildColumns(items: InspirationItem[]): { left: MasonryItem[]; right: MasonryItem[] } {
  const left: MasonryItem[] = [];
  const right: MasonryItem[] = [];
  let leftHeight = 0;
  let rightHeight = 0;

  for (const item of items) {
    const cardHeight = getHeightForId(item.id);
    const nextItem: MasonryItem = { ...item, cardHeight };
    if (leftHeight <= rightHeight) {
      left.push(nextItem);
      leftHeight += cardHeight + GAP;
    } else {
      right.push(nextItem);
      rightHeight += cardHeight + GAP;
    }
  }

  return { left, right };
}

function createSessionSalt() {
  return Math.random().toString(36).slice(2, 10);
}

export default function InspirationScreen() {
  const {
    preferences,
    toggleInspirationSaved,
    isInspirationCardSaved,
    isInspirationLiked,
    recordInspirationSwipe,
    inspirationSaves,
    savedInspirationItems,
    removeInspirationItem,
  } = useApp();

  const [selectedGender, setSelectedGender] = useState<Gender>('women');
  const [activeChip, setActiveChip] = useState<FilterChip>(null);
  const [selectedItem, setSelectedItem] = useState<InspirationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, PinFeedback>>({});
  const [topPreferences, setTopPreferences] = useState<TopPreferences>(EMPTY_TOP_PREFERENCES);
  const [sessionSalt, setSessionSalt] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const likePop = useRef(new Animated.Value(1)).current;

  const profileGender = useMemo<Gender | null>(() => {
    if (preferences.gender === 'male') return 'men';
    if (preferences.gender === 'female') return 'women';
    return null;
  }, [preferences.gender]);

  const activeGender = profileGender ?? selectedGender;

  useEffect(() => {
    if (profileGender) {
      setSelectedGender(profileGender);
    }
  }, [profileGender]);

  useEffect(() => {
    let mounted = true;
    getPinFeedbackMap().then((map) => {
      if (mounted) {
        setFeedbackMap(map);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setSessionSalt(null);
    if (!SESSION_SEEDS[activeGender]) {
      SESSION_SEEDS[activeGender] = createSessionSalt();
    }
    setSessionSalt(SESSION_SEEDS[activeGender] || createSessionSalt());
  }, [activeGender]);

  useEffect(() => {
    let mounted = true;
    getUserStyleProfile()
      .then((profile) => {
        if (mounted) {
          setTopPreferences(getTopPreferences(profile));
        }
      })
      .catch((error) => {
        console.log('[Inspiration] Failed to load style preferences:', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 1400);
  }, []);

  const fullDataset = useMemo(() => loadSeedDataset(activeGender), [activeGender]);

  const baseSeed = useMemo(() => {
    const userScope = preferences.gender || 'anon';
    return `${userScope}:${activeGender}`;
  }, [activeGender, preferences.gender]);

  const orderedDataset = useMemo(() => {
    if (!sessionSalt) return [];
    return rankAndShuffleInspiration(fullDataset, topPreferences, `${baseSeed}:${sessionSalt}`);
  }, [baseSeed, fullDataset, sessionSalt, topPreferences]);

  const filteredItems = useMemo(() => {
    const filtered = orderedDataset.filter((item) => matchesChip(item, activeChip));
    return filtered.length > 0 ? filtered : orderedDataset;
  }, [activeChip, orderedDataset]);

  const columns = useMemo(() => buildColumns(filteredItems), [filteredItems]);

  useEffect(() => {
    if (!sessionSalt) return;
    setIsLoading(true);
    const urls = filteredItems.slice(0, 12).map((item) => item.imageUrl);
    Image.prefetch(urls)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [filteredItems, sessionSalt]);

  const openDetail = useCallback((item: InspirationItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItem(item);
  }, []);

  const animateLike = useCallback(() => {
    likePop.stopAnimation();
    likePop.setValue(0.94);
    Animated.sequence([
      Animated.timing(likePop, { toValue: 1.08, duration: 120, useNativeDriver: true }),
      Animated.timing(likePop, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
  }, [likePop]);

  const persistFeedback = useCallback((nextMap: Record<string, PinFeedback>) => {
    persistPinFeedbackMap(nextMap).catch(() => {});
  }, []);

  const handleLikeToggle = useCallback((item: InspirationItem) => {
    const currentlyLiked = Boolean(feedbackMap[item.id]?.likedAt) || isInspirationLiked(item.id);
    const willLike = !currentlyLiked;
    const nextMap = applyLikeToMap(feedbackMap, item, willLike);

    setFeedbackMap(nextMap);
    persistFeedback(nextMap);
    animateLike();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    recordInspirationSwipe(item, willLike ? 'like' : 'dislike');

    if (willLike) {
      updatePreferencesFromLike(item).catch(() => {});
      showToast('Liked');
    } else {
      updatePreferencesFromUnlike(item).catch(() => {});
      showToast('Removed like');
    }
  }, [animateLike, feedbackMap, isInspirationLiked, persistFeedback, recordInspirationSwipe, showToast]);

  const saveItem = useCallback((item: InspirationItem) => {
    const currentlySaved = Boolean(feedbackMap[item.id]?.savedAt) || isInspirationCardSaved(item.id);
    const willSave = !currentlySaved;
    const nextMap = applySaveToMap(feedbackMap, item, willSave);

    setFeedbackMap(nextMap);
    persistFeedback(nextMap);

    if (willSave) {
      toggleInspirationSaved(item);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast('Saved to inspiration');
      return;
    }

    if (inspirationSaves.includes(item.id)) {
      toggleInspirationSaved(item);
    }
    const savedItem = savedInspirationItems.find((entry) => entry.inspirationId === item.id);
    if (savedItem) {
      removeInspirationItem(savedItem.id);
    }
    showToast('Removed from inspiration');
  }, [feedbackMap, inspirationSaves, isInspirationCardSaved, persistFeedback, removeInspirationItem, savedInspirationItems, showToast, toggleInspirationSaved]);

  const handleRefresh = useCallback(() => {
    const nextSalt = createSessionSalt();
    setIsRefreshing(true);
    getUserStyleProfile()
      .then((profile) => {
        setTopPreferences(getTopPreferences(profile));
      })
      .catch((error) => {
        console.log('[Inspiration] Failed to refresh style preferences:', error);
      })
      .finally(() => {
        SESSION_SEEDS[activeGender] = nextSalt;
        setSessionSalt(nextSalt);
      });
    setIsRefreshing(false);
    showToast('Refreshing your inspiration...');
  }, [activeGender, showToast]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Inspiration</Text>
            <Text style={styles.headerSubtitle}>{activeGender === 'men' ? 'Men outfit ideas' : 'Women outfit ideas'}</Text>
          </View>
        </View>

        {profileGender ? null : (
          <View style={styles.genderRow}>
            {(['men', 'women'] as const).map((gender) => {
              const active = selectedGender === gender;
              return (
                <TouchableOpacity
                  key={gender}
                  style={[styles.genderChip, active && styles.genderChipActive]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedGender(gender)}
                >
                  <Text style={[styles.genderChipText, active && styles.genderChipTextActive]}>{gender === 'men' ? 'Men' : 'Women'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <FlatList
          data={FILTER_CHIPS as unknown as string[]}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          renderItem={({ item }) => {
            const active = activeChip === item;
            return (
              <TouchableOpacity
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}
                onPress={() => setActiveChip(active ? null : (item as FilterChip))}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />

        {isLoading || !sessionSalt ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={palette.accent} />
            <Text style={styles.loadingText}>Loading Pinterest-quality inspiration...</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={palette.accent}
                colors={[palette.accent]}
              />
            }
          >
            <View style={styles.masonryWrap}>
              <View style={styles.column}>
                {columns.left.map((item) => (
                  <InspirationCardTile
                    key={item.id}
                    item={item}
                    liked={Boolean(feedbackMap[item.id]?.likedAt) || isInspirationLiked(item.id)}
                    saved={Boolean(feedbackMap[item.id]?.savedAt) || isInspirationCardSaved(item.id)}
                    onPress={openDetail}
                  />
                ))}
              </View>
              <View style={styles.column}>
                {columns.right.map((item) => (
                  <InspirationCardTile
                    key={item.id}
                    item={item}
                    liked={Boolean(feedbackMap[item.id]?.likedAt) || isInspirationLiked(item.id)}
                    saved={Boolean(feedbackMap[item.id]?.savedAt) || isInspirationCardSaved(item.id)}
                    onPress={openDetail}
                  />
                ))}
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      <Modal visible={!!selectedItem} animationType="slide" transparent onRequestClose={() => setSelectedItem(null)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setSelectedItem(null)} />
          <View style={styles.modalCard}>
            {selectedItem ? (
              <>
                <Image source={{ uri: selectedItem.imageUrl }} style={styles.modalImage} contentFit="cover" />
                <Text style={styles.modalTitle}>{selectedItem.vibeTags[0] || 'Outfit inspiration'}</Text>
                <View style={styles.tagsWrap}>
                  {selectedItem.vibeTags.map((tag) => (
                    <View key={tag} style={styles.tagPill}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.modalMeta}>{selectedItem.occasion} • {selectedItem.season}</Text>
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.modalButtonSecondary}
                    activeOpacity={0.85}
                    onPress={() => saveItem(selectedItem)}
                  >
                    <Bookmark
                      size={16}
                      color={isInspirationCardSaved(selectedItem.id) || Boolean(feedbackMap[selectedItem.id]?.savedAt) ? palette.accent : palette.ink}
                      fill={isInspirationCardSaved(selectedItem.id) || Boolean(feedbackMap[selectedItem.id]?.savedAt) ? palette.accent : 'transparent'}
                    />
                    <Text style={styles.modalButtonSecondaryText}>
                      {isInspirationCardSaved(selectedItem.id) || Boolean(feedbackMap[selectedItem.id]?.savedAt) ? 'Saved' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                  <Animated.View style={[styles.modalPrimaryWrap, { transform: [{ scale: likePop }] }]}>
                    <TouchableOpacity
                      style={styles.modalButtonPrimary}
                      activeOpacity={0.85}
                      onPress={() => handleLikeToggle(selectedItem)}
                    >
                      <Heart
                        size={16}
                        color={palette.white}
                        fill={Boolean(feedbackMap[selectedItem.id]?.likedAt) || isInspirationLiked(selectedItem.id) ? palette.white : 'transparent'}
                      />
                      <Text style={styles.modalButtonPrimaryText}>
                        {Boolean(feedbackMap[selectedItem.id]?.likedAt) || isInspirationLiked(selectedItem.id) ? 'Liked' : 'Like'}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalButtonTertiary}
                    activeOpacity={0.85}
                    onPress={() => Linking.openURL(selectedItem.pinUrl)}
                  >
                    <ExternalLink size={16} color={palette.ink} />
                    <Text style={styles.modalButtonSecondaryText}>Open on Pinterest</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} tone="info" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.systemGroupedBg },
  safeArea: { flex: 1 },
  headerRow: {
    paddingHorizontal: PADDING,
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  headerTitle: { ...typo.screenTitle, color: palette.ink },
  headerSubtitle: { ...typo.caption, color: palette.inkMuted, marginTop: 4 },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: PADDING,
    marginBottom: space.sm,
  },
  genderChip: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderChipActive: { backgroundColor: palette.accent },
  genderChipText: { ...typo.caption, color: palette.inkLight },
  genderChipTextActive: { color: '#FFFFFF' },
  chipsRow: {
    paddingHorizontal: PADDING,
    paddingBottom: space.md,
    gap: 8,
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: palette.secondarySystemGroupedBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: palette.accentLight,
    borderColor: palette.accent,
  },
  chipText: { ...typo.caption, color: palette.inkLight },
  chipTextActive: { color: palette.accentDark, fontWeight: '600' as const },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  loadingText: { ...typo.body, color: palette.inkMuted, fontSize: 15 },
  listContent: {
    paddingHorizontal: PADDING,
    paddingBottom: 140,
    paddingTop: 2,
  },
  masonryWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: GAP,
  },
  column: { flex: 1 },
  card: {
    width: '100%',
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: palette.secondarySystemGroupedBg,
    marginBottom: GAP + 4,
  },
  cardImage: { width: '100%', height: '100%', backgroundColor: palette.warmWhiteDark },
  cardStateRow: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 5,
  },
  cardStateBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  cardStateBadgeActive: {
    backgroundColor: palette.accent,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalDismiss: { flex: 1 },
  modalCard: {
    backgroundColor: palette.secondarySystemGroupedBg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: space.lg,
    paddingTop: 12,
    gap: space.md,
  },
  modalImage: {
    width: '100%',
    height: 320,
    borderRadius: radius.card,
    backgroundColor: palette.warmWhiteDark,
  },
  modalTitle: {
    ...typo.sectionHeader,
    color: palette.ink,
    textTransform: 'capitalize' as const,
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagPill: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: palette.systemGroupedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: { ...typo.small, color: palette.ink },
  modalMeta: { ...typo.bodyMedium, color: palette.inkMuted, textTransform: 'capitalize' as const, fontSize: 15 },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalPrimaryWrap: {
    flex: 1,
  },
  modalButtons: { gap: 10 },
  modalButtonPrimary: {
    height: 48,
    borderRadius: radius.button,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalButtonPrimaryText: { ...typo.button, color: '#FFFFFF', fontSize: 15 },
  modalButtonSecondary: {
    flex: 1,
    height: 48,
    borderRadius: radius.button,
    backgroundColor: palette.systemGroupedBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalButtonTertiary: {
    height: 48,
    borderRadius: radius.button,
    backgroundColor: palette.systemGroupedBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalButtonSecondaryText: { ...typo.button, color: palette.ink, fontSize: 15 },
});

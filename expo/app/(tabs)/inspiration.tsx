import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Bookmark, BookmarkCheck, Minus, Plus, SlidersHorizontal } from 'lucide-react-native';
import { palette, radius, shadow, space, type as typo } from '@/constants/theme';
import { PressableScale } from '@/components/PressableScale';
import { Toast } from '@/components/Toast';
import { InspireSwipeDeck, InspireSwipeDeckHandle } from '@/components/InspireSwipeDeck';
import { InspireWalkthrough } from '@/components/InspireWalkthrough';
import { fetchInspiration, prefetchInspirationImages } from '@/lib/inspirationFeed';
import { useApp } from '@/contexts/AppContext';
import { InspirationCard, SwipeAction } from '@/types/inspiration';

const WALKTHROUGH_KEY = 'mirrormuse_inspire_walkthrough_seen_v1';
const BUFFER_TARGET = 12;
const BUFFER_LOW_WATERMARK = 6;

function whyThisWorks(card: InspirationCard) {
  const tag = card.tags?.[0] || 'Balanced styling';
  const occasion = card.occasion || 'Daily wear';
  return `${tag} lines, clean proportions, and a wearable palette make this a strong ${occasion.toLowerCase()} reference.`;
}

function keyPieces(card: InspirationCard) {
  const base = card.tags?.[0]?.toLowerCase();
  if (base?.includes('street')) return ['Overshirt', 'Relaxed trousers', 'Low-profile sneakers'];
  if (base?.includes('formal') || base?.includes('work')) return ['Structured layer', 'Straight pants', 'Leather shoes'];
  if (base?.includes('gym') || base?.includes('athleisure')) return ['Technical top', 'Clean joggers', 'Sport sneakers'];
  return ['Top layer', 'Balanced bottom', 'Neutral shoes'];
}

export default function InspirationScreen() {
  const {
    preferences,
    inspirationGender,
    inspirationQueue,
    inspirationCalibration,
    inspirationTagWeights,
    setInspirationGenderPreference,
    setInspirationFeedQueue,
    appendInspirationFeedQueue,
    recordInspirationSwipe,
    toggleInspirationSaved,
    isInspirationCardSaved,
    closetItems,
  } = useApp();

  const [activeIndex, setActiveIndex] = useState(0);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [selectedCard, setSelectedCard] = useState<InspirationCard | null>(null);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; tone: 'info' | 'success' | 'warning' }>({
    visible: false,
    message: '',
    tone: 'info',
  });

  const deckRef = useRef<InspireSwipeDeckHandle>(null);
  const calibrationRef = useRef(inspirationCalibration.progress);
  const fetchingRef = useRef(false);
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const profileGender = useMemo<'men' | 'women' | null>(() => {
    if (preferences.gender === 'male') return 'men';
    if (preferences.gender === 'female') return 'women';
    return null;
  }, [preferences.gender]);

  const effectiveGender = profileGender ?? inspirationGender;
  const shouldShowSegmented = profileGender === null;
  const activeCard = inspirationQueue[activeIndex];

  const preferenceQuery = useMemo(() => {
    return Object.entries(inspirationTagWeights)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([tag]) => tag)
      .join(' ');
  }, [inspirationTagWeights]);

  const flashToast = useCallback((message: string, tone: 'info' | 'success' | 'warning' = 'info') => {
    setToast({ visible: true, message, tone });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 1400);
  }, []);

  const dismissWalkthrough = useCallback(async () => {
    setShowWalkthrough(false);
    try {
      await AsyncStorage.setItem(WALKTHROUGH_KEY, 'true');
    } catch (error) {
      console.log('[Inspire] Failed to persist walkthrough state:', error);
    }
  }, []);

  const logEvent = useCallback((name: string, payload?: Record<string, unknown>) => {
    console.log(`[analytics] ${name}`, payload || {});
  }, []);

  const loadInitialFeed = useCallback(async (reset = false) => {
    try {
      setIsLoading(true);
      const response = await fetchInspiration(effectiveGender, preferenceQuery || undefined, undefined);
      setInspirationFeedQueue(response.items);
      setCursor(response.nextCursor);
      setActiveIndex(0);
      logEvent('inspire_view', { count: response.items.length, gender: effectiveGender });
      if (reset) {
        flashToast('Feed refreshed', 'info');
      }
    } catch (error) {
      console.log('[Inspire] Failed to load initial feed:', error);
      flashToast('Could not load inspiration', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveGender, flashToast, logEvent, preferenceQuery, setInspirationFeedQueue]);

  const fetchMore = useCallback(async () => {
    if (fetchingRef.current) return;
    const remaining = inspirationQueue.length - activeIndex;
    if (remaining >= BUFFER_LOW_WATERMARK) return;

    fetchingRef.current = true;
    setIsFetchingMore(true);
    try {
      const response = await fetchInspiration(effectiveGender, preferenceQuery || undefined, cursor);
      appendInspirationFeedQueue(response.items);
      setCursor(response.nextCursor);
    } catch (error) {
      console.log('[Inspire] Failed to fetch more:', error);
    } finally {
      fetchingRef.current = false;
      setIsFetchingMore(false);
    }
  }, [activeIndex, appendInspirationFeedQueue, cursor, effectiveGender, inspirationQueue.length, preferenceQuery]);

  useEffect(() => {
    AsyncStorage.getItem(WALKTHROUGH_KEY)
      .then((value) => {
        if (value !== 'true') {
          setShowWalkthrough(true);
        }
      })
      .catch((error) => {
        console.log('[Inspire] Failed to read walkthrough state:', error);
      });
  }, []);

  useEffect(() => {
    if (profileGender && profileGender !== inspirationGender) {
      setInspirationGenderPreference(profileGender);
    }
  }, [inspirationGender, profileGender, setInspirationGenderPreference]);

  useEffect(() => {
    loadInitialFeed();
  }, [loadInitialFeed]);

  useEffect(() => {
    if (inspirationQueue.length > 0) {
      prefetchInspirationImages(inspirationQueue, activeIndex + 1).catch(() => {});
    }
  }, [activeIndex, inspirationQueue]);

  useEffect(() => {
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = setTimeout(() => {
      fetchMore();
    }, 140);
    return () => {
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    };
  }, [activeIndex, fetchMore]);

  useEffect(() => {
    if (inspirationQueue.length > 30 && activeIndex > 12) {
      setInspirationFeedQueue(inspirationQueue.slice(activeIndex));
      setActiveIndex(0);
    }
  }, [activeIndex, inspirationQueue, setInspirationFeedQueue]);

  useEffect(() => {
    if (calibrationRef.current < inspirationCalibration.progress && inspirationCalibration.isCalibrated) {
      flashToast('Style profile updated', 'success');
      logEvent('inspire_calibration_complete');
      loadInitialFeed(true);
    }
    calibrationRef.current = inspirationCalibration.progress;
  }, [flashToast, inspirationCalibration.isCalibrated, inspirationCalibration.progress, loadInitialFeed, logEvent]);

  const recreateCoverage = useMemo(() => {
    if (!activeCard || closetItems.length === 0) return null;
    const categories = ['top', 'shirt', 'pants', 'jeans', 'sneakers', 'shoes'];
    const closetMatches = closetItems.filter((item) =>
      categories.some((key) => item.category.toLowerCase().includes(key))
    ).length;
    const pct = Math.max(20, Math.min(95, Math.round((closetMatches / Math.max(closetItems.length, 1)) * 100)));
    return `${pct}%`;
  }, [activeCard, closetItems]);

  const handleSwipe = useCallback((action: SwipeAction, card: InspirationCard) => {
    if (showWalkthrough) {
      dismissWalkthrough();
    }

    recordInspirationSwipe(card, action);
    const eventName =
      action === 'like'
        ? 'inspire_swipe_like'
        : action === 'dislike'
          ? 'inspire_swipe_dislike'
          : action === 'save'
            ? 'inspire_swipe_save'
            : 'inspire_swipe_similar';
    logEvent(eventName, { cardId: card.id, gender: card.gender, tags: card.tags || [] });

    if (action === 'save') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      flashToast(recreateCoverage ? `Saved • You can recreate ~${recreateCoverage}` : 'Saved to inspiration', 'success');
    }
    if (action === 'like' || action === 'dislike') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (action === 'similar' && card.tags?.[0]) {
      fetchInspiration(effectiveGender, card.tags[0], undefined)
        .then((response) => {
          appendInspirationFeedQueue(response.items);
          flashToast(`More ${card.tags?.[0]} looks`, 'info');
        })
        .catch((error) => {
          console.log('[Inspire] Similar fetch failed:', error);
        });
    }

    setActiveIndex((prev) => prev + 1);
  }, [appendInspirationFeedQueue, dismissWalkthrough, effectiveGender, flashToast, logEvent, recordInspirationSwipe, recreateCoverage, showWalkthrough]);

  const handleSaveActive = useCallback(() => {
    if (!activeCard) return;
    const alreadySaved = isInspirationCardSaved(activeCard.id);
    toggleInspirationSaved(activeCard);
    flashToast(alreadySaved ? 'Removed from saved inspiration' : 'Saved inspiration', 'success');
    if (!alreadySaved) {
      recordInspirationSwipe(activeCard, 'save');
      logEvent('inspire_swipe_save', { cardId: activeCard.id, via: 'button' });
    }
  }, [activeCard, flashToast, isInspirationCardSaved, logEvent, recordInspirationSwipe, toggleInspirationSaved]);

  const handleFindSimilar = useCallback(async (card: InspirationCard) => {
    logEvent('inspire_swipe_similar', { cardId: card.id, via: 'detail' });
    recordInspirationSwipe(card, 'similar');
    try {
      const response = await fetchInspiration(effectiveGender, card.tags?.[0], undefined);
      setInspirationFeedQueue([...response.items, ...inspirationQueue].slice(0, BUFFER_TARGET));
      setSelectedCard(null);
      flashToast('Added similar looks', 'success');
    } catch (error) {
      console.log('[Inspire] Failed to find similar looks:', error);
      flashToast('Could not find similar looks', 'warning');
    }
  }, [effectiveGender, flashToast, inspirationQueue, logEvent, recordInspirationSwipe, setInspirationFeedQueue]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.topBar}>
          {shouldShowSegmented ? (
            <View style={styles.segmentWrap}>
              {(['men', 'women'] as const).map((option) => {
                const active = effectiveGender === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (active) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setInspirationGenderPreference(option);
                    }}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {option === 'men' ? 'Men' : 'Women'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.singleGenderLabelWrap}>
              <Text style={styles.singleGenderLabel}>{effectiveGender === 'men' ? 'Men Inspiration' : 'Women Inspiration'}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.filterIcon} activeOpacity={0.7}>
            <SlidersHorizontal size={18} color={palette.inkLight} />
          </TouchableOpacity>
        </View>

        {!inspirationCalibration.isCalibrated ? (
          <View style={styles.calibrationBanner}>
            <Text style={styles.calibrationTitle}>Calibrate your stylist: swipe 20 looks</Text>
            <Text style={styles.calibrationProgress}>
              {Math.min(inspirationCalibration.progress, inspirationCalibration.swipesToCalibrate)}/{inspirationCalibration.swipesToCalibrate}
            </Text>
          </View>
        ) : null}

        <View style={styles.deckArea}>
          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={palette.accent} />
              <Text style={styles.loadingText}>Loading editorial looks...</Text>
            </View>
          ) : (
            <InspireSwipeDeck
              ref={deckRef}
              cards={inspirationQueue}
              activeIndex={activeIndex}
              onSwipe={handleSwipe}
              onCardPress={(card) => {
                logEvent('inspire_open_detail', { cardId: card.id });
                setSelectedCard(card);
              }}
            />
          )}
        </View>

        <View style={styles.bottomBar}>
          <PressableScale style={styles.actionWrap} onPress={() => deckRef.current?.swipeLeft()}>
            <View style={styles.actionBtn}>
              <Minus size={22} color={palette.inkLight} />
            </View>
          </PressableScale>

          <PressableScale style={styles.actionWrap} onPress={handleSaveActive}>
            <View style={styles.actionBtnPrimary}>
              {activeCard && isInspirationCardSaved(activeCard.id) ? (
                <BookmarkCheck size={20} color={palette.white} />
              ) : (
                <Bookmark size={20} color={palette.white} />
              )}
            </View>
          </PressableScale>

          <PressableScale style={styles.actionWrap} onPress={() => deckRef.current?.swipeRight()}>
            <View style={styles.actionBtn}>
              <Plus size={22} color={palette.inkLight} />
            </View>
          </PressableScale>
        </View>

        {isFetchingMore ? (
          <View style={styles.fetchingMore}>
            <ActivityIndicator size="small" color={palette.inkMuted} />
          </View>
        ) : null}
      </SafeAreaView>

      <InspireWalkthrough visible={showWalkthrough} onDismiss={dismissWalkthrough} showSimilar />

      <Modal visible={!!selectedCard} animationType="slide" transparent onRequestClose={() => setSelectedCard(null)}>
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={styles.sheetDismissLayer} activeOpacity={1} onPress={() => setSelectedCard(null)} />
          <View style={styles.sheet}>
            {selectedCard ? (
              <>
                <Image source={{ uri: selectedCard.imageUrl }} style={styles.sheetImage} contentFit="cover" />
                <Text style={styles.sheetTitle}>Why this works</Text>
                <Text style={styles.sheetBody}>{whyThisWorks(selectedCard)}</Text>

                <Text style={styles.sheetTitle}>Key pieces</Text>
                <View style={styles.piecesRow}>
                  {keyPieces(selectedCard).map((piece) => (
                    <View key={piece} style={styles.piecePill}>
                      <Text style={styles.pieceText}>{piece}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    style={styles.sheetAction}
                    onPress={() => {
                      if (selectedCard.linkUrl) Linking.openURL(selectedCard.linkUrl);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.sheetActionText}>Open source</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sheetAction, styles.sheetActionPrimary]}
                    onPress={() => {
                      toggleInspirationSaved(selectedCard);
                      flashToast('Saved inspiration', 'success');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.sheetActionPrimaryText}>Save</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sheetAction}
                    onPress={() => handleFindSimilar(selectedCard)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.sheetActionText}>Find similar</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} tone={toast.tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.warmWhite,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: space.screen,
  },
  topBar: {
    marginTop: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: palette.warmWhiteDark,
    borderRadius: radius.pill,
    padding: 4,
    flex: 1,
    marginRight: space.md,
  },
  segmentBtn: {
    flex: 1,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: palette.white,
    ...shadow.soft,
  },
  segmentText: {
    ...typo.bodyMedium,
    color: palette.inkMuted,
  },
  segmentTextActive: {
    color: palette.ink,
    fontWeight: '600',
  },
  singleGenderLabelWrap: {
    flex: 1,
    marginRight: space.md,
    height: 36,
    justifyContent: 'center',
  },
  singleGenderLabel: {
    ...typo.sectionHeader,
    color: palette.ink,
    fontSize: 18,
  },
  filterIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
  },
  calibrationBanner: {
    marginTop: space.md,
    backgroundColor: palette.accentLight,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calibrationTitle: {
    ...typo.caption,
    color: palette.ink,
    fontWeight: '600',
  },
  calibrationProgress: {
    ...typo.caption,
    color: palette.accentDark,
    fontWeight: '700',
  },
  deckArea: {
    flex: 1,
    marginTop: space.md,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  loadingText: {
    ...typo.body,
    color: palette.inkMuted,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingVertical: space.md,
  },
  actionWrap: {
    borderRadius: radius.pill,
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  actionBtnPrimary: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.button,
  },
  fetchingMore: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: space.sm,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(28,28,28,0.24)',
  },
  sheetDismissLayer: {
    flex: 1,
  },
  sheet: {
    backgroundColor: palette.warmWhite,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    gap: space.md,
    maxHeight: '82%',
  },
  sheetImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: palette.warmWhiteDark,
  },
  sheetTitle: {
    ...typo.sectionHeader,
    color: palette.ink,
    fontSize: 17,
  },
  sheetBody: {
    ...typo.body,
    color: palette.inkLight,
  },
  piecesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  piecePill: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: palette.warmWhiteDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceText: {
    ...typo.caption,
    color: palette.ink,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: space.sm,
  },
  sheetAction: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
  },
  sheetActionPrimary: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  sheetActionText: {
    ...typo.caption,
    color: palette.ink,
    fontWeight: '600',
  },
  sheetActionPrimaryText: {
    ...typo.caption,
    color: palette.white,
    fontWeight: '600',
  },
});

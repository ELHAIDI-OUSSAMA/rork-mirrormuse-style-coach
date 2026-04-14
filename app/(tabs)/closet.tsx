import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Shirt, X, Palette, RotateCcw, Sparkles, UserRound, Tag, HandHeart, Archive } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { space, radius, palette, type as typo, motion, CHIP_HEIGHT } from '@/constants/theme';
import { AppHeader } from '@/components/AppHeader';
import { IconButton } from '@/components/IconButton';
import { useApp } from '@/contexts/AppContext';
import { ClosetItem, ClothingCategory, ProcessingStep } from '@/types';
import { retryProcessing } from '@/lib/processingQueue';
import { addImageToClosetPipeline } from '@/lib/closetPipeline';

const { width } = Dimensions.get('window');
const GAP = 14;
const NUM_COLUMNS = 2;
const ITEM_WIDTH = (width - space.screen * 2 - GAP) / NUM_COLUMNS;

const CATEGORY_FILTERS: { key: string; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'Tops', label: 'Tops' },
  { key: 'Outerwear', label: 'Outerwear' },
  { key: 'Bottoms', label: 'Bottoms' },
  { key: 'Shoes', label: 'Shoes' },
  { key: 'Accessories', label: 'Accessories' },
];

const LIFECYCLE_FILTERS: { key: 'Active' | 'Listed' | 'Donated' | 'Sold'; label: string }[] = [
  { key: 'Active', label: 'Active' },
  { key: 'Listed', label: 'Listed' },
  { key: 'Donated', label: 'Donated' },
  { key: 'Sold', label: 'Sold' },
];

const STEP_LABELS: Record<ProcessingStep, string> = {
  adding: 'Adding item...',
  scanning: 'Scanning...',
  removing_bg: 'Removing background...',
  creating_sticker: 'Creating sticker...',
  finalizing: 'Almost done...',
  retrying: 'Retrying...',
};

const getCategoryGroup = (category: ClothingCategory | undefined): string => {
  if (!category) return 'All';
  const tops = ['T-shirt', 'Shirt', 'Hoodie', 'Sweater'];
  const bottoms = ['Jeans', 'Pants', 'Shorts', 'Skirt', 'Dress'];
  const outerwear = ['Jacket', 'Blazer', 'Coat'];
  const shoes = ['Sneakers', 'Shoes', 'Boots'];
  const accessories = ['Bag', 'Belt', 'Watch', 'Accessory'];

  if (tops.includes(category)) return 'Tops';
  if (bottoms.includes(category)) return 'Bottoms';
  if (outerwear.includes(category)) return 'Outerwear';
  if (shoes.includes(category)) return 'Shoes';
  if (accessories.includes(category)) return 'Accessories';
  return 'All';
};

function isNewItem(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 3 * 24 * 60 * 60 * 1000;
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { themeColors } = useApp();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.filterChip,
          { backgroundColor: selected ? themeColors.chip.selected : themeColors.chip.unselected },
        ]}
        onPressIn={() =>
          Animated.spring(scaleAnim, {
            toValue: motion.pressScale,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 40,
            bounciness: 6,
          }).start()
        }
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.9}
      >
        <Text
          style={[
            styles.filterChipText,
            { color: selected ? themeColors.chip.selectedText : themeColors.chip.unselectedText },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ClosetTile({
  item,
  imageSource,
  fallbackSource,
  isNew,
  isSelected,
  isPending,
  isFailed,
  stepLabel,
  onPress,
  onDelete,
  onRetry,
  statusBadge,
}: {
  item: ClosetItem;
  imageSource: string;
  fallbackSource: string;
  isNew: boolean;
  isSelected: boolean;
  isPending: boolean;
  isFailed: boolean;
  stepLabel: string;
  onPress: () => void;
  onDelete: () => void;
  onRetry: () => void;
  statusBadge?: string;
}) {
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const hasPrimary = !!imageSource;
  const shouldUseFallback = !hasPrimary || primaryFailed;
  const displayUri = shouldUseFallback ? fallbackSource : imageSource;
  const hasImage = !!displayUri;
  const isSticker = !shouldUseFallback && hasPrimary;

  return (
    <View style={styles.gridCell}>
      <TouchableOpacity
        style={[styles.itemCard, isSticker && hasImage && !isPending && !isFailed && styles.itemCardStickerOnly]}
        onPress={onPress}
        onLongPress={onDelete}
        activeOpacity={0.92}
      >
        {hasImage ? (
          <View style={styles.itemImageWrap}>
            {isSticker && (
              <Image
                source={{ uri: displayUri }}
                style={styles.itemImageOutline}
                contentFit="contain"
                tintColor="#FFFFFF"
              />
            )}
            <Image
              source={{ uri: displayUri }}
              style={isSticker ? styles.itemImage : styles.itemImageFallback}
              contentFit={isSticker ? 'contain' : 'cover'}
              onError={() => {
                if (!primaryFailed) setPrimaryFailed(true);
              }}
            />
          </View>
        ) : (
          <View style={styles.missingStickerWrap}>
            <Shirt size={34} color={palette.inkMuted} />
          </View>
        )}

        {isPending && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="small" color="#FFF" />
            <Text style={styles.processingText}>{stepLabel}</Text>
          </View>
        )}

        {isFailed && (
          <View style={styles.failedOverlay}>
            <Text style={styles.failedText}>Failed</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
              <RotateCcw size={14} color="#FFF" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeLink} onPress={onDelete}>
              <Text style={styles.removeLinkText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}

        {isNew ? (
          <LinearGradient
            colors={['#F7B2E8', '#8FD5FA']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.newBadge}
          >
            <View style={styles.newBadgeInner}>
              <Text style={styles.newBadgeText}>New</Text>
            </View>
          </LinearGradient>
        ) : null}

        {statusBadge ? (
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{statusBadge}</Text>
          </View>
        ) : null}

        {isSelected && !isPending && !isFailed ? (
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
            <X size={14} color="#FFF" />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

export default function ClosetScreen() {
  const router = useRouter();
  const { closetItems, cleanupCandidates, closetValueInsights, updateClosetItem, addClosetItem, removeClosetItem, avatarProfile, getSellOpportunityForItem } = useApp();

  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedLifecycle, setSelectedLifecycle] = useState<'Active' | 'Listed' | 'Donated' | 'Sold'>('Active');
  const [selectedItem, setSelectedItem] = useState<ClosetItem | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [sheetItem, setSheetItem] = useState<ClosetItem | null>(null);
  const autoRetriedRef = useRef<Set<string>>(new Set());
  const actionSheetTranslateY = useRef(new Animated.Value(320)).current;
  const actionSheetBackdropOpacity = useRef(new Animated.Value(0)).current;

  const runPipelineForImage = useCallback(async (imageUri: string, source: 'closet_upload' | 'closet_camera') => {
    const stagingId = `closet_scan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const stagingItem: ClosetItem = {
      id: stagingId,
      imageUri,
      category: 'T-shirt',
      color: 'Unknown',
      styleTags: [],
      createdAt: new Date().toISOString(),
      source: 'manual',
      position: {
        x: Math.random() * 220 + 16,
        y: Math.random() * 300,
        rotation: (Math.random() - 0.5) * 16,
        scale: 0.85 + Math.random() * 0.25,
      },
      usageCount: 0,
      outlineEnabled: true,
      isProcessing: true,
      processingStatus: 'queued',
      processingStep: 'scanning',
    };
    addClosetItem(stagingItem);

    void (async () => {
      try {
        const pipelineResult = await addImageToClosetPipeline({
          source,
          imageUri,
          addClosetItem,
          onProgress: ({ stage, message }) => {
            console.log(`[Closet] pipeline progress (${stage}):`, message);
            const stepMap: Record<string, ProcessingStep> = {
              classifying: 'scanning',
              preprocess: 'scanning',
              detecting: 'scanning',
              fallback_detecting: 'scanning',
              creating_placeholders: 'creating_sticker',
              saving: 'finalizing',
              done: 'finalizing',
            };
            const step = stepMap[stage];
            if (step) {
              updateClosetItem(stagingId, { processingStep: step });
            }
          },
        });
        removeClosetItem(stagingId);
        if (pipelineResult.addedCount === 0) {
          console.log(`[Closet] No items added from ${source}`);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          console.log(`[Closet] Added ${pipelineResult.addedCount} items from ${source}`);
        }
      } catch (error) {
        console.log(`[Closet] ${source} pipeline failed:`, error);
        removeClosetItem(stagingId);
      }
    })();
  }, [addClosetItem, removeClosetItem, updateClosetItem]);

  const handleUploadFromGallery = useCallback(async () => {
    setShowAddSheet(false);
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (pickerResult.canceled || !pickerResult.assets[0]) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    runPipelineForImage(pickerResult.assets[0].uri, 'closet_upload');
  }, [runPipelineForImage]);

  const handleTakePhoto = useCallback(async () => {
    setShowAddSheet(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      console.log('[Closet] Camera permission denied');
      return;
    }
    const pickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (pickerResult.canceled || !pickerResult.assets[0]) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    runPipelineForImage(pickerResult.assets[0].uri, 'closet_camera');
  }, [runPipelineForImage]);

  const lifecycleFilteredItems = useMemo(() => {
    if (selectedLifecycle === 'Listed') return closetItems.filter((item) => item.status === 'listed_for_sale');
    if (selectedLifecycle === 'Donated') return closetItems.filter((item) => item.status === 'donated');
    if (selectedLifecycle === 'Sold') return closetItems.filter((item) => item.status === 'sold');
    return closetItems.filter((item) => item.status !== 'sold' && item.status !== 'donated' && item.status !== 'archived');
  }, [closetItems, selectedLifecycle]);

  const filteredItems = useMemo(() => {
    if (selectedFilter === 'All') return lifecycleFilteredItems;
    return lifecycleFilteredItems.filter((item) => getCategoryGroup(item.category) === selectedFilter);
  }, [lifecycleFilteredItems, selectedFilter]);

  const handleDelete = useCallback(
    (item: ClosetItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert('Delete Item', `Move this ${(item.category || 'item').toLowerCase()} to archived?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            updateClosetItem(item.id, {
              status: 'archived',
              lifecycleUpdatedAt: new Date().toISOString(),
            });
            setSelectedItem(null);
          },
        },
      ]);
    },
    [updateClosetItem]
  );

  const openItemActions = useCallback((item: ClosetItem) => {
    setSelectedItem(item);
    setSheetItem(item);
    setShowActionSheet(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.spring(actionSheetTranslateY, {
        toValue: 0,
        speed: 26,
        bounciness: 6,
        useNativeDriver: true,
      }),
      Animated.timing(actionSheetBackdropOpacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start();
  }, [actionSheetBackdropOpacity, actionSheetTranslateY]);

  const closeItemActions = useCallback(() => {
    Animated.parallel([
      Animated.timing(actionSheetTranslateY, {
        toValue: 320,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(actionSheetBackdropOpacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setShowActionSheet(false);
        setSheetItem(null);
      }
    });
  }, [actionSheetBackdropOpacity, actionSheetTranslateY]);

  const handleRetry = useCallback((item: ClosetItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.source === 'auto_extracted' && !item.outfitContext) {
      Alert.alert(
        'Retry unavailable',
        'This extracted item was created before the latest scan update. Please re-add from the original outfit photo.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (item.imageUri) {
      retryProcessing(item.id, item.imageUri, item.outfitContext, item.imageRemoteUrl);
    }
  }, []);

  // Auto-retry missing stickers so closet never falls back to full-photo rendering.
  React.useEffect(() => {
    for (const item of lifecycleFilteredItems) {
      const hasSticker = !!item.stickerPngUri;
      const hasSource = !!item.imageUri;
      const isProcessing = item.processingStatus === 'queued' || item.processingStatus === 'processing';
      if (hasSticker || !hasSource || isProcessing) continue;
      if (autoRetriedRef.current.has(item.id)) continue;

      autoRetriedRef.current.add(item.id);
      retryProcessing(
        item.id,
        item.imageUri,
        item.outfitContext,
        item.imageRemoteUrl,
        item.outfitContext ? 'EXTRACT_ITEM_STICKER' : 'REMOVE_BACKGROUND_SINGLE'
      );
    }
  }, [lifecycleFilteredItems]);

  const handleAddClothing = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddSheet(true);
  }, []);

  const handleCreateOutfit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const stickerItems = lifecycleFilteredItems.filter((item) => item.stickerPngUri);
    if (stickerItems.length < 2) {
      Alert.alert('Add More Items', 'You need at least 2 items to create outfits.', [{ text: 'OK' }]);
      return;
    }
    router.push('/outfit-builder' as never);
  }, [lifecycleFilteredItems, router]);

  const renderItem = useCallback(
    ({ item }: { item: ClosetItem }) => {
      const isSelected = selectedItem?.id === item.id;
      const status = item.processingStatus;
      const isPending = status === 'queued' || status === 'processing';
      const isFailed = status === 'failed';
      const imageSource = item.stickerPngUri || '';
      const fallbackSource = item.imageUri || '';
      const isNew = isNewItem(item.createdAt) && !isPending && !isFailed;
      const stepLabel = item.processingStep
        ? STEP_LABELS[item.processingStep]
        : status === 'queued'
          ? 'Queued...'
          : 'Processing...';
      const isSnoozed = !!item.cleanupDismissedUntil && new Date(item.cleanupDismissedUntil).getTime() > Date.now();
      const statusBadge =
        isSnoozed ? 'Snoozed' :
        item.status === 'listed_for_sale' ? 'Listed' :
        item.status === 'donated' ? 'Donated' :
        item.status === 'sold' ? 'Sold' :
        undefined;

      return (
        <ClosetTile
          item={item}
          imageSource={imageSource}
          fallbackSource={fallbackSource}
          isNew={isNew}
          isSelected={isSelected}
          isPending={isPending}
          isFailed={isFailed}
          stepLabel={stepLabel}
          onPress={() => openItemActions(item)}
          onDelete={() => openItemActions(item)}
          onRetry={() => handleRetry(item)}
          statusBadge={statusBadge}
        />
      );
    },
    [handleRetry, openItemActions, selectedItem]
  );

  const headerRight = (
    <>
      <IconButton icon={<Palette size={20} color={palette.ink} />} onPress={handleCreateOutfit} />
      <IconButton icon={<Plus size={22} color="#FFF" />} variant="filled" fillColor={palette.accent} onPress={handleAddClothing} />
    </>
  );
  const sheetOpportunity = sheetItem ? getSellOpportunityForItem(sheetItem.id) : undefined;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AppHeader title="My Closet" right={headerRight} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersRow}
        >
          {LIFECYCLE_FILTERS.map((filter) => {
            const isActive = selectedLifecycle === filter.key;
            const count =
              filter.key === 'Active'
                ? closetItems.filter((item) => item.status !== 'sold' && item.status !== 'donated' && item.status !== 'archived').length
                : filter.key === 'Listed'
                  ? closetItems.filter((item) => item.status === 'listed_for_sale').length
                  : filter.key === 'Donated'
                    ? closetItems.filter((item) => item.status === 'donated').length
                    : closetItems.filter((item) => item.status === 'sold').length;
            return (
              <FilterChip
                key={filter.key}
                label={`${filter.label} (${count})`}
                selected={isActive}
                onPress={() => setSelectedLifecycle(filter.key)}
              />
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersRow}
        >
          {CATEGORY_FILTERS.map((filter) => {
            const isActive = selectedFilter === filter.key;
            const count =
              filter.key === 'All'
                ? lifecycleFilteredItems.length
                : lifecycleFilteredItems.filter((i) => getCategoryGroup(i.category) === filter.key).length;
            const label = filter.key === 'All' ? `${filter.label} (${count})` : filter.label;
            return (
              <FilterChip
                key={filter.key}
                label={label}
                selected={isActive}
                onPress={() => setSelectedFilter(filter.key)}
              />
            );
          })}
        </ScrollView>

        {cleanupCandidates.length > 0 ? (
          <TouchableOpacity
            style={styles.cleanupInsightCard}
            activeOpacity={0.85}
            onPress={() => router.push('/closet-cleanup' as any)}
          >
            <View>
              <Text style={styles.cleanupInsightTitle}>
                {cleanupCandidates.length} item{cleanupCandidates.length > 1 ? 's' : ''} have not been worn in a while
              </Text>
              <Text style={styles.cleanupInsightSubtitle}>
                Would you like to keep it, sell it, or donate it?
              </Text>
            </View>
            <Text style={styles.cleanupInsightCta}>Review items</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.cleanupInsightCard}
          activeOpacity={0.85}
          onPress={() => router.push('/closet-value' as any)}
        >
          <View>
            <Text style={styles.cleanupInsightTitle}>Your wardrobe value ${closetValueInsights.totalClosetValue.toLocaleString()}</Text>
            <Text style={styles.cleanupInsightSubtitle}>See resale potential and top-value pieces</Text>
          </View>
          <Text style={styles.cleanupInsightCta}>View value</Text>
        </TouchableOpacity>

        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          key={NUM_COLUMNS}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[styles.gridContent, filteredItems.length === 0 && styles.gridContentEmpty]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Shirt size={48} color={palette.inkMuted} />
              </View>
              <Text style={styles.emptyTitle}>Your closet is looking empty</Text>
              <Text style={styles.emptySubtitle}>Start adding pieces to build your wardrobe</Text>
              <TouchableOpacity style={styles.emptyCta} onPress={handleAddClothing} activeOpacity={0.85}>
                <Text style={styles.emptyCtaText}>Add your first piece</Text>
              </TouchableOpacity>
            </View>
          }
        />

      </SafeAreaView>

      <Modal visible={showActionSheet} transparent animationType="none" onRequestClose={closeItemActions}>
        <Animated.View style={[styles.actionSheetBackdrop, { opacity: actionSheetBackdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeItemActions} />
          <Animated.View style={[styles.actionSheet, { transform: [{ translateY: actionSheetTranslateY }] }]}>
            <Text style={styles.actionSheetTitle}>Item Actions</Text>
            {sheetItem ? (
              <>
                <TouchableOpacity
                  style={styles.actionSheetRow}
                  onPress={() => {
                    closeItemActions();
                    router.push({ pathname: '/marketplace/create-listing', params: { closetItemId: sheetItem.id } } as any);
                  }}
                >
                  <Tag size={18} color={palette.secondary} />
                  <View style={styles.actionSheetTextWrap}>
                    <Text style={styles.actionSheetRowTitle}>List item on marketplace</Text>
                    <Text style={styles.actionSheetRowSubtitle}>
                      {sheetOpportunity?.demandLevel === 'high' ? 'High demand right now' : 'Publish this closet piece for buyers'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionSheetRow}
                  onPress={() => {
                    closeItemActions();
                    updateClosetItem(sheetItem.id, {
                      donationIntent: true,
                      status: sheetItem.status === 'active' ? 'cleanup_candidate' : sheetItem.status,
                      lifecycleUpdatedAt: new Date().toISOString(),
                    });
                    router.push({ pathname: '/donate-item', params: { closetItemId: sheetItem.id } } as any);
                  }}
                >
                  <HandHeart size={18} color={palette.success} />
                  <View style={styles.actionSheetTextWrap}>
                    <Text style={styles.actionSheetRowTitle}>Donate item</Text>
                    <Text style={styles.actionSheetRowSubtitle}>Give this item a second life</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionSheetRow}
                  onPress={() => {
                    closeItemActions();
                    router.push({ pathname: '/outfit-builder', params: { closetItemId: sheetItem.id } } as any);
                  }}
                >
                  <Sparkles size={18} color={palette.accentDark} />
                  <View style={styles.actionSheetTextWrap}>
                    <Text style={styles.actionSheetRowTitle}>Generate outfit using item</Text>
                    <Text style={styles.actionSheetRowSubtitle}>Create a look around this piece</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionSheetRow, styles.actionSheetRowDanger]}
                  onPress={() => {
                    closeItemActions();
                    handleDelete(sheetItem);
                  }}
                >
                  <Archive size={18} color={palette.error} />
                  <View style={styles.actionSheetTextWrap}>
                    <Text style={[styles.actionSheetRowTitle, { color: palette.error }]}>Delete item</Text>
                    <Text style={styles.actionSheetRowSubtitle}>Archive and remove from closet</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionSheetRow}
                  onPress={() => {
                    closeItemActions();
                    router.push({ pathname: '/digital-twin', params: { closetItemIds: sheetItem.id } } as any);
                  }}
                >
                  <UserRound size={18} color={palette.info} />
                  <View style={styles.actionSheetTextWrap}>
                    <Text style={styles.actionSheetRowTitle}>Try item on avatar</Text>
                    <Text style={styles.actionSheetRowSubtitle}>See this piece on your AI Twin</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : null}
          </Animated.View>
        </Animated.View>
      </Modal>

      <Modal visible={showAddSheet} transparent animationType="fade" onRequestClose={() => setShowAddSheet(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAddSheet(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add to Closet</Text>
            <TouchableOpacity style={styles.sheetOption} onPress={handleTakePhoto}>
              <Text style={styles.sheetOptionText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetOption} onPress={handleUploadFromGallery}>
              <Text style={styles.sheetOptionText}>Upload from gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetOption} onPress={() => { setShowAddSheet(false); router.push('/add-by-search' as never); }}>
              <Text style={styles.sheetOptionText}>Search to add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetOption} onPress={() => { setShowAddSheet(false); router.push('/add-by-scan' as never); }}>
              <Text style={styles.sheetOptionText}>Scan barcode</Text>
            </TouchableOpacity>
            {!avatarProfile || avatarProfile.status === 'none' || avatarProfile.status === 'error' ? (
              <TouchableOpacity style={styles.sheetOption} onPress={() => { setShowAddSheet(false); router.push('/ai-twin/setup' as never); }}>
                <Text style={styles.sheetOptionText}>Create AI Twin</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safeArea: { flex: 1 },

  filtersScroll: { flexGrow: 0, flexShrink: 0 },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.screen,
    paddingTop: 4,
    paddingBottom: 14,
    gap: 10,
  },
  filterChip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: { ...typo.chip },
  cleanupInsightCard: {
    marginHorizontal: space.screen,
    marginBottom: 12,
    borderRadius: radius.lg,
    backgroundColor: palette.secondaryLight,
    borderWidth: 1,
    borderColor: palette.borderLight,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cleanupInsightTitle: { ...typo.bodyMedium, color: palette.ink },
  cleanupInsightSubtitle: { ...typo.small, color: palette.inkMuted, marginTop: 2 },
  cleanupInsightCta: { ...typo.caption, color: palette.accentDark, fontWeight: '700' },

  gridContent: { paddingHorizontal: space.screen, paddingBottom: 100 },
  gridContentEmpty: { flexGrow: 1 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: GAP },
  gridCell: { width: ITEM_WIDTH },

  itemCard: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F1F1F5',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  itemCardStickerOnly: {
    backgroundColor: 'transparent',
  },
  itemImageWrap: {
    width: '88%',
    height: '88%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImageOutline: {
    position: 'absolute',
    width: '96%',
    height: '96%',
    opacity: 1,
    transform: [{ scale: 1.04 }],
  },
  itemImage: {
    width: '92%',
    height: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  itemImageFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  missingStickerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    gap: 8,
  },
  processingText: { fontSize: 12, fontWeight: '600', color: '#FFF' },

  failedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.50)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    gap: 8,
  },
  failedText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  retryBtnText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  removeLink: { marginTop: 2 },
  removeLinkText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textDecorationLine: 'underline' },

  newBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: radius.pill,
    padding: 1.5,
  },
  newBadgeInner: {
    backgroundColor: '#F7F8FA',
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1B2A3A',
  },
  statusBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    ...typo.small,
    fontSize: 10,
    lineHeight: 12,
    color: palette.inkLight,
  },
  deleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.error,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F1F1F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { ...typo.sectionHeader, color: palette.ink, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { ...typo.body, color: palette.inkMuted, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  emptyCta: { backgroundColor: palette.accent, paddingHorizontal: 24, paddingVertical: 14, borderRadius: radius.button },
  emptyCtaText: { ...typo.button, color: palette.white },

  actionSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: 24,
    gap: 4,
  },
  actionSheetTitle: { ...typo.sectionHeader, color: palette.ink, marginBottom: 4 },
  actionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  actionSheetRowDanger: {
    marginTop: 4,
    backgroundColor: palette.errorLight,
  },
  actionSheetTextWrap: { flex: 1 },
  actionSheetRowTitle: { ...typo.bodyMedium, color: palette.ink },
  actionSheetRowSubtitle: { ...typo.small, color: palette.inkMuted, marginTop: 1 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.md,
    gap: space.sm,
  },
  sheetTitle: { ...typo.sectionHeader, color: palette.ink, marginBottom: 4 },
  sheetOption: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.warmWhiteDark,
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  sheetOptionText: { ...typo.bodyMedium, color: palette.ink },
});

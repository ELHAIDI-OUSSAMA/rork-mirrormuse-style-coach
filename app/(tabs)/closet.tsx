import React, { useState, useMemo, useCallback, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Plus, Shirt, X, Palette, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  space,
  radius,
  palette,
  type as typo,
  motion,
  CHIP_HEIGHT,
} from '@/constants/theme';
import { AppHeader } from '@/components/AppHeader';
import { IconButton } from '@/components/IconButton';
import { useApp } from '@/contexts/AppContext';
import { ClosetItem, ClothingCategory, ProcessingStep } from '@/types';
import { retryProcessing } from '@/lib/processingQueue';

const { width } = Dimensions.get('window');
const GAP = 16;
const NUM_COLUMNS = 2;
const ITEM_WIDTH = (width - space.screen * 2 - GAP) / NUM_COLUMNS;

const CATEGORY_FILTERS: { key: string; label: string }[] = [
  { key: 'All', label: 'All items' },
  { key: 'Tops', label: 'T-shirts' },
  { key: 'Outerwear', label: 'Hoodies' },
  { key: 'Bottoms', label: 'Sweatshirts' },
  { key: 'Shoes', label: 'Jackets' },
  { key: 'Accessories', label: 'Pants' },
];

const getCategoryGroup = (category: ClothingCategory | undefined): string => {
  if (!category) return 'All';
  const tops = ['T-shirt', 'Shirt', 'Hoodie', 'Sweater'];
  const bottoms = ['Jeans', 'Pants', 'Shorts', 'Skirt'];
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

const STEP_LABELS: Record<ProcessingStep, string> = {
  adding: 'Adding item…',
  scanning: 'Scanning…',
  removing_bg: 'Removing background…',
  creating_sticker: 'Creating sticker…',
  finalizing: 'Almost done…',
};

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { themeColors } = useApp();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.filterChip,
          { backgroundColor: selected ? themeColors.chip.selected : themeColors.chip.unselected },
        ]}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: motion.pressScale, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start()}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        activeOpacity={0.85}
      >
        <Text style={[styles.filterChipText, { color: selected ? themeColors.chip.selectedText : themeColors.chip.unselectedText }]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ClosetScreen() {
  const router = useRouter();
  const { closetItems, removeClosetItem } = useApp();
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedItem, setSelectedItem] = useState<ClosetItem | null>(null);

  const filteredItems = useMemo(() => {
    if (selectedFilter === 'All') return closetItems;
    return closetItems.filter((item) => getCategoryGroup(item.category) === selectedFilter);
  }, [selectedFilter, closetItems]);

  const handleDelete = useCallback(
    (item: ClosetItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        'Remove Item',
        `Remove this ${(item.category || 'item').toLowerCase()} from your closet?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => { removeClosetItem(item.id); setSelectedItem(null); } },
        ]
      );
    },
    [removeClosetItem]
  );

  const handleRetry = useCallback(
    (item: ClosetItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (item.imageUri) {
        retryProcessing(item.id, item.imageUri);
      }
    },
    []
  );

  const handleAddClothing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/add-clothing' as any);
  };

  const handleCreateOutfit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const stickerItems = closetItems.filter((item) => item.stickerPngUri);
    if (stickerItems.length < 2) {
      Alert.alert('Add More Items', 'You need at least 2 items to create outfits.', [{ text: 'OK' }]);
      return;
    }
    router.push('/outfit-builder' as any);
  }, [closetItems, router]);

  const handleItemPress = useCallback(
    (item: ClosetItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedItem(selectedItem?.id === item.id ? null : item);
    },
    [selectedItem]
  );

  const renderItem = useCallback(
    ({ item }: { item: ClosetItem }) => {
      const isSelected = selectedItem?.id === item.id;
      const status = item.processingStatus;
      const isPending = status === 'queued' || status === 'processing';
      const isFailed = status === 'failed';
      const isDone = status === 'done' || (!status && item.stickerPngUri);
      const imageSource = item.stickerPngUri || item.imageUri;
      const isNew = isNewItem(item.createdAt) && !isPending && !isFailed;
      const stepLabel = item.processingStep ? STEP_LABELS[item.processingStep] : (status === 'queued' ? 'Queued…' : 'Processing…');

      return (
        <View style={styles.gridCell}>
          <TouchableOpacity
            style={[
              styles.itemCard,
              isDone && styles.itemCardTransparent,
            ]}
            onPress={() => handleItemPress(item)}
            onLongPress={() => handleDelete(item)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: imageSource }}
              style={styles.itemImage}
              contentFit="contain"
            />

            {isPending && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.processingText}>{stepLabel}</Text>
              </View>
            )}

            {isFailed && (
              <View style={styles.failedOverlay}>
                <Text style={styles.failedText}>Failed</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => handleRetry(item)}
                >
                  <RotateCcw size={14} color="#FFF" />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeLink}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={styles.removeLinkText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}

            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New</Text>
              </View>
            )}

            {isSelected && !isPending && !isFailed && (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                <X size={14} color="#FFF" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [selectedItem, handleItemPress, handleDelete, handleRetry]
  );

  const headerRight = (
    <>
      <IconButton icon={<Palette size={20} color={palette.ink} />} onPress={handleCreateOutfit} />
      <IconButton icon={<Plus size={22} color="#FFF" />} variant="filled" fillColor={palette.accent} onPress={handleAddClothing} />
    </>
  );

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
          {CATEGORY_FILTERS.map((filter) => {
            const isActive = selectedFilter === filter.key;
            const count = filter.key === 'All'
              ? closetItems.length
              : closetItems.filter((i) => getCategoryGroup(i.category) === filter.key).length;
            const label = isActive && filter.key === 'All' ? `${filter.label} (${count})` : filter.label;
            return (
              <FilterChip key={filter.key} label={label} selected={isActive} onPress={() => setSelectedFilter(filter.key)} />
            );
          })}
        </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safeArea: { flex: 1 },

  /* Filters */
  filtersScroll: { flexGrow: 0, flexShrink: 0 },
  filtersRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.screen, paddingBottom: 16, gap: 10 },
  filterChip: { height: CHIP_HEIGHT, paddingHorizontal: 16, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  filterChipText: { ...typo.chip },

  /* Grid */
  gridContent: { paddingHorizontal: space.screen, paddingBottom: 100 },
  gridContentEmpty: { flexGrow: 1 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: GAP },
  gridCell: { width: ITEM_WIDTH },

  /* Card */
  itemCard: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F3F3F5',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  itemCardTransparent: {
    backgroundColor: 'transparent',
  },
  itemImage: { width: '90%', height: '90%' },

  /* Processing overlay */
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    gap: 8,
  },
  processingText: { fontSize: 12, fontWeight: '600', color: '#FFF' },

  /* Failed overlay */
  failedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.50)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
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

  /* Badges */
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  newBadgeText: { fontSize: 10, fontWeight: '600', color: palette.inkLight },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.error,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Empty */
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 80 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: palette.warmWhiteDark, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { ...typo.sectionHeader, color: palette.ink, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { ...typo.body, color: palette.inkMuted, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  emptyCta: { backgroundColor: palette.accent, paddingHorizontal: 24, paddingVertical: 14, borderRadius: radius.button },
  emptyCtaText: { ...typo.button, color: palette.white },
});

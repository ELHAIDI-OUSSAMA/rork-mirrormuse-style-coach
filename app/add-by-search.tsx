import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Search,
  X,
  Clock,
  TrendingUp,
  Plus,
  Check,
  AlertCircle,
  Shirt,
  ChevronDown,
} from 'lucide-react-native';
import { palette, radius, shadow, space, type as typo, motion } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { ProductResult, searchProducts } from '@/lib/productSearch';
import { getRecentSearches, addRecentSearch, removeRecentSearch } from '@/lib/searchHistory';
import { trackSearchEvent } from '@/lib/searchAnalytics';
import { enqueueProcessing } from '@/lib/processingQueue';
import { TRENDING_SEARCHES } from '@/mocks/productCatalog';
import { ClosetItem, ClothingCategory, CLOTHING_CATEGORIES } from '@/types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_W - space.screen * 2 - CARD_GAP) / 2;

const CATEGORY_MAP: Record<string, ClothingCategory> = {
  sneakers: 'Sneakers',
  shoes: 'Shoes',
  boots: 'Boots',
  hoodie: 'Hoodie',
  't-shirt': 'T-shirt',
  shirt: 'Shirt',
  jeans: 'Jeans',
  pants: 'Pants',
  shorts: 'Shorts',
  jacket: 'Jacket',
  blazer: 'Blazer',
  coat: 'Coat',
  sweater: 'Sweater',
  dress: 'Dress',
  skirt: 'Skirt',
  suit: 'Suit',
  bag: 'Bag',
  belt: 'Belt',
  watch: 'Watch',
  accessory: 'Accessory',
};

function guessCategory(hint?: string): ClothingCategory {
  if (!hint) return 'T-shirt';
  const lower = hint.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return 'T-shirt';
}

function PressableCard({ children, onPress, style }: { children: React.ReactNode; onPress: () => void; style?: object }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPressIn={() => {
          Animated.spring(scaleAnim, { toValue: motion.pressScale, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
        }}
        onPressOut={() => {
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
        }}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function ResultCard({ item, onPress }: { item: ProductResult; onPress: () => void }) {
  return (
    <PressableCard onPress={onPress} style={styles.cardOuter}>
      <View style={styles.card}>
        <View style={styles.cardImageWrap}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cardImage}
            contentFit="cover"
            transition={200}
          />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardBrand} numberOfLines={1}>{item.brand}</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.cardMeta}>
            {item.colorHint ? <Text style={styles.cardColor}>{item.colorHint}</Text> : null}
            {item.colorHint && item.categoryHint ? <Text style={styles.cardDot}>·</Text> : null}
            {item.categoryHint ? <Text style={styles.cardCategory}>{item.categoryHint}</Text> : null}
          </View>
          {item.price ? (
            <Text style={styles.cardPrice}>${item.price}</Text>
          ) : null}
        </View>
      </View>
    </PressableCard>
  );
}

function SearchChip({ label, onPress, icon }: { label: string; onPress: () => void; icon?: React.ReactNode }) {
  return (
    <TouchableOpacity style={styles.chip} onPress={onPress} activeOpacity={0.8}>
      {icon}
      <Text style={styles.chipText} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function RemovableChip({ label, onPress, onRemove }: { label: string; onPress: () => void; onRemove: () => void }) {
  return (
    <View style={styles.recentChip}>
      <TouchableOpacity style={styles.recentChipBody} onPress={onPress} activeOpacity={0.8}>
        <Clock size={12} color={palette.inkMuted} />
        <Text style={styles.chipText} numberOfLines={1}>{label}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.recentChipRemove} onPress={onRemove} hitSlop={8}>
        <X size={12} color={palette.inkMuted} />
      </TouchableOpacity>
    </View>
  );
}

export default function AddBySearchScreen() {
  const router = useRouter();
  const { addClosetItem, closetItems } = useApp();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());

  const [editCategory, setEditCategory] = useState<ClothingCategory>('T-shirt');
  const [editColor, setEditColor] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editSize, setEditSize] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const detailTranslateY = useRef(new Animated.Value(SCREEN_H)).current;
  const detailBackdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    trackSearchEvent('search_to_add_opened');
    getRecentSearches().then(setRecentSearches);
  }, []);

  const duplicateImageUrls = useMemo(() => {
    const urls = new Set<string>();
    closetItems.forEach(item => {
      if (item.imageUri) urls.add(item.imageUri.toLowerCase());
      if (item.imageRemoteUrl) urls.add(item.imageRemoteUrl.toLowerCase());
    });
    return urls;
  }, [closetItems]);

  const isDuplicate = useCallback((imageUrl: string) => {
    return duplicateImageUrls.has(imageUrl.toLowerCase());
  }, [duplicateImageUrls]);

  const runSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) return;

    abortRef.current.cancelled = true;
    const thisSearch = { cancelled: false };
    abortRef.current = thisSearch;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    trackSearchEvent('search_query_submitted', { query: trimmed });
    const updatedRecent = await addRecentSearch(trimmed);
    setRecentSearches(updatedRecent);

    try {
      const items = await searchProducts(trimmed);
      if (thisSearch.cancelled) return;
      setResults(items);
      if (items.length === 0) {
        trackSearchEvent('search_empty_state_seen', { query: trimmed });
      }
    } catch (err) {
      if (thisSearch.cancelled) return;
      setError('Something went wrong. Please try again.');
      setResults([]);
    } finally {
      if (!thisSearch.cancelled) setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        runSearch(text);
      }, 400);
    } else {
      setResults([]);
      setHasSearched(false);
      setError(null);
    }
  }, [runSearch]);

  const handleSubmit = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(query);
  }, [query, runSearch]);

  const handleClearQuery = useCallback(() => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setError(null);
    inputRef.current?.focus();
  }, []);

  const openDetail = useCallback((product: ProductResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackSearchEvent('search_result_clicked', { productId: product.id, brand: product.brand, category: product.categoryHint });
    setSelectedProduct(product);
    setEditCategory(guessCategory(product.categoryHint));
    setEditColor(product.colorHint || '');
    setEditBrand(product.brand);
    setEditSize('');
    setShowDetail(true);
    Animated.parallel([
      Animated.spring(detailTranslateY, { toValue: 0, speed: 18, bounciness: 5, useNativeDriver: true }),
      Animated.timing(detailBackdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [detailBackdrop, detailTranslateY]);

  const closeDetail = useCallback(() => {
    Animated.parallel([
      Animated.timing(detailTranslateY, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }),
      Animated.timing(detailBackdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) {
        setShowDetail(false);
        setSelectedProduct(null);
      }
    });
  }, [detailBackdrop, detailTranslateY]);

  const handleAddToCloset = useCallback(() => {
    if (!selectedProduct || addingProduct) return;
    setAddingProduct(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const id = `closet_search_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const item: ClosetItem = {
      id,
      imageUri: selectedProduct.imageUrl,
      imageRemoteUrl: selectedProduct.imageUrl,
      category: editCategory,
      color: editColor || 'Unknown',
      styleTags: selectedProduct.tags || [],
      createdAt: new Date().toISOString(),
      source: 'search',
      usageCount: 0,
      brand: editBrand || selectedProduct.brand,
      size: editSize || undefined,
      price: selectedProduct.price,
      currency: selectedProduct.currency || 'USD',
      sourceUrl: selectedProduct.sourceUrl,
      isProcessing: true,
      processingStatus: 'queued',
      processingStep: 'adding',
    };

    const addResult = addClosetItem(item);
    if (addResult.added) {
      trackSearchEvent('search_item_added', {
        productId: selectedProduct.id,
        brand: selectedProduct.brand,
        category: editCategory,
      });
      setAddedProductIds(prev => new Set(prev).add(selectedProduct.id));
      enqueueProcessing(id, selectedProduct.imageUrl, undefined, selectedProduct.imageUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeDetail();
      setTimeout(() => setAddingProduct(false), 300);
    } else {
      trackSearchEvent('search_item_add_failed', { productId: selectedProduct.id, error: 'duplicate' });
      setAddingProduct(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [selectedProduct, addingProduct, editCategory, editColor, editBrand, editSize, addClosetItem, closeDetail]);

  const handleRecentSearch = useCallback((search: string) => {
    setQuery(search);
    runSearch(search);
  }, [runSearch]);

  const handleRemoveRecent = useCallback(async (search: string) => {
    const updated = await removeRecentSearch(search);
    setRecentSearches(updated);
  }, []);

  const handleTrendingSearch = useCallback((search: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery(search);
    runSearch(search);
  }, [runSearch]);

  const renderResult = useCallback(({ item }: { item: ProductResult }) => {
    const isAdded = addedProductIds.has(item.id);
    const isExistingDuplicate = isDuplicate(item.imageUrl);
    return (
      <View style={styles.cardContainer}>
        <ResultCard item={item} onPress={() => openDetail(item)} />
        {isAdded || isExistingDuplicate ? (
          <View style={styles.addedBadge}>
            <Check size={10} color="#FFF" />
            <Text style={styles.addedBadgeText}>{isExistingDuplicate && !isAdded ? 'In closet' : 'Added'}</Text>
          </View>
        ) : null}
      </View>
    );
  }, [addedProductIds, isDuplicate, openDetail]);

  const showIdleState = !hasSearched && !loading;
  const showEmpty = hasSearched && !loading && results.length === 0 && !error;
  const showError = !!error && !loading;
  const showResults = results.length > 0 && !loading;

  const selectedIsDuplicate = selectedProduct ? isDuplicate(selectedProduct.imageUrl) : false;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="search-back-btn">
            <ArrowLeft size={20} color={palette.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search to Add</Text>
          <View style={styles.backBtnSpacer} />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.inputWrap}>
            <Search size={16} color={palette.inkMuted} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={handleQueryChange}
              onSubmitEditing={handleSubmit}
              style={styles.input}
              placeholder='Try "Nike hoodie" or "black blazer"'
              placeholderTextColor={palette.inkMuted}
              returnKeyType="search"
              autoFocus
              autoCorrect={false}
              testID="search-input"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={handleClearQuery} hitSlop={12} testID="search-clear-btn">
                <X size={16} color={palette.inkMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={palette.accent} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : null}

        {showError ? (
          <View style={styles.centered}>
            <AlertCircle size={32} color={palette.error} />
            <Text style={styles.errorTitle}>Search failed</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => runSearch(query)}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {showEmpty ? (
          <View style={styles.centered}>
            <Shirt size={36} color={palette.inkMuted} />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>Try searching brand + item type</Text>
            <View style={styles.emptySuggestions}>
              {['Nike hoodie', "Levi's jeans", 'black blazer', 'white sneakers'].map(s => (
                <SearchChip key={s} label={s} onPress={() => handleTrendingSearch(s)} />
              ))}
            </View>
          </View>
        ) : null}

        {showResults ? (
          <FlatList
            data={results}
            renderItem={renderResult}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            testID="search-results-list"
          />
        ) : null}

        {showIdleState ? (
          <ScrollView style={styles.idleScroll} contentContainerStyle={styles.idleContent} showsVerticalScrollIndicator={false}>
            {recentSearches.length > 0 ? (
              <View style={styles.idleSection}>
                <View style={styles.idleSectionHeader}>
                  <Clock size={14} color={palette.inkLight} />
                  <Text style={styles.idleSectionTitle}>Recent searches</Text>
                </View>
                <View style={styles.chipGrid}>
                  {recentSearches.map(s => (
                    <RemovableChip
                      key={s}
                      label={s}
                      onPress={() => handleRecentSearch(s)}
                      onRemove={() => handleRemoveRecent(s)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
            <View style={styles.idleSection}>
              <View style={styles.idleSectionHeader}>
                <TrendingUp size={14} color={palette.accent} />
                <Text style={styles.idleSectionTitle}>Trending searches</Text>
              </View>
              <View style={styles.chipGrid}>
                {TRENDING_SEARCHES.map(s => (
                  <SearchChip key={s} label={s} onPress={() => handleTrendingSearch(s)} />
                ))}
              </View>
            </View>

            <View style={styles.idleTips}>
              <Text style={styles.idleTipsTitle}>Search tips</Text>
              <Text style={styles.idleTip}>• Brand + item type works best</Text>
              <Text style={styles.idleTip}>• Add color for better matches</Text>
              <Text style={styles.idleTip}>• Try common items like jeans, hoodie, sneakers</Text>
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>

      <Modal visible={showDetail} transparent animationType="none" onRequestClose={closeDetail}>
        <KeyboardAvoidingView style={styles.detailRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={[styles.detailBackdrop, { opacity: detailBackdrop }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeDetail} />
          </Animated.View>
          <Animated.View style={[styles.detailSheet, { transform: [{ translateY: detailTranslateY }] }]}>
            <View style={styles.detailHandle} />
            {selectedProduct ? (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <View style={styles.detailImageWrap}>
                  <Image
                    source={{ uri: selectedProduct.imageUrl }}
                    style={styles.detailImage}
                    contentFit="cover"
                    transition={200}
                  />
                </View>

                <View style={styles.detailBody}>
                  <Text style={styles.detailBrand}>{selectedProduct.brand}</Text>
                  <Text style={styles.detailTitle}>{selectedProduct.title}</Text>

                  <View style={styles.detailMetaRow}>
                    {selectedProduct.colorHint ? (
                      <View style={styles.detailMetaChip}>
                        <Text style={styles.detailMetaChipText}>{selectedProduct.colorHint}</Text>
                      </View>
                    ) : null}
                    {selectedProduct.categoryHint ? (
                      <View style={styles.detailMetaChip}>
                        <Text style={styles.detailMetaChipText}>{selectedProduct.categoryHint}</Text>
                      </View>
                    ) : null}
                    {selectedProduct.price ? (
                      <View style={[styles.detailMetaChip, styles.detailPriceChip]}>
                        <Text style={styles.detailPriceText}>${selectedProduct.price}</Text>
                      </View>
                    ) : null}
                  </View>

                  {selectedIsDuplicate ? (
                    <View style={styles.duplicateWarning}>
                      <AlertCircle size={14} color={palette.warning} />
                      <Text style={styles.duplicateWarningText}>
                        This looks similar to an item already in your closet
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.editSection}>
                    <Text style={styles.editLabel}>Category</Text>
                    <TouchableOpacity
                      style={styles.editPicker}
                      onPress={() => setShowCategoryPicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.editPickerText}>{editCategory}</Text>
                      <ChevronDown size={16} color={palette.inkMuted} />
                    </TouchableOpacity>

                    <View style={styles.editRow}>
                      <View style={styles.editField}>
                        <Text style={styles.editLabel}>Color</Text>
                        <TextInput
                          value={editColor}
                          onChangeText={setEditColor}
                          style={styles.editInput}
                          placeholder="e.g. Black"
                          placeholderTextColor={palette.inkFaint}
                        />
                      </View>
                      <View style={styles.editField}>
                        <Text style={styles.editLabel}>Size</Text>
                        <TextInput
                          value={editSize}
                          onChangeText={setEditSize}
                          style={styles.editInput}
                          placeholder="Optional"
                          placeholderTextColor={palette.inkFaint}
                        />
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.addButton, addingProduct && styles.addButtonDisabled]}
                    onPress={handleAddToCloset}
                    disabled={addingProduct}
                    activeOpacity={0.85}
                    testID="add-to-closet-btn"
                  >
                    {addingProduct ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Plus size={18} color="#FFF" />
                        <Text style={styles.addButtonText}>Add to Closet</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showCategoryPicker} transparent animationType="fade" onRequestClose={() => setShowCategoryPicker(false)}>
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setShowCategoryPicker(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select Category</Text>
            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {CLOTHING_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.pickerOption, editCategory === cat && styles.pickerOptionSelected]}
                  onPress={() => {
                    setEditCategory(cat);
                    setShowCategoryPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.pickerOptionText, editCategory === cat && styles.pickerOptionTextSelected]}>
                    {cat}
                  </Text>
                  {editCategory === cat ? <Check size={16} color={palette.accent} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.screen,
    paddingVertical: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    ...shadow.soft,
  },
  backBtnSpacer: { width: 38 },
  headerTitle: { ...typo.sectionHeader, color: palette.ink },

  searchRow: {
    paddingHorizontal: space.screen,
    marginBottom: 8,
  },
  inputWrap: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.borderLight,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...shadow.soft,
  },
  input: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  loadingText: { ...typo.caption, color: palette.inkMuted, marginTop: 4 },

  errorTitle: { ...typo.bodyMedium, color: palette.ink, marginTop: 8 },
  errorSubtitle: { ...typo.caption, color: palette.inkMuted, textAlign: 'center' },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: palette.accent,
    borderRadius: radius.button,
  },
  retryButtonText: { ...typo.button, color: '#FFF', fontSize: 14 },

  emptyTitle: { ...typo.bodyMedium, color: palette.ink, marginTop: 12 },
  emptySubtitle: { ...typo.caption, color: palette.inkMuted },
  emptySuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    justifyContent: 'center',
  },

  listContent: {
    paddingHorizontal: space.screen,
    paddingTop: 8,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  cardContainer: { width: CARD_WIDTH, position: 'relative' },
  cardOuter: { width: '100%' },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.soft,
  },
  cardImageWrap: {
    width: '100%',
    aspectRatio: 0.85,
    backgroundColor: palette.warmWhiteDark,
  },
  cardImage: { width: '100%', height: '100%' },
  cardBody: { padding: 10 },
  cardBrand: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: palette.accent,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  cardTitle: { ...typo.caption, color: palette.ink, marginTop: 2 },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  cardColor: { fontSize: 11, color: palette.inkMuted },
  cardDot: { fontSize: 11, color: palette.inkFaint },
  cardCategory: { fontSize: 11, color: palette.inkMuted },
  cardPrice: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: palette.ink,
    marginTop: 6,
  },
  addedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  addedBadgeText: { fontSize: 10, fontWeight: '600' as const, color: '#FFF' },

  idleScroll: { flex: 1 },
  idleContent: { paddingHorizontal: space.screen, paddingTop: 16, paddingBottom: 40 },
  idleSection: { marginBottom: 24 },
  idleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  idleSectionTitle: { ...typo.caption, color: palette.inkLight, fontWeight: '600' as const },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.borderLight,
  },
  chipText: { ...typo.small, color: palette.ink },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.borderLight,
    overflow: 'hidden',
  },
  recentChipBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 8,
  },
  recentChipRemove: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  idleTips: {
    backgroundColor: palette.accentLight,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 8,
  },
  idleTipsTitle: { ...typo.caption, color: palette.accentDark, fontWeight: '600' as const, marginBottom: 8 },
  idleTip: { fontSize: 13, color: palette.accentDark, lineHeight: 22 },

  detailRoot: { flex: 1 },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  detailSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_H * 0.88,
    backgroundColor: palette.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  detailHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  detailImageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: palette.warmWhiteDark,
  },
  detailImage: { width: '100%', height: '100%' },
  detailBody: {
    padding: space.screen,
    paddingBottom: 40,
  },
  detailBrand: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: palette.accent,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  detailTitle: {
    ...typo.sectionHeader,
    color: palette.ink,
    marginTop: 4,
    marginBottom: 10,
  },
  detailMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  detailMetaChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.warmWhiteDark,
  },
  detailMetaChipText: { ...typo.small, color: palette.inkLight },
  detailPriceChip: { backgroundColor: palette.accentLight },
  detailPriceText: { ...typo.small, color: palette.accentDark, fontWeight: '700' as const },

  duplicateWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.warningLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginBottom: 16,
  },
  duplicateWarningText: { ...typo.small, color: palette.ink, flex: 1 },

  editSection: { marginBottom: 20 },
  editLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: palette.inkLight,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  editPicker: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.warmWhite,
    borderWidth: 1,
    borderColor: palette.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  editPickerText: { ...typo.bodyMedium, color: palette.ink },
  editRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editField: { flex: 1 },
  editInput: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.warmWhite,
    borderWidth: 1,
    borderColor: palette.borderLight,
    paddingHorizontal: 14,
    color: palette.ink,
    ...typo.bodyMedium,
  },

  addButton: {
    height: 52,
    borderRadius: radius.button,
    backgroundColor: palette.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow.button,
  },
  addButtonDisabled: { opacity: 0.6 },
  addButtonText: { ...typo.button, color: '#FFF' },

  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: SCREEN_H * 0.5,
    paddingTop: space.md,
    paddingBottom: 30,
  },
  pickerTitle: { ...typo.sectionHeader, color: palette.ink, paddingHorizontal: space.screen, marginBottom: 8 },
  pickerScroll: { paddingHorizontal: space.screen },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.borderLight,
  },
  pickerOptionSelected: { backgroundColor: palette.accentLight, borderRadius: radius.md, paddingHorizontal: 8 },
  pickerOptionText: { ...typo.bodyMedium, color: palette.ink },
  pickerOptionTextSelected: { color: palette.accentDark, fontWeight: '600' as const },
});

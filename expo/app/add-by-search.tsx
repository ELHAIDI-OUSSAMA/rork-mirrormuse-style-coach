import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { ProductResult, searchProducts } from '@/lib/productSearch';
import { enqueueProcessing } from '@/lib/processingQueue';
import { ClothingCategory, ClosetItem } from '@/types';
import { palette, radius, shadow, space, type as typo } from '@/constants/theme';

const CATEGORY_MAP: Record<string, ClothingCategory> = {
  shirt: 'Shirt',
  't-shirt': 'T-shirt',
  tee: 'T-shirt',
  sweater: 'Sweater',
  hoodie: 'Hoodie',
  blazer: 'Blazer',
  jacket: 'Jacket',
  coat: 'Coat',
  jeans: 'Jeans',
  pants: 'Pants',
  trousers: 'Pants',
  shorts: 'Shorts',
  sneakers: 'Sneakers',
  shoes: 'Shoes',
  boots: 'Boots',
  bag: 'Bag',
  belt: 'Belt',
  watch: 'Watch',
};

function guessCategory(input?: string): ClothingCategory {
  const key = (input || '').toLowerCase();
  for (const token of Object.keys(CATEGORY_MAP)) {
    if (key.includes(token)) return CATEGORY_MAP[token];
  }
  return 'T-shirt';
}

function extractDemandMeta(query: string): {
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
} {
  const lower = query.toLowerCase();
  const knownColors = ['black', 'white', 'blue', 'brown', 'green', 'red', 'gray', 'grey', 'beige', 'pink'];
  const color = knownColors.find((value) => lower.includes(value));
  const sizeMatch = query.match(/\b(xxs|xs|s|m|l|xl|xxl|[0-9]{2})\b/i);
  const category = guessCategory(query);
  const brandToken = query
    .split(/\s+/)
    .find((token) => token.length > 2 && token[0] === token[0]?.toUpperCase());
  return {
    category,
    color,
    size: sizeMatch?.[0],
    brand: brandToken,
  };
}

export default function AddBySearchScreen() {
  const router = useRouter();
  const { addClosetItem, userId, trackMarketplaceSearch } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  const runSearch = async () => {
    if (!canSearch || loading) return;
    const trimmed = query.trim();
    const meta = extractDemandMeta(trimmed);
    trackMarketplaceSearch(trimmed, {
      category: meta.category,
      brand: meta.brand,
      size: meta.size,
      color: meta.color,
      userId: userId || undefined,
    });
    setLoading(true);
    const items = await searchProducts(trimmed);
    setResults(items);
    setLoading(false);
  };

  const handleAdd = (product: ProductResult) => {
    if (addingId) return;
    setAddingId(product.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const id = `closet_search_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const item: ClosetItem = {
      id,
      imageUri: product.imageUrl,
      imageRemoteUrl: product.imageUrl,
      category: guessCategory(product.categoryHint || product.title),
      color: product.colorHint || 'Unknown',
      styleTags: [],
      createdAt: new Date().toISOString(),
      source: 'search',
      usageCount: 0,
      brand: product.brand,
      price: product.price,
      currency: product.currency || 'USD',
      sourceUrl: product.sourceUrl,
      isProcessing: true,
      processingStatus: 'queued',
      processingStep: 'adding',
    };

    const addResult = addClosetItem(item);
    if (addResult.added) {
      enqueueProcessing(id, product.imageUrl, undefined, product.imageUrl);
      router.replace('/(tabs)/closet' as any);
      return;
    }

    setAddingId(null);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={palette.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>Search to Add</Text>
          <View style={styles.iconBtnSpacer} />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.inputWrap}>
            <Search size={16} color={palette.inkMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              style={styles.input}
              placeholder="Search clothing item"
              placeholderTextColor={palette.inkMuted}
              returnKeyType="search"
              onSubmitEditing={runSearch}
            />
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={runSearch} disabled={!canSearch || loading}>
            <Text style={styles.searchBtnText}>Go</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={palette.accent} />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.column}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => handleAdd(item)}>
                <Image source={{ uri: item.imageUrl }} style={styles.cardImage} contentFit="cover" />
                <Text numberOfLines={1} style={styles.brand}>{item.brand}</Text>
                <Text numberOfLines={2} style={styles.productTitle}>{item.title}</Text>
                <Text style={styles.price}>
                  {item.price ? `${item.currency || 'USD'} ${item.price}` : 'Price unavailable'}
                </Text>
                {addingId === item.id ? (
                  <View style={styles.inlineLoader}>
                    <ActivityIndicator size="small" color={palette.accent} />
                  </View>
                ) : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyText}>Search for products to add to your closet</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: space.screen,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    ...shadow.soft,
  },
  iconBtnSpacer: { width: 38, height: 38 },
  title: { ...typo.sectionHeader, color: palette.ink },
  searchRow: {
    paddingHorizontal: space.screen,
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.md,
  },
  inputWrap: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.borderLight,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, color: palette.ink, ...typo.body },
  searchBtn: {
    height: 46,
    borderRadius: radius.md,
    backgroundColor: palette.accent,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchBtnText: { ...typo.button, color: '#FFF' },
  listContent: { paddingHorizontal: space.screen, paddingBottom: 110 },
  column: { justifyContent: 'space-between', marginBottom: space.sm },
  card: {
    width: '48.5%',
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: space.sm,
    ...shadow.soft,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 0.82,
    borderRadius: radius.md,
    backgroundColor: palette.warmWhiteDark,
    marginBottom: space.sm,
  },
  brand: { ...typo.small, color: palette.inkMuted },
  productTitle: { ...typo.caption, color: palette.ink, marginTop: 2 },
  price: { ...typo.caption, color: palette.accent, marginTop: 4, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { ...typo.body, color: palette.inkMuted, textAlign: 'center' },
  inlineLoader: { marginTop: 8 },
});


import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { palette, radius, space, type as typo } from '@/constants/theme';
import { estimateResaleValue } from '@/lib/resaleEstimator';
import { MarketplaceListing } from '@/types';

const CONDITIONS: MarketplaceListing['condition'][] = ['new', 'excellent', 'good', 'fair'];

function autoTitle(color: string, category: string): string {
  return `${color} ${category}`.trim().replace(/\s+/g, ' ');
}

function autoDescription(title: string): string {
  return `${title} from my personal closet. Well kept and ready for a second life.`;
}

export default function CreateMarketplaceListingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ closetItemId?: string; suggestedPrice?: string; demandLevel?: 'low' | 'medium' | 'high' }>();
  const { getClosetItemById, createMarketplaceListing, userId, upsertSellerProfile } = useApp();
  const item = params.closetItemId ? getClosetItemById(params.closetItemId) : undefined;

  const seedTitle = useMemo(() => autoTitle(item?.color || '', item?.category || ''), [item?.category, item?.color]);
  const seedPrice = useMemo(
    () => String(Number(params.suggestedPrice) || item?.estimatedResaleValue || (item ? estimateResaleValue(item) : 20)),
    [item, params.suggestedPrice]
  );

  const [title, setTitle] = useState(seedTitle);
  const [description, setDescription] = useState(autoDescription(seedTitle));
  const [price, setPrice] = useState(seedPrice);
  const [condition, setCondition] = useState<MarketplaceListing['condition']>('good');
  const [brand, setBrand] = useState(item?.brand || '');
  const [size, setSize] = useState(item?.size || '');
  const [category, setCategory] = useState(item?.category || '');
  const [color, setColor] = useState(item?.color || '');

  if (!item) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <IconButton icon={<ArrowLeft size={18} color={palette.ink} />} onPress={() => router.back()} size={38} />
          </View>
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Item not found</Text>
          </Card>
        </SafeAreaView>
      </View>
    );
  }

  const submit = () => {
    const parsedPrice = Number(price);
    const sellerId = userId || `seller_${Date.now()}`;
    upsertSellerProfile({
      userId: sellerId,
      rating: 4.8,
      totalSales: 0,
      responseTime: '< 12h',
      joinDate: new Date().toISOString(),
    });
    createMarketplaceListing({
      sellerId,
      closetItemId: item.id,
      title: title.trim() || seedTitle,
      description: description.trim() || autoDescription(seedTitle),
      price: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : Number(seedPrice),
      currency: item.currency || 'USD',
      condition,
      category: category.trim() || item.category,
      brand: brand.trim() || undefined,
      size: size.trim() || undefined,
      color: color.trim() || item.color,
      images: [item.stickerPngUri || item.imageUri],
      status: 'active',
    });
    router.replace('/(tabs)/marketplace' as any);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={<ArrowLeft size={18} color={palette.ink} />} onPress={() => router.back()} size={38} />
          <Text style={styles.title}>Create Listing</Text>
          <View style={{ width: 38 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.previewCard}>
            <Image source={{ uri: item.stickerPngUri || item.imageUri }} style={styles.image} contentFit="cover" />
            <Text style={styles.previewLabel}>Prefilled from your closet item</Text>
            {params.demandLevel ? (
              <Text style={styles.demandHint}>
                Suggested price: ${seedPrice} · Demand level: {params.demandLevel.toUpperCase()}
              </Text>
            ) : null}
          </Card>

          <Card style={styles.formCard}>
            <Text style={styles.label}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Brown leather jacket" placeholderTextColor={palette.inkMuted} />
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.textArea]}
              multiline
              placeholder="Describe fit, condition, and any details."
              placeholderTextColor={palette.inkMuted}
            />
            <Text style={styles.label}>Price ({item.currency || 'USD'})</Text>
            <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={styles.input} placeholder="28" placeholderTextColor={palette.inkMuted} />

            <Text style={styles.label}>Condition</Text>
            <View style={styles.conditionRow}>
              {CONDITIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.conditionChip, condition === option && styles.conditionChipActive]}
                  onPress={() => setCondition(option)}
                >
                  <Text style={[styles.conditionChipText, condition === option && styles.conditionChipTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Brand</Text>
            <TextInput value={brand} onChangeText={setBrand} style={styles.input} placeholder="Brand" placeholderTextColor={palette.inkMuted} />
            <Text style={styles.label}>Size</Text>
            <TextInput value={size} onChangeText={setSize} style={styles.input} placeholder="Size" placeholderTextColor={palette.inkMuted} />
            <Text style={styles.label}>Category</Text>
            <TextInput value={category} onChangeText={setCategory} style={styles.input} placeholder="Category" placeholderTextColor={palette.inkMuted} />
            <Text style={styles.label}>Color</Text>
            <TextInput value={color} onChangeText={setColor} style={styles.input} placeholder="Color" placeholderTextColor={palette.inkMuted} />
          </Card>

          <Button title="Publish Listing" variant="secondary" size="large" onPress={submit} />
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
    justifyContent: 'space-between',
    paddingHorizontal: space.screen,
    paddingBottom: space.sm,
  },
  title: { ...typo.sectionHeader, color: palette.ink },
  content: { paddingHorizontal: space.screen, paddingBottom: 120, gap: space.md },
  previewCard: { alignItems: 'center', gap: space.sm },
  image: { width: '100%', height: 240, borderRadius: radius.lg, backgroundColor: palette.warmWhiteDark },
  previewLabel: { ...typo.small, color: palette.inkMuted },
  demandHint: { ...typo.caption, color: palette.secondaryDark },
  formCard: {},
  label: { ...typo.small, color: palette.inkMuted, marginBottom: 6, marginTop: 8 },
  input: {
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.borderLight,
    backgroundColor: palette.white,
    paddingHorizontal: 12,
    color: palette.ink,
    ...typo.body,
  },
  textArea: {
    minHeight: 92,
    height: 92,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  conditionRow: { flexDirection: 'row', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  conditionChip: {
    borderRadius: radius.pill,
    backgroundColor: palette.warmWhiteDark,
    borderWidth: 1,
    borderColor: palette.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  conditionChipActive: {
    backgroundColor: palette.accentLight,
    borderColor: palette.accent,
  },
  conditionChipText: { ...typo.caption, color: palette.inkLight, textTransform: 'capitalize' },
  conditionChipTextActive: { color: palette.accentDark },
  emptyCard: { margin: space.screen },
  emptyTitle: { ...typo.bodyMedium, color: palette.ink },
});

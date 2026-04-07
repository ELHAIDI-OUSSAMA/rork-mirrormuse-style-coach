import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Barcode, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { lookupBarcode } from '@/lib/barcodeLookup';
import { enqueueProcessing } from '@/lib/processingQueue';
import { ClothingCategory, ClosetItem } from '@/types';
import { palette, radius, shadow, space, type as typo } from '@/constants/theme';

const CATEGORY_BY_HINT: Record<string, ClothingCategory> = {
  't-shirt': 'T-shirt',
  shirt: 'Shirt',
  jeans: 'Jeans',
  pants: 'Pants',
  sneakers: 'Sneakers',
  shoes: 'Shoes',
  hoodie: 'Hoodie',
  sweater: 'Sweater',
  jacket: 'Jacket',
};

function resolveCategory(title: string): ClothingCategory {
  const lower = title.toLowerCase();
  const key = Object.keys(CATEGORY_BY_HINT).find((token) => lower.includes(token));
  return key ? CATEGORY_BY_HINT[key] : 'T-shirt';
}

export default function AddByScanScreen() {
  const router = useRouter();
  const { addClosetItem } = useApp();
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<Awaited<ReturnType<typeof lookupBarcode>>>(null);

  const canLookup = useMemo(() => barcode.trim().length >= 8, [barcode]);

  const onLookup = async () => {
    if (!canLookup) return;
    setLoading(true);
    const match = await lookupBarcode(barcode.trim());
    setProduct(match);
    setLoading(false);
    if (!match) {
      Alert.alert('No product found', 'Try another barcode or use Search to add.');
    }
  };

  const onAdd = () => {
    if (!product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const id = `closet_scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const item: ClosetItem = {
      id,
      imageUri: product.imageUrl,
      imageRemoteUrl: product.imageUrl,
      category: resolveCategory(product.title),
      color: product.colorHint || 'Unknown',
      styleTags: [],
      createdAt: new Date().toISOString(),
      source: 'barcode',
      usageCount: 0,
      brand: product.brand,
      price: product.price,
      currency: product.currency || 'USD',
      sourceUrl: product.sourceUrl,
      upc: barcode.trim(),
      isProcessing: true,
      processingStatus: 'queued',
      processingStep: 'adding',
    };
    const result = addClosetItem(item);
    if (result.added) {
      enqueueProcessing(id, product.imageUrl, undefined, product.imageUrl);
      router.replace('/(tabs)/closet' as any);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={palette.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>Scan Barcode</Text>
          <View style={styles.iconSpacer} />
        </View>

        <View style={styles.scannerMock}>
          <Barcode size={28} color={palette.inkMuted} />
          <Text style={styles.scannerText}>Scan UPC / EAN or enter code manually</Text>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={barcode}
            onChangeText={setBarcode}
            style={styles.input}
            keyboardType="number-pad"
            placeholder="Enter barcode"
            placeholderTextColor={palette.inkMuted}
          />
          <TouchableOpacity style={styles.lookupBtn} onPress={onLookup} disabled={!canLookup || loading}>
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Search size={16} color="#FFF" />}
          </TouchableOpacity>
        </View>

        {product ? (
          <View style={styles.resultCard}>
            <Image source={{ uri: product.imageUrl }} style={styles.resultImage} contentFit="cover" />
            <Text style={styles.brand}>{product.brand}</Text>
            <Text style={styles.productTitle}>{product.title}</Text>
            <Text style={styles.price}>{product.currency || 'USD'} {product.price || '--'}</Text>
            <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
              <Text style={styles.addBtnText}>Add to Closet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.fallbackRow}>
            <TouchableOpacity style={styles.altBtn} onPress={() => router.push('/add-by-search' as any)}>
              <Text style={styles.altBtnText}>Search instead</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.altBtn} onPress={() => router.push('/add-clothing' as any)}>
              <Text style={styles.altBtnText}>Add photo</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safeArea: { flex: 1, paddingHorizontal: space.screen },
  header: {
    paddingVertical: space.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  iconSpacer: { width: 38, height: 38 },
  title: { ...typo.sectionHeader, color: palette.ink },
  scannerMock: {
    marginTop: space.md,
    height: 180,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.borderLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.white,
  },
  scannerText: { ...typo.body, color: palette.inkMuted },
  inputRow: { marginTop: space.lg, flexDirection: 'row', gap: space.sm },
  input: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.borderLight,
    paddingHorizontal: space.md,
    ...typo.body,
    color: palette.ink,
  },
  lookupBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCard: {
    marginTop: space.xl,
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.soft,
  },
  resultImage: { width: '100%', height: 220, borderRadius: radius.md, backgroundColor: palette.warmWhiteDark },
  brand: { ...typo.caption, color: palette.inkMuted, marginTop: space.sm },
  productTitle: { ...typo.bodyMedium, color: palette.ink, marginTop: 2 },
  price: { ...typo.body, color: palette.accent, marginTop: 4, fontWeight: '700' },
  addBtn: {
    marginTop: space.md,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { ...typo.button, color: '#FFF' },
  fallbackRow: { marginTop: space.xl, gap: space.sm },
  altBtn: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  altBtnText: { ...typo.bodyMedium, color: palette.ink },
});


import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Bookmark, Sparkles, Shirt } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { palette, radius, space, type as typo } from '@/constants/theme';
import { ClothingCategory, ClosetItem, ImportedOutfit } from '@/types';
import { trackSocialImportEvent } from '@/lib/socialImportEntry';

function regionLabel(region: string): string {
  if (region === 'upper_outer') return 'Outer layer';
  if (region === 'upper_inner') return 'Top';
  if (region === 'lower') return 'Bottom';
  if (region === 'feet') return 'Footwear';
  if (region === 'accessory') return 'Accessories';
  return region;
}

function mapToClosetCategory(subcategory: string): ClothingCategory {
  const value = subcategory.toLowerCase();
  if (value.includes('jacket')) return 'Jacket';
  if (value.includes('coat')) return 'Coat';
  if (value.includes('blazer')) return 'Blazer';
  if (value.includes('hoodie')) return 'Hoodie';
  if (value.includes('sweater')) return 'Sweater';
  if (value.includes('shirt') || value.includes('t-shirt')) return 'Shirt';
  if (value.includes('jean')) return 'Jeans';
  if (value.includes('pants') || value.includes('trouser')) return 'Pants';
  if (value.includes('short')) return 'Shorts';
  if (value.includes('sneaker')) return 'Sneakers';
  if (value.includes('boot')) return 'Boots';
  if (value.includes('shoe') || value.includes('loafer')) return 'Shoes';
  if (value.includes('bag')) return 'Bag';
  if (value.includes('belt')) return 'Belt';
  if (value.includes('watch')) return 'Watch';
  return 'Accessory';
}

export default function ImportedOutfitScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sourceUrl?: string;
    mediaUrl?: string;
    postUrl?: string;
    thumbnailUrl?: string;
    importedOutfitId?: string;
    importSource?: 'link' | 'screenshot' | string;
  }>();

  const {
    closetItems,
    addClosetItems,
    importOutfitFromShare,
    saveImportedOutfit,
    getImportedOutfitById,
  } = useApp();

  const [importedOutfit, setImportedOutfit] = useState<ImportedOutfit | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchedVisible, setMatchedVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        if (params.importedOutfitId) {
          const existing = getImportedOutfitById(String(params.importedOutfitId));
          if (existing && mounted) {
            setImportedOutfit(existing);
            return;
          }
        }
        if (!params.sourceUrl) {
          if (mounted) Alert.alert('Missing shared link', 'Please share a valid social post link.');
          return;
        }
        const imported = await importOutfitFromShare({
          sourceUrl: String(params.sourceUrl),
          mediaUrl: params.mediaUrl ? String(params.mediaUrl) : undefined,
          postUrl: params.postUrl ? String(params.postUrl) : undefined,
          thumbnailUrl: params.thumbnailUrl ? String(params.thumbnailUrl) : undefined,
        });
        if (mounted) {
          setImportedOutfit(imported);
          if (params.importSource === 'screenshot') {
            trackSocialImportEvent('import_screenshot_success', { sourcePlatform: imported.sourcePlatform });
          } else {
            trackSocialImportEvent('import_link_success', { sourcePlatform: imported.sourcePlatform });
          }
        }
      } catch (error) {
        if (mounted) {
          if (params.importSource === 'screenshot') {
            trackSocialImportEvent('import_link_failed', { source: 'screenshot', error: String(error) });
          } else {
            trackSocialImportEvent('import_link_failed', { source: 'link', error: String(error) });
          }
          Alert.alert('Import failed', error instanceof Error ? error.message : 'Could not import this outfit.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [
    getImportedOutfitById,
    importOutfitFromShare,
    params.importedOutfitId,
    params.mediaUrl,
    params.postUrl,
    params.sourceUrl,
    params.thumbnailUrl,
    params.importSource,
  ]);

  const matches = useMemo(() => {
    if (!importedOutfit) return { own: [], missing: [] as ImportedOutfit['detectedItems'] };
    const own: { itemId: string; label: string }[] = [];
    const missing: ImportedOutfit['detectedItems'] = [];
    for (const detected of importedOutfit.detectedItems) {
      const found = closetItems.find((item) => {
        const sameCategory = item.category.toLowerCase() === detected.subcategory.toLowerCase();
        const sameColor = item.color.toLowerCase() === detected.color.toLowerCase();
        return sameCategory || sameColor;
      });
      if (found) {
        own.push({ itemId: found.id, label: `${found.color} ${found.category}` });
      } else {
        missing.push(detected);
      }
    }
    return { own, missing };
  }, [closetItems, importedOutfit]);

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={palette.accent} />
            <Text style={styles.loadingText}>Importing outfit...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!importedOutfit) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <IconButton icon={<ArrowLeft size={18} color={palette.ink} />} onPress={() => router.back()} size={38} />
          </View>
          <Card style={{ marginHorizontal: space.screen }}>
            <Text style={styles.loadingText}>No imported outfit found.</Text>
          </Card>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={<ArrowLeft size={18} color={palette.ink} />} onPress={() => router.back()} size={38} />
          <Text style={styles.title}>Imported Outfit</Text>
          <View style={{ width: 38 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card>
            <Image source={{ uri: importedOutfit.imageUri }} style={styles.heroImage} contentFit="cover" />
            <Text style={styles.sourceText}>
              Source: {importedOutfit.sourcePlatform.toUpperCase()} · {new Date(importedOutfit.createdAt).toLocaleDateString()}
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Detected clothing items</Text>
            {importedOutfit.detectedItems.map((item, index) => (
              <View key={`${item.region}-${item.subcategory}-${index}`} style={styles.itemRow}>
                <Shirt size={14} color={palette.inkMuted} />
                <Text style={styles.itemLabel}>{regionLabel(item.region)} · {item.color} {item.subcategory}</Text>
              </View>
            ))}
          </Card>

          <Card variant="flat">
            <Text style={styles.sectionTitle}>Closet matching</Text>
            <Text style={styles.matchTitle}>Items you own</Text>
            {matches.own.length > 0 ? matches.own.map((row) => (
              <Text key={row.itemId} style={styles.matchText}>• {row.label}</Text>
            )) : <Text style={styles.matchText}>No direct matches yet</Text>}
            <Text style={[styles.matchTitle, { marginTop: 8 }]}>Items you don't own</Text>
            {matches.missing.length > 0 ? matches.missing.map((row, idx) => (
              <Text key={`${row.region}-${idx}`} style={styles.matchText}>• {row.color} {row.subcategory}</Text>
            )) : <Text style={styles.matchText}>You already have strong coverage</Text>}
          </Card>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.outlineBtn]}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                saveImportedOutfit(importedOutfit);
                trackSocialImportEvent('imported_outfit_saved', {
                  sourcePlatform: importedOutfit.sourcePlatform,
                  importedOutfitId: importedOutfit.id,
                });
                Alert.alert('Saved', 'This imported outfit is now in your Saved Inspirations collection.');
              }}
            >
              <Bookmark size={16} color={palette.accentDark} />
              <Text style={styles.outlineBtnText}>Save inspiration</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                trackSocialImportEvent('imported_outfit_build_similar', {
                  sourcePlatform: importedOutfit.sourcePlatform,
                  importedOutfitId: importedOutfit.id,
                });
                const firstMatch = matches.own[0]?.itemId;
                if (firstMatch) {
                  router.push({ pathname: '/outfit-builder', params: { closetItemId: firstMatch } } as any);
                  return;
                }
                router.push('/outfit-builder' as any);
              }}
            >
              <Sparkles size={16} color="#FFF" />
              <Text style={styles.actionBtnText}>Build similar outfit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.outlineBtn]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                trackSocialImportEvent('imported_outfit_match_closet', {
                  sourcePlatform: importedOutfit.sourcePlatform,
                  importedOutfitId: importedOutfit.id,
                });
                setMatchedVisible(true);
              }}
            >
              <Text style={styles.outlineBtnText}>Match with my closet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.outlineBtn]}
              onPress={() => {
                const mappedItems: ClosetItem[] = importedOutfit.detectedItems.map((detected, index) => ({
                  id: `imported_detected_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
                  imageUri: importedOutfit.imageUri,
                  category: mapToClosetCategory(detected.subcategory),
                  color: detected.color || 'Unknown',
                  styleTags: ['imported-outfit'],
                  createdAt: new Date().toISOString(),
                  source: 'manual',
                  usageCount: 0,
                  status: 'active',
                }));
                const result = addClosetItems(mappedItems);
                Alert.alert(
                  'Added to closet',
                  result.added > 0
                    ? `${result.added} detected item${result.added > 1 ? 's were' : ' was'} added to your closet.`
                    : 'No new items were added because similar pieces already exist.'
                );
              }}
            >
              <Text style={styles.outlineBtnText}>Add detected items to closet</Text>
            </TouchableOpacity>
          </View>

          {matchedVisible ? (
            <Card style={styles.matchResultCard}>
              <Text style={styles.matchTitle}>Match summary</Text>
              <Text style={styles.matchText}>
                {matches.own.length} matched piece{matches.own.length === 1 ? '' : 's'} · {matches.missing.length} gap piece{matches.missing.length === 1 ? '' : 's'}
              </Text>
            </Card>
          ) : null}
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
  heroImage: {
    width: '100%',
    height: 320,
    borderRadius: radius.lg,
    backgroundColor: palette.warmWhiteDark,
  },
  sourceText: { ...typo.small, color: palette.inkMuted, marginTop: 8 },
  sectionTitle: { ...typo.bodyMedium, color: palette.ink, marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  itemLabel: { ...typo.body, color: palette.inkLight },
  actions: { gap: 10 },
  actionBtn: {
    height: 46,
    borderRadius: radius.md,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnText: { ...typo.button, color: '#FFF' },
  outlineBtn: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.borderLight,
  },
  outlineBtnText: { ...typo.bodyMedium, color: palette.accentDark },
  matchTitle: { ...typo.caption, color: palette.ink, marginBottom: 4 },
  matchText: { ...typo.body, color: palette.inkMuted, marginBottom: 2 },
  matchResultCard: { backgroundColor: palette.secondaryLight },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { ...typo.body, color: palette.inkMuted, textAlign: 'center' },
});

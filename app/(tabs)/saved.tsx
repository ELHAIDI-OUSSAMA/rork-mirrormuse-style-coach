import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Bookmark,
  Palette,
  Heart,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  space,
  radius,
  shadow,
  palette,
  type as typo,
  CHIP_HEIGHT,
} from '@/constants/theme';
import { AppHeader } from '@/components/AppHeader';
import { useApp } from '@/contexts/AppContext';
import { LookAnalysis, ComposedOutfit, SavedInspiration } from '@/types';

const { width } = Dimensions.get('window');
const PADDING = space.screen;
const GAP = 14;
const NUM_COLUMNS = 2;
const ITEM_WIDTH = (width - PADDING * 2 - GAP) / NUM_COLUMNS;

const TAB_FILTERS = [
  { key: 'looks', label: 'Looks' },
  { key: 'outfits', label: 'Outfits' },
  { key: 'inspo', label: 'Inspo' },
];


export default function SavedScreen() {
  const router = useRouter();
  const {
    savedLooks,
    removeLook,
    savedInspirationItems,
    removeInspirationItem,
    composedOutfits,
    removeComposedOutfit,
    getClosetItemById,
  } = useApp();
  const [activeTab, setActiveTab] = useState<'looks' | 'outfits' | 'inspo'>('looks');
  const filteredLooks = useMemo(() => savedLooks, [savedLooks]);

  const getTabCount = (key: string) => {
    if (key === 'looks') return savedLooks.length;
    if (key === 'outfits') return composedOutfits.length;
    if (key === 'inspo') return savedInspirationItems.length;
    return 0;
  };

  const handleDeleteLook = (look: LookAnalysis) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Remove Look', 'Remove this saved look?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeLook(look.id) },
    ]);
  };

  const handleDeleteOutfit = (outfit: ComposedOutfit) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete Outfit', 'Delete this outfit?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeComposedOutfit(outfit.id) },
    ]);
  };

  const handleOpenLook = (look: LookAnalysis) => {
    router.push({ pathname: '/look/[id]' as any, params: { id: look.id } });
  };

  const handleDeleteInspo = useCallback((inspo: SavedInspiration) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Remove Inspiration', 'Remove this saved inspiration?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeInspirationItem(inspo.id) },
    ]);
  }, [removeInspirationItem]);

  /* ── Render Cards ── */
  const renderLookCard = ({ item: look }: { item: LookAnalysis }) => (
    <View style={s.gridCell}>
      <TouchableOpacity
        style={s.card}
        onPress={() => handleOpenLook(look)}
        onLongPress={() => handleDeleteLook(look)}
        activeOpacity={0.85}
      >
        <Image source={{ uri: look.imageUri }} style={s.cardImage} contentFit="cover" />
        <View style={s.scoreBadge}>
          <Text style={s.scoreBadgeText}>{look.results.fitScore.toFixed(1)}</Text>
        </View>
        {look.vibe && (
          <View style={s.vibePill}>
            <Text style={s.vibePillText}>{look.vibe}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderOutfitCard = ({ item: outfit }: { item: ComposedOutfit }) => (
    <View style={s.gridCell}>
      <TouchableOpacity
        style={s.card}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: '/outfit-view' as any, params: { id: outfit.id } });
        }}
        onLongPress={() => handleDeleteOutfit(outfit)}
        activeOpacity={0.85}
      >
        <View style={s.outfitPreview}>
          {outfit.stickers.slice(0, 4).map((sticker, idx) => {
            const closetItem = getClosetItemById(sticker.closetItemId);
            if (!closetItem?.stickerPngUri) return null;
            return (
              <View
                key={`${outfit.id}-${sticker.closetItemId}-${idx}`}
                style={[
                  s.outfitThumb,
                  {
                    left: `${10 + (idx % 2) * 42}%` as any,
                    top: `${8 + Math.floor(idx / 2) * 40}%` as any,
                    transform: [{ rotate: `${sticker.rotation * 0.5}deg` }, { scale: 0.9 }],
                  },
                ]}
              >
                <Image source={{ uri: closetItem.stickerPngUri }} style={s.outfitThumbImg} contentFit="contain" />
              </View>
            );
          })}
        </View>
        <View style={s.countPill}>
          <Text style={s.countPillText}>{outfit.stickers.length} pcs</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderInspoCard = ({ item: inspo }: { item: SavedInspiration }) => (
    <View style={s.gridCell}>
      <TouchableOpacity
        style={s.card}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onLongPress={() => handleDeleteInspo(inspo)}
        activeOpacity={0.85}
      >
        <Image source={{ uri: inspo.thumbnailUrl }} style={s.cardImage} contentFit="cover" />
        {inspo.styleTags[0] && (
          <View style={s.vibePill}>
            <Text style={s.vibePillText}>{inspo.styleTags[0]}</Text>
          </View>
        )}
        <View style={s.inspoSourceBadge}>
          <Text style={s.inspoSourceText}>
            {inspo.source === 'pexels' ? 'Pexels' : 'Unsplash'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.container}>
      <SafeAreaView style={s.safeArea} edges={['top']}>
        <AppHeader title="Saved" />

        {/* Tab chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersScroll} contentContainerStyle={s.filtersRow}>
          {TAB_FILTERS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = getTabCount(tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s.filterChip, isActive && s.filterChipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab.key as any);
                }}
                activeOpacity={0.7}
              >
                <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>
                  {tab.label}{isActive ? ` (${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Content */}
        {activeTab === 'looks' ? (
          <FlatList
            data={filteredLooks}
            renderItem={renderLookCard}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            key="looks-grid"
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={s.columnWrapper}
            contentContainerStyle={[s.gridContent, filteredLooks.length === 0 && s.gridContentEmpty]}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <View style={s.emptyIcon}><Bookmark size={40} color={palette.inkMuted} /></View>
                <Text style={s.emptyTitle}>No saved looks yet</Text>
                <Text style={s.emptySubtitle}>Scan an outfit and save it to build your collection</Text>
              </View>
            }
          />
        ) : activeTab === 'outfits' ? (
          <FlatList
            data={composedOutfits}
            renderItem={renderOutfitCard}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            key="outfits-grid"
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={s.columnWrapper}
            contentContainerStyle={[s.gridContent, composedOutfits.length === 0 && s.gridContentEmpty]}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <View style={s.emptyIcon}><Palette size={40} color={palette.inkMuted} /></View>
                <Text style={s.emptyTitle}>No outfits created</Text>
                <Text style={s.emptySubtitle}>Go to Closet and tap Create Outfit to compose your first look</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={savedInspirationItems}
            renderItem={renderInspoCard}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            key="inspo-grid"
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={s.columnWrapper}
            contentContainerStyle={[s.gridContent, savedInspirationItems.length === 0 && s.gridContentEmpty]}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <View style={s.emptyIcon}><Heart size={40} color={palette.inkMuted} /></View>
                <Text style={s.emptyTitle}>No saved inspirations</Text>
                <Text style={s.emptySubtitle}>Browse the Inspiration feed and tap the bookmark to save looks you love</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safeArea: { flex: 1 },

  filtersScroll: { flexGrow: 0, flexShrink: 0 },
  filtersRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PADDING, paddingBottom: space.sm, gap: space.sm },
  filterChip: {
    height: CHIP_HEIGHT, paddingHorizontal: space.lg, borderRadius: radius.pill,
    backgroundColor: palette.warmWhiteDark, alignItems: 'center', justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: palette.accent },
  filterChipText: { ...typo.chip, color: palette.inkLight },
  filterChipTextActive: { ...typo.chip, color: palette.white },


  gridContent: { paddingHorizontal: PADDING, paddingBottom: 100 },
  gridContentEmpty: { flexGrow: 1 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: GAP },
  gridCell: { width: ITEM_WIDTH },

  card: {
    width: '100%', aspectRatio: 0.75, backgroundColor: palette.white,
    borderRadius: radius.card, overflow: 'hidden', ...shadow.card,
  },
  cardImage: { width: '100%', height: '100%' },

  scoreBadge: {
    position: 'absolute', top: space.sm, left: space.sm,
    backgroundColor: palette.white, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.pill,
  },
  scoreBadgeText: { ...typo.caption, fontWeight: '700', color: palette.ink },

  vibePill: {
    position: 'absolute', bottom: space.sm, left: space.sm,
    backgroundColor: 'rgba(44, 40, 37, 0.6)', paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill,
  },
  vibePillText: { ...typo.small, fontWeight: '600', color: palette.white },

  inspoSourceBadge: {
    position: 'absolute', top: space.sm, right: space.sm,
    backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
  },
  inspoSourceText: { ...typo.small, color: palette.inkMuted, fontSize: 10 },

  outfitPreview: { width: '100%', height: '100%', backgroundColor: palette.warmWhiteDark, position: 'relative' },
  outfitThumb: { position: 'absolute', width: '40%', height: '40%' },
  outfitThumbImg: { width: '100%', height: '100%' },
  countPill: {
    position: 'absolute', top: space.sm, right: space.sm,
    backgroundColor: palette.white, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.pill,
  },
  countPillText: { ...typo.small, fontWeight: '600', color: palette.ink },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: space.xxl, paddingTop: 80,
  },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: palette.warmWhiteDark, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg,
  },
  emptyTitle: { ...typo.sectionHeader, color: palette.ink, marginBottom: space.sm, textAlign: 'center' },
  emptySubtitle: { ...typo.body, fontSize: 14, color: palette.inkMuted, textAlign: 'center', lineHeight: 22 },
});

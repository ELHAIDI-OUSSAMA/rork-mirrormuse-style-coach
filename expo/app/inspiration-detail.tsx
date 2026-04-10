import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Shirt,
  Palette,
  User,
  Sparkles,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { InspirationItem } from '@/types';
import { space, radius, shadow, palette, type as typo } from '@/constants/theme';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function buildWhyReasons(
  item: InspirationItem,
  userVibes: string[],
  allSaved: Array<{ styleTags: string[] }>,
): string[] {
  const reasons: string[] = [];

  const matchedVibe = item.styleTags.find(tag =>
    userVibes.some(v => v.toLowerCase() === tag.toLowerCase())
  );
  if (matchedVibe) {
    reasons.push(`Matches your ${matchedVibe} style preference`);
  }

  const savedTags = allSaved.flatMap(s => s.styleTags);
  const tagCounts = new Map<string, number>();
  for (const t of savedTags) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  const topSavedTag = item.styleTags.find(tag => (tagCounts.get(tag) || 0) >= 2);
  if (topSavedTag && topSavedTag !== matchedVibe) {
    reasons.push(`Because you saved ${topSavedTag} looks`);
  }

  if (item.query) {
    const q = item.query.toLowerCase();
    if (q.includes('street style')) reasons.push('Street style inspiration');
    else if (q.includes('full body')) reasons.push('Full outfit visibility');
  }

  if (reasons.length === 0) {
    reasons.push('Trending outfit inspiration for you');
  }

  return reasons.slice(0, 3);
}

export default function InspirationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ itemData: string }>();
  const { isInspirationItemSaved, saveInspirationItem, removeInspirationItem, savedInspirationItems, preferences } = useApp();
  const [item, setItem] = useState<InspirationItem | null>(null);

  useEffect(() => {
    if (params.itemData) {
      try {
        setItem(JSON.parse(params.itemData));
      } catch (e) {
        console.log('Error parsing inspiration item:', e);
      }
    }
  }, [params.itemData]);

  if (!item) return null;

  const isSaved = isInspirationItemSaved(item.id);
  const imageRatio = item.height / item.width;
  const imageHeight = SCREEN_WIDTH * Math.min(imageRatio, 1.4);

  const displayPieces = item.aiDetectedPieces && item.aiDetectedPieces.length > 0
    ? item.aiDetectedPieces
    : item.keyPieces;

  const whyReasons = buildWhyReasons(item, preferences.vibes, savedInspirationItems);

  const handleSaveToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isSaved) {
      const savedItem = savedInspirationItems.find(s => s.inspirationId === item.id);
      if (savedItem) removeInspirationItem(savedItem.id);
    } else {
      saveInspirationItem(item);
    }
  };

  const handleOpenSource = () => {
    if (item.sourceUrl) Linking.openURL(item.sourceUrl);
  };

  const handleOpenAuthor = () => {
    if (item.authorUrl) Linking.openURL(item.authorUrl);
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.header}>
          <IconButton
            icon={<ArrowLeft size={20} color={palette.ink} />}
            onPress={() => router.back()}
          />
          <Text style={s.headerTitle}>Inspiration</Text>
          <IconButton
            icon={
              isSaved
                ? <BookmarkCheck size={20} color={palette.white} />
                : <Bookmark size={20} color={palette.ink} />
            }
            onPress={handleSaveToggle}
            variant={isSaved ? 'filled' : 'default'}
            fillColor={isSaved ? palette.accent : undefined}
          />
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero image */}
          <View style={[s.heroWrap, { height: imageHeight }]}>
            <Image
              source={{ uri: item.imageUrl }}
              style={s.heroImage}
              contentFit="cover"
              transition={300}
            />
          </View>

          {/* Tags */}
          <View style={s.tagsRow}>
            {item.styleTags.map(tag => (
              <View key={tag} style={s.styleTag}>
                <Text style={s.styleTagText}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* Key Pieces */}
          {displayPieces.length > 0 && (
            <Card style={s.sectionCard}>
              <View style={s.sectionHeader}>
                <View style={s.sectionIconWrap}>
                  <Shirt size={16} color={palette.accent} />
                </View>
                <Text style={s.sectionTitle}>Key pieces</Text>
              </View>
              <View style={s.piecesRow}>
                {displayPieces.map(piece => (
                  <View key={piece} style={s.piecePill}>
                    <Text style={s.piecePillText}>{piece}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Why this shows */}
          {whyReasons.length > 0 && (
            <Card style={s.sectionCard}>
              <View style={s.sectionHeader}>
                <View style={[s.sectionIconWrap, { backgroundColor: palette.pastelMint }]}>
                  <Sparkles size={16} color={palette.inkLight} />
                </View>
                <Text style={s.sectionTitle}>Why this shows</Text>
              </View>
              <View style={s.reasonsList}>
                {whyReasons.map((reason, i) => (
                  <Text key={i} style={s.reasonText}>{reason}</Text>
                ))}
              </View>
            </Card>
          )}

          {/* Color Palette */}
          {item.colorPalette.length > 0 && (
            <Card style={s.sectionCard}>
              <View style={s.sectionHeader}>
                <View style={[s.sectionIconWrap, { backgroundColor: palette.pastelLavender }]}>
                  <Palette size={16} color={palette.inkLight} />
                </View>
                <Text style={s.sectionTitle}>Color palette</Text>
              </View>
              <View style={s.colorsRow}>
                {item.colorPalette.map((color, i) => (
                  <View key={i} style={s.colorItem}>
                    <View style={[s.colorSwatch, { backgroundColor: color }]} />
                    <Text style={s.colorHex}>{color}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Credit / Attribution */}
          <Card style={s.creditCard} variant="flat">
            <TouchableOpacity style={s.creditRow} onPress={handleOpenAuthor} activeOpacity={0.7}>
              <View style={s.creditAvatar}>
                <User size={16} color={palette.inkMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.creditAuthor}>{item.author}</Text>
                <Text style={s.creditSource}>
                  via {item.source === 'pexels' ? 'Pexels' : 'Unsplash'}
                </Text>
              </View>
              <ExternalLink size={16} color={palette.inkMuted} />
            </TouchableOpacity>
          </Card>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.actionBtn, isSaved ? s.actionBtnSaved : s.actionBtnPrimary]}
              onPress={handleSaveToggle}
              activeOpacity={0.85}
            >
              {isSaved
                ? <BookmarkCheck size={18} color={palette.accent} />
                : <Bookmark size={18} color={palette.white} />
              }
              <Text style={[s.actionBtnText, isSaved && { color: palette.accent }]}>
                {isSaved ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, s.actionBtnOutline]}
              onPress={handleOpenSource}
              activeOpacity={0.85}
            >
              <ExternalLink size={18} color={palette.ink} />
              <Text style={[s.actionBtnText, { color: palette.ink }]}>View Source</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: space.xxl }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space.screen, paddingVertical: 10,
  },
  headerTitle: { ...typo.sectionHeader, color: palette.ink },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  /* Hero */
  heroWrap: {
    marginHorizontal: space.screen,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: space.lg,
    ...shadow.card,
  },
  heroImage: { width: '100%', height: '100%' },

  /* Tags */
  tagsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: space.screen, marginBottom: space.lg,
  },
  styleTag: {
    backgroundColor: palette.pastelLavender,
    borderRadius: radius.pill,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  styleTagText: { ...typo.small, fontWeight: '600', color: palette.inkLight },

  /* Section cards */
  sectionCard: { marginHorizontal: space.screen, marginBottom: space.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIconWrap: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: palette.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { ...typo.bodyMedium, fontWeight: '600', color: palette.ink },

  piecesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  piecePill: {
    backgroundColor: palette.warmWhiteDark,
    borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  piecePillText: { ...typo.caption, color: palette.inkLight },

  reasonsList: { gap: 6 },
  reasonText: { ...typo.body, fontSize: 13, color: palette.inkMuted },

  colorsRow: { flexDirection: 'row', gap: 16 },
  colorItem: { alignItems: 'center', gap: 6 },
  colorSwatch: {
    width: 44, height: 44, borderRadius: 14,
    borderWidth: 2, borderColor: palette.borderLight,
  },
  colorHex: { ...typo.small, color: palette.inkMuted },

  /* Credit */
  creditCard: {
    marginHorizontal: space.screen, marginBottom: space.lg,
    backgroundColor: palette.warmWhiteDark,
  },
  creditRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  creditAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: palette.white,
    alignItems: 'center', justifyContent: 'center',
  },
  creditAuthor: { ...typo.bodyMedium, color: palette.ink },
  creditSource: { ...typo.small, color: palette.inkMuted },

  /* Actions */
  actions: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: space.screen,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: radius.button, gap: 8, ...shadow.soft,
  },
  actionBtnPrimary: { backgroundColor: palette.accent },
  actionBtnSaved: { backgroundColor: palette.accentLight },
  actionBtnOutline: {
    backgroundColor: palette.white,
    borderWidth: 1.5, borderColor: palette.borderLight,
  },
  actionBtnText: { ...typo.button, color: palette.white },
});

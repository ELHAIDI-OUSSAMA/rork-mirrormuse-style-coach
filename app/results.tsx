import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Bookmark,
  Sparkles,
  Heart,
  Wand2,
  Share2,
  ArrowRight,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { LookAnalysis, ClosetItem } from '@/types';
import { enqueueProcessing } from '@/lib/processingQueue';
import { space, radius, shadow, palette, type as typo, motion } from '@/constants/theme';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ analysisId: string; analysisData: string }>();
  const { addLook, savedLooks, addClosetItem, themeColors, preferences } = useApp();
  const [analysis, setAnalysis] = useState<LookAnalysis | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [itemsAddedToCloset, setItemsAddedToCloset] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (params.analysisData) {
      try {
        const parsed = JSON.parse(params.analysisData);
        setAnalysis(parsed);
        const alreadySaved = savedLooks.some(l => l.id === parsed.id);
        setIsSaved(alreadySaved);

        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 6 }),
        ]).start();
      } catch (e) {
        console.log('Error parsing analysis data:', e);
      }
    }
  }, [params.analysisData, savedLooks]);

  const handleSave = () => {
    if (analysis && !isSaved) {
      addLook(analysis);
      setIsSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const CATEGORY_MAP: Record<string, string> = {
    'T-shirt': 'T-shirt', 'Shirt': 'Shirt', 'Hoodie': 'Hoodie', 'Sweater': 'Sweater',
    'Jacket': 'Jacket', 'Blazer': 'Blazer', 'Coat': 'Coat', 'Overshirt': 'Jacket',
    'Pants': 'Pants', 'Jeans': 'Jeans', 'Shorts': 'Shorts',
    'Sneakers': 'Sneakers', 'Loafers': 'Shoes', 'Boots': 'Boots', 'Shoes': 'Shoes',
    'Belt': 'Belt', 'Bag': 'Bag', 'Watch': 'Watch',
  };

  const handleAddToCloset = () => {
    if (!analysis || !analysis.results.detectedClothingItems || itemsAddedToCloset) return;

    const detectedItems = analysis.results.detectedClothingItems.filter(
      (item: any) => item.visibility === 'visible'
    );

    if (detectedItems.length === 0) {
      Alert.alert(
        'No items found',
        'Try a full-body photo with better lighting for best results.',
        [{ text: 'Got it' }]
      );
      return;
    }

    setItemsAddedToCloset(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const screenWidth = Dimensions.get('window').width;

    for (let i = 0; i < detectedItems.length; i++) {
      const detected = detectedItems[i];
      const id = `closet_outfit_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
      const category = CATEGORY_MAP[detected.subcategory] || 'T-shirt';

      const newItem: ClosetItem = {
        id,
        imageUri: analysis.imageUri,
        category: category as any,
        color: detected.color || 'Unknown',
        styleTags: [],
        createdAt: new Date().toISOString(),
        source: 'auto_extracted',
        position: {
          x: Math.random() * (screenWidth - 120) + 16,
          y: Math.random() * 300,
          rotation: (Math.random() - 0.5) * 16,
          scale: 0.85 + Math.random() * 0.25,
        },
        usageCount: 0,
        outlineEnabled: true,
        isProcessing: true,
        processingStatus: 'queued',
        processingStep: 'adding',
      };

      addClosetItem(newItem);
      enqueueProcessing(id, analysis.imageUri, {
        itemDescription: `${detected.color} ${detected.subcategory}`,
        region: detected.region,
        detectedCategory: category,
        detectedColor: detected.color,
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Added to closet',
      `${detectedItems.length} pieces added! They'll be processed in the background.`,
      [
        { text: 'OK' },
        { text: 'View Closet', onPress: () => router.replace('/(tabs)/closet' as any) },
      ]
    );
  };

  const handleShare = async () => {
    if (!analysis) return;
    try {
      await Share.share({
        message: `My fit check from MirrorMuse:\n\n${analysis.results.summary}\n\nScore: ${(analysis.results.fitScore * 2).toFixed(1)}/10\n\nVibes: ${analysis.results.vibeTags.join(', ')}`,
      });
    } catch (e) {
      console.log('Error sharing:', e);
    }
  };

  if (!analysis) {
    return (
      <View style={s.loadingScreen}>
        <ActivityIndicator size="large" color={palette.accent} />
        <Text style={s.loadingText}>Getting your results...</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const heroWidth = screenWidth - space.screen * 2;

  const getVerdict = (score: number): { text: string; tone: string } => {
    if (score >= 9) return { text: "This look is absolutely on point. You're ready to go.", tone: 'excellent' };
    if (score >= 8) return { text: "Strong foundation. One small tweak could elevate it further.", tone: 'good' };
    if (score >= 7) return { text: "You're on the right track. A few adjustments will level it up.", tone: 'okay' };
    if (score >= 6) return { text: "There's potential here. Let's polish a few pieces together.", tone: 'fair' };
    return { text: "Let's rethink this together. I have some ideas that will transform it.", tone: 'rebuild' };
  };

  const verdict = getVerdict(analysis.results.fitScore);

  const getScoreColor = (score: number) => {
    if (score >= 9) return palette.success;
    if (score >= 7) return palette.accent;
    if (score >= 5) return palette.warning;
    return palette.error;
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.header}>
          <IconButton
            icon={<ArrowLeft size={20} color={palette.ink} />}
            onPress={() => router.replace('/(tabs)/home' as any)}
          />
          <Text style={s.headerTitle}>Your results</Text>
          <IconButton
            icon={
              <Bookmark
                size={20}
                color={isSaved ? palette.white : palette.ink}
                fill={isSaved ? palette.white : 'transparent'}
              />
            }
            onPress={handleSave}
            variant={isSaved ? 'filled' : 'default'}
            fillColor={isSaved ? palette.accent : undefined}
          />
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Hero image */}
            <View style={s.heroSection}>
              <View style={[s.heroContainer, { width: heroWidth, height: heroWidth * 1.25 }]}>
                <Image
                  source={{ uri: analysis.imageUri }}
                  style={s.heroImage}
                  contentFit="cover"
                />
                {/* Score badge */}
                <View style={s.scoreBadge}>
                  <Text style={[s.scoreNumber, { color: getScoreColor(analysis.results.fitScore * 2) }]}>
                    {(analysis.results.fitScore * 2).toFixed(1)}
                  </Text>
                  <Text style={s.scoreOf}>/ 10</Text>
                </View>
                {/* Vibe tag */}
                {analysis.results.vibeTags[0] && (
                  <View style={s.vibeTag}>
                    <Sparkles size={12} color={palette.white} />
                    <Text style={s.vibeTagText}>{analysis.results.vibeTags[0]}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Verdict card */}
            <Card style={s.verdictCard}>
              <View style={s.verdictRow}>
                <View style={s.verdictIcon}>
                  <Sparkles size={18} color={palette.accent} />
                </View>
                <Text style={s.verdictLabel}>Your vibe today</Text>
              </View>
              <Text style={s.verdictText}>{verdict.text}</Text>
              {analysis.results.vibeTags.length > 1 && (
                <View style={s.vibePills}>
                  {analysis.results.vibeTags.map((tag: string) => (
                    <View key={tag} style={s.vibePill}>
                      <Text style={s.vibePillText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            {/* Improvement suggestions */}
            {analysis.results.quickFixes && analysis.results.quickFixes.length > 0 && (
              <Card style={s.improveCard}>
                <Text style={s.sectionHeader}>Let's polish it a bit</Text>
                {analysis.results.quickFixes.slice(0, 3).map((fix: string, i: number) => (
                  <View key={i} style={s.tryThisCard}>
                    <View style={s.tryThisNumber}>
                      <Text style={s.tryThisNumberText}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.tryThisText}>{fix}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {/* Detected items */}
            {analysis.results.detectedClothingItems && analysis.results.detectedClothingItems.length > 0 && (
              <Card style={s.breakdownCard}>
                <Text style={s.sectionHeader}>Pieces in this look</Text>
                {analysis.results.detectedClothingItems
                  .filter((item: any) => item.visibility === 'visible')
                  .map((item: any, i: number) => {
                    const regionEmoji: Record<string, string> = {
                      upper_outer: '🧥', upper_inner: '👕', lower: '👖',
                      feet: '👟', accessory: '👜',
                    };
                    return (
                      <View key={i} style={s.itemRow}>
                        <View style={s.itemDot}>
                          <View style={[s.itemDotInner, { backgroundColor: getColorHex(item.color) }]} />
                        </View>
                        <Text style={s.itemEmoji}>{regionEmoji[item.region] || '👗'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={s.itemName}>{item.subcategory}</Text>
                          <Text style={s.itemColor}>{item.color}</Text>
                        </View>
                      </View>
                    );
                  })}
                {analysis.results.detectedClothingItems.some((item: any) => item.visibility !== 'visible') && (
                  <View style={s.notVisibleCard}>
                    <Text style={s.notVisibleText}>
                      Some pieces weren't visible in the photo
                    </Text>
                  </View>
                )}
              </Card>
            )}

            {/* Generate alternatives */}
            <Card style={s.alternativeCard} variant="flat">
              <View style={s.alternativeContent}>
                <View style={s.alternativeIcon}>
                  <Wand2 size={22} color={palette.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.alternativeTitle}>Try better versions</Text>
                  <Text style={s.alternativeDesc}>Generate improved outfits from your closet</Text>
                </View>
                <ArrowRight size={18} color={palette.inkMuted} />
              </View>
            </Card>

            <View style={{ height: space.xxl }} />
          </Animated.View>
        </ScrollView>

        {/* Bottom actions */}
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={[s.bottomBtn, s.bottomBtnOutline]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Text style={s.bottomBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.bottomBtn, s.bottomBtnFill]}
            onPress={handleAddToCloset}
            disabled={itemsAddedToCloset}
            activeOpacity={0.85}
          >
            <Text style={[s.bottomBtnText, { color: palette.white }]}>
              {itemsAddedToCloset ? 'Added' : 'Add items to closet'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

function getColorHex(colorName: string): string {
  const map: Record<string, string> = {
    White: '#F5F5F5', Black: '#1A1A1A', Navy: '#1E3A5F', Blue: '#4A90D9',
    'Light Blue': '#87CEEB', Gray: '#6B7280', Brown: '#8B4513', Tan: '#D2B48C',
    Khaki: '#C3B091', Cream: '#FFFDD0', Beige: '#F5F5DC', Charcoal: '#36454F',
    Olive: '#708238', Silver: '#C0C0C0',
  };
  return map[colorName] || '#9CA3AF';
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safe: { flex: 1 },

  /* Loading */
  loadingScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.warmWhite, gap: 14,
  },
  loadingText: { ...typo.bodyMedium, color: palette.inkMuted },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space.screen, paddingVertical: 10,
  },
  headerTitle: { ...typo.sectionHeader, color: palette.ink },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  /* Hero */
  heroSection: {
    alignItems: 'center', paddingHorizontal: space.screen, marginBottom: space.xl,
  },
  heroContainer: {
    borderRadius: radius.xl, overflow: 'hidden', ...shadow.card,
  },
  heroImage: { width: '100%', height: '100%' },
  scoreBadge: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'baseline',
    backgroundColor: palette.white, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 8, ...shadow.soft,
  },
  scoreNumber: { fontSize: 26, fontWeight: '700' },
  scoreOf: { ...typo.caption, color: palette.inkMuted, marginLeft: 3 },
  vibeTag: {
    position: 'absolute', bottom: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(44,40,37,0.6)', borderRadius: radius.pill,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  vibeTagText: { ...typo.small, fontWeight: '600', color: palette.white },

  /* Verdict */
  verdictCard: { marginHorizontal: space.screen, marginBottom: space.lg },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  verdictIcon: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: palette.accentLight, alignItems: 'center', justifyContent: 'center',
  },
  verdictLabel: { ...typo.caption, color: palette.inkMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  verdictText: { ...typo.body, color: palette.ink, lineHeight: 26 },
  vibePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  vibePill: {
    backgroundColor: palette.pastelLavender, borderRadius: radius.pill,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  vibePillText: { ...typo.small, fontWeight: '600', color: palette.inkLight },

  /* Improvements */
  improveCard: { marginHorizontal: space.screen, marginBottom: space.lg },
  sectionHeader: { ...typo.sectionHeader, color: palette.ink, marginBottom: space.md },
  tryThisCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: palette.warmWhiteDark, borderRadius: radius.md,
    padding: 14, marginBottom: 10,
  },
  tryThisNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center',
  },
  tryThisNumberText: { ...typo.small, fontWeight: '700', color: palette.white },
  tryThisText: { ...typo.body, fontSize: 15, color: palette.inkLight, lineHeight: 22 },

  /* Breakdown */
  breakdownCard: { marginHorizontal: space.screen, marginBottom: space.lg },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.borderLight,
  },
  itemDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: palette.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  itemDotInner: { width: 14, height: 14, borderRadius: 7 },
  itemEmoji: { fontSize: 20 },
  itemName: { ...typo.bodyMedium, color: palette.ink },
  itemColor: { ...typo.small, color: palette.inkMuted, marginTop: 1 },
  notVisibleCard: {
    marginTop: 10, backgroundColor: palette.warmWhiteDark,
    borderRadius: radius.sm, padding: 12,
  },
  notVisibleText: { ...typo.caption, color: palette.inkMuted, textAlign: 'center' },

  /* Alternatives */
  alternativeCard: {
    marginHorizontal: space.screen, marginBottom: space.md,
    backgroundColor: palette.secondaryLight,
  },
  alternativeContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  alternativeIcon: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: palette.pastelPeach, alignItems: 'center', justifyContent: 'center',
  },
  alternativeTitle: { ...typo.bodyMedium, fontWeight: '600', color: palette.ink },
  alternativeDesc: { ...typo.small, color: palette.inkMuted, marginTop: 2 },

  /* Bottom */
  bottomBar: {
    flexDirection: 'row', paddingHorizontal: space.screen,
    paddingTop: 12, paddingBottom: 12, gap: 12,
    backgroundColor: palette.warmWhite,
  },
  bottomBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: radius.button, gap: 8, ...shadow.soft,
  },
  bottomBtnOutline: { backgroundColor: palette.white, borderWidth: 1.5, borderColor: palette.borderLight },
  bottomBtnFill: { backgroundColor: palette.accent },
  bottomBtnText: { ...typo.button, color: palette.ink },
});

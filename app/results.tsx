import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
  Wand2,
  ArrowRight,
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useApp } from '@/contexts/AppContext';
import { LookAnalysis, DetectedClothingItem } from '@/types';
import { addImageToClosetPipeline } from '@/lib/closetPipeline';
import { space, radius, shadow, palette, type as typo } from '@/constants/theme';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { Toast } from '@/components/Toast';
import { PressableScale } from '@/components/PressableScale';
import { durations, easings, stagger, useReduceMotion } from '@/lib/motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle as any);

function ScoreRing({ score10, color }: { score10: number; color: string }) {
  const reduceMotion = useReduceMotion();
  const size = 86;
  const stroke = 6;
  const radiusSize = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radiusSize;
  const progress = Math.max(0, Math.min(score10 / 10, 1));
  const progressValue = useRef(new Animated.Value(reduceMotion ? progress : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progressValue.setValue(progress);
      return;
    }
    Animated.timing(progressValue, {
      toValue: progress,
      duration: 800,
      easing: easings.outExpo,
      useNativeDriver: false,
    }).start();
  }, [progress, progressValue, reduceMotion]);

  const strokeDashoffset = progressValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={s.ringWrap}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusSize}
          stroke={palette.borderLight}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radiusSize}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset as any}
        />
      </Svg>
      <View style={s.ringCenter}>
        <Text style={[s.scoreNumber, { color }]}>{score10.toFixed(1)}</Text>
        <Text style={s.scoreOf}>/10</Text>
      </View>
    </View>
  );
}

function VibePill({ tag, index, reduceMotion }: { tag: string; index: number; reduceMotion: boolean }) {
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateX = useRef(new Animated.Value(reduceMotion ? 0 : -8)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        delay: stagger(index),
        duration: durations.normal,
        easing: easings.outCubic,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        delay: stagger(index),
        duration: durations.normal,
        easing: easings.outCubic,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, reduceMotion, translateX]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      <View style={s.vibePill}>
        <Text style={s.vibePillText}>{tag}</Text>
      </View>
    </Animated.View>
  );
}

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ analysisId: string; analysisData: string }>();
  const {
    addLook,
    savedLooks,
    addClosetItem,
    onOutfitCheckCompleted,
    avatarProfile,
    renderDigitalTryOn,
  } = useApp();
  const [analysis, setAnalysis] = useState<LookAnalysis | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [itemsAddedToCloset, setItemsAddedToCloset] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastTone, setToastTone] = useState<'info' | 'success' | 'warning'>('info');
  const [toastVisible, setToastVisible] = useState(false);
  const awardedAnalysisRef = useRef<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReduceMotion();
  const heroOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const heroTranslateY = useRef(new Animated.Value(reduceMotion ? 0 : 18)).current;
  const scoreOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const scoreScale = useRef(new Animated.Value(reduceMotion ? 1 : 0.92)).current;
  const verdictOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const verdictTranslateY = useRef(new Animated.Value(reduceMotion ? 0 : 14)).current;

  useEffect(() => {
    if (params.analysisData) {
      try {
        const parsed = JSON.parse(params.analysisData);
        setAnalysis(parsed);
        setItemsAddedToCloset(false);
        const alreadySaved = savedLooks.some(l => l.id === parsed.id);
        setIsSaved(alreadySaved);

      } catch (e) {
        console.log('Error parsing analysis data:', e);
      }
    }
  }, [params.analysisData, savedLooks]);

  useEffect(() => {
    if (!analysis) return;
    if (reduceMotion) {
      heroOpacity.setValue(1);
      heroTranslateY.setValue(0);
      scoreOpacity.setValue(1);
      scoreScale.setValue(1);
      verdictOpacity.setValue(1);
      verdictTranslateY.setValue(0);
      return;
    }
    Animated.timing(heroOpacity, { toValue: 1, duration: durations.slow, easing: easings.outCubic, useNativeDriver: true }).start();
    Animated.timing(heroTranslateY, { toValue: 0, duration: durations.slow, easing: easings.outCubic, useNativeDriver: true }).start();
    Animated.timing(scoreOpacity, { toValue: 1, delay: 120, duration: durations.normal, easing: easings.outCubic, useNativeDriver: true }).start();
    Animated.spring(scoreScale, { toValue: 1, delay: 120, tension: 180, friction: 16, useNativeDriver: true }).start();
    Animated.timing(verdictOpacity, { toValue: 1, delay: 180, duration: durations.normal, easing: easings.outCubic, useNativeDriver: true }).start();
    Animated.timing(verdictTranslateY, { toValue: 0, delay: 180, duration: durations.normal, easing: easings.outCubic, useNativeDriver: true }).start();
  }, [
    analysis,
    heroOpacity,
    heroTranslateY,
    reduceMotion,
    scoreOpacity,
    scoreScale,
    verdictOpacity,
    verdictTranslateY,
  ]);

  useEffect(() => {
    if (!analysis?.id) return;
    if (awardedAnalysisRef.current === analysis.id) return;
    awardedAnalysisRef.current = analysis.id;
    const score10 = Number((analysis.results.fitScore * 2).toFixed(1));
    onOutfitCheckCompleted(score10, analysis.id);
  }, [analysis, onOutfitCheckCompleted]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (message: string, tone: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastTone(tone);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2200);
  };

  const handleSave = () => {
    if (analysis && !isSaved) {
      addLook(analysis);
      setIsSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleTryOnTwin = async () => {
    if (!analysis) return;
    if (!avatarProfile || avatarProfile.status !== 'ready') {
      router.push('/ai-twin/setup' as any);
      return;
    }
    try {
      await renderDigitalTryOn({
        source: 'fit_check',
        outfitId: analysis.id,
      });
      router.push('/ai-twin/status' as any);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not start try-on', 'warning');
    }
  };

  const heroAnimatedStyle = {
    opacity: heroOpacity,
    transform: [{ translateY: heroTranslateY }],
  };

  const scoreAnimatedStyle = {
    opacity: scoreOpacity,
    transform: [{ scale: scoreScale }],
  };

  const verdictAnimatedStyle = {
    opacity: verdictOpacity,
    transform: [{ translateY: verdictTranslateY }],
  };

  const handleAddToCloset = async () => {
    if (!analysis || !analysis.results.detectedClothingItems) return;
    if (itemsAddedToCloset) {
      showToast('This outfit is already in your closet.', 'warning');
      return;
    }

    setItemsAddedToCloset(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Reuse already-detected pieces from Outfit Check so add-to-closet follows
      // the same decomposition profile the user just reviewed on this screen.
      const preDetectedItems: DetectedClothingItem[] = Array.isArray(analysis.results.detectedClothingItems)
        ? analysis.results.detectedClothingItems
        : [];
      const result = await addImageToClosetPipeline({
        source: 'outfit_check',
        imageUri: analysis.imageUri,
        addClosetItem,
        preDetectedItems,
        onProgress: ({ stage, message }) => {
          if (stage === 'detecting') {
            showToast('Detected outfit photo → extracting jacket, jeans, sneakers…', 'info');
          } else if (stage === 'creating_placeholders' || stage === 'saving') {
            showToast(message, 'info');
          }
        },
      });

      if (result.addedCount === 0) {
        setItemsAddedToCloset(false);
        if ((result.detectedItems?.length || 0) < 2) {
          Alert.alert(
            'No items found',
            'We could not confidently identify at least 2 separate pieces in this image.',
            [{ text: 'Got it' }]
          );
        } else {
          showToast('Already added: all detected items are in your closet.', 'warning');
        }
        return;
      }

      if (result.hasFootwear === false) {
        showToast('Footwear not visible — skipping shoes.', 'info');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.failedCount > 0) {
        showToast(`Added ${result.addedCount} items. ${result.failedCount} piece(s) couldn’t be extracted.`, 'warning');
      } else if (result.duplicateCount > 0) {
        showToast(`Added ${result.addedCount} item(s). Skipped ${result.duplicateCount} duplicate(s).`, 'info');
      } else {
        showToast(`Added ${result.addedCount} item(s) to your closet.`, 'success');
      }
    } catch (error) {
      setItemsAddedToCloset(false);
      console.log('[Results] closet pipeline failed:', error);
      Alert.alert('Could not add to closet', 'Please try again.');
    }
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
          <Animated.View style={heroAnimatedStyle}>
            {/* Hero image */}
            <View style={s.heroSection}>
              <View style={[s.heroContainer, { width: heroWidth, height: heroWidth * 1.25 }]}>
                <Image
                  source={{ uri: analysis.imageUri }}
                  style={s.heroImage}
                  contentFit="cover"
                />
                {/* Score badge */}
                <Animated.View style={[s.scoreBadge, scoreAnimatedStyle]}>
                  <ScoreRing score10={analysis.results.fitScore * 2} color={getScoreColor(analysis.results.fitScore * 2)} />
                </Animated.View>
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
            <Animated.View style={verdictAnimatedStyle}>
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
                  {analysis.results.vibeTags.map((tag: string, i: number) => (
                    <VibePill key={tag} tag={tag} index={i} reduceMotion={reduceMotion} />
                  ))}
                </View>
              )}
            </Card>
            </Animated.View>

            {/* Improvement suggestions */}
            {analysis.results.quickFixes && analysis.results.quickFixes.length > 0 && (
              <Card style={s.improveCard}>
                <Text style={s.sectionHeader}>Let&apos;s polish it a bit</Text>
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
                      Some pieces weren&apos;t visible in the photo
                    </Text>
                  </View>
                )}
              </Card>
            )}

            {/* Generate alternatives */}
            <PressableScale haptic activeScale={0.98}>
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
            </PressableScale>

            <View style={{ height: space.xxl }} />
          </Animated.View>
        </ScrollView>

        {/* Bottom actions */}
        <View style={s.bottomBar}>
          <PressableScale haptic onPress={handleShare} style={{ flex: 1 }}>
          <View style={[s.bottomBtn, s.bottomBtnOutline]}>
            <Text style={s.bottomBtnText}>Share</Text>
          </View>
          </PressableScale>
          <PressableScale haptic onPress={handleAddToCloset} disabled={itemsAddedToCloset} style={{ flex: 1 }}>
          <View style={[s.bottomBtn, s.bottomBtnFill, itemsAddedToCloset && s.bottomBtnDisabled]}>
            <Text style={[s.bottomBtnText, { color: palette.white }]}>
              {itemsAddedToCloset ? 'Added' : 'Add items to closet'}
            </Text>
          </View>
          </PressableScale>
        </View>
        <View style={s.twinRow}>
          <PressableScale
            haptic
            onPress={handleTryOnTwin}
            style={{ flex: 1 }}
          >
            <View style={[s.bottomBtn, s.bottomBtnOutline]}>
              <Text style={s.bottomBtnText}>Try on with my Twin</Text>
            </View>
          </PressableScale>
        </View>
        <Toast visible={toastVisible} message={toastMessage} tone={toastTone} />
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
    ...shadow.soft,
  },
  ringWrap: { width: 86, height: 86, alignItems: 'center', justifyContent: 'center' },
  ringCenter: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  scoreNumber: { fontSize: 26, fontWeight: '700' },
  scoreOf: { ...typo.caption, color: palette.inkMuted, marginLeft: 0 },
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
  twinRow: {
    paddingHorizontal: space.screen,
    paddingBottom: 8,
  },
  bottomBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: radius.button, gap: 8, ...shadow.soft,
  },
  bottomBtnOutline: { backgroundColor: palette.white, borderWidth: 1.5, borderColor: palette.borderLight },
  bottomBtnFill: { backgroundColor: palette.accent },
  bottomBtnDisabled: { opacity: 0.5 },
  bottomBtnText: { ...typo.button, color: palette.ink },
});
